import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Video } from "./Video";
import { Device } from "mediasoup-client";
import {
  DtlsParameters,
  IceCandidate,
  IceParameters,
  RtpCapabilities,
  Transport,
} from "mediasoup-client/types";
function Meeting() {
  const [socketDetail, setSocketDetails] = useState<any>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null); // do it MediaStream
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [producerTransport, setProducerTransport] = useState<Transport | null>(
    null
  );
  const [consumerTransport, setConsumerTransport] = useState<any>(null);
  const [rtpCapabilities, setRtpCapabilities] =
    useState<RtpCapabilities | null>(null);
  const [option, setOption] = useState({
    joined: false,
    isRecording: false,
    isFileReady: false,
    isScreenSharing: false,
    mutedValue: true,
    disabled: true,
  });
  /**
   * State to hold encoding parameters for the media stream.
   * Encoding parameters control the quality and bandwidth usage of the transmitted video.
   * Each object in the encoding array represents a different layer of encoding,
   * allowing for scalable video coding (SVC). The parameters defined here are:
   * - rid: The encoding layer identifier.
   * - maxBitrate: The maximum bitrate for this layer.
   * - scalabilityMode: The scalability mode which specifies the temporal and spatial scalability.
   *
   * Additionally, codecOptions are provided to control the initial bitrate.
   */
  const [params, setParams] = useState({
    encoding: [
      { rid: "r0", maxBitrate: 100000, scalabilityMode: "S1T3" }, // Lowest quality layer
      { rid: "r1", maxBitrate: 300000, scalabilityMode: "S1T3" }, // Middle quality layer
      { rid: "r2", maxBitrate: 900000, scalabilityMode: "S1T3" }, // Highest quality layer
    ],
    codecOptions: { videoGoogleStartBitrate: 1000 }, // Initial bitrate
  });

  useEffect(() => {
    const URL = "http://localhost:6066/mediasoup";
    const socketIo = io(URL, {
      transports: ["websocket", "polling", "flashsocket"],
    });
    socketIo.on("connection-success", async () => {
      setSocketDetails(socketIo);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        const track = stream.getVideoTracks()[0];
        console.log(track);
        setLocalStream(stream);
        setParams((current) => ({ ...current, track }));
      } catch (err: unknown) {
        console.log("Error ::: No access of camera");
        console.log(err);
      }
    });
    return () => {
      socketIo.disconnect();
    };
  }, []);

  const getRouterRtpCapabilities = async () => {
    socketDetail.emit("getRouterRtpCapabilities", (data: any) => {
      setRtpCapabilities(data.routerRtpCapabilities);
      console.log(`getRouterRtpCapabilities: ${data.routerRtpCapabilities}`);
      console.log({
        "getRouterRtpCapabilities": data.routerRtpCapabilities
      });
    });
  };

  const createDevice = async () => {
    try {
      const newDevice = new Device();
      console.log({newDevice})
      if (rtpCapabilities != null) {
        console.log({rtpCapabilities})
        await newDevice.load({ routerRtpCapabilities: rtpCapabilities });
        setDevice(newDevice);
      }
    } catch (err: unknown) {
      console.log(err);
    }
  };

  const createSendTransport = async () => {
    socketDetail.emit(
      "createTransport",
      {
        sender: true,
      },
      ({
        params,
      }: {
        params: {
          id: string;
          iceParameters: IceParameters;
          iceCandidates: IceCandidate[];
          dtlsParameters: DtlsParameters;
          error?: unknown;
        };
      }) => {
        if (params.error) {
          console.log(params.error);
          return;
        }

        const transport = device?.createSendTransport(params);
        setProducerTransport(transport || null);
        console.log({transport})
        transport?.on(
          "connect",
          async ({ dtlsParameters }: any, callback: any, errback: any) => {
            try {
              console.log("----------> producer transport has connected");
              console.log({dtlsParameters});
              // Notify the server that the transport is ready to connect with the provided DTLS parameters
              socketDetail.emit("connectProducerTransport", { dtlsParameters });
              // Callback to indicate success
              callback();
            } catch (error) {
              // Errback to indicate failure
              errback(error);
            }
          }
        );

        transport?.on(
          "produce",
          async (parameters: any, callback: any, errback: any) => {
            const { kind, rtpParameters } = parameters;
            try {
              socketDetail.emit(
                "transport-produce",
                {
                  kind,
                  rtpParameters,
                },
                ({ id }: any) => {
                  // Callback to provide the server-generated producer ID back to the transport
                  callback({ id });
                }
              );
            } catch (err: unknown) {
              console.log(err);
              errback(err);
            }
          }
        );
      }
    );
  };

  const connectSendTransport = async () => {
    const localProducer = await producerTransport?.produce(params);
    localProducer?.on("trackended", () => {
      console.log("trackended");
    });
    localProducer?.on("transportclose", () => {
      console.log("transportclose");
    });
  };

  const createRecvTransport = async () => {
    socketDetail.emit(
      "createTransport",
      {
        sender: false,
      },
      ({ params }: { params: any }) => {
        if (params.error) {
          console.log(params.error);
          return;
        }

        const transport = device?.createRecvTransport(params);
        setConsumerTransport(transport);

        transport?.on(
          "connect",
          async ({ dtlsParameters }: any, callback: any, errback: any) => {
            try {
              // Notifying the server to connect the receive transport with the provided DTLS parameters
              await socketDetail.emit("connectConsumerTransport", {
                dtlsParameters,
              });
              console.log("----------> consumer transport has connected");
              callback();
            } catch (error) {
              errback(error);
            }
          }
        );
      }
    );
  };

  const connectRecvTransport = async () => {
    await socketDetail.emit(
      "consumeMedia",
      { rtpCapabilities: device?.rtpCapabilities },
      async ({ params }: any) => {
        if (params.error) {
          console.log(params.error);
          return;
        }
        const consumer = await consumerTransport.consume({
          id: params.id,
          producerId: params.producerId,
          kind: params.kind,
          rtpParameters: params.rtpParameters,
        });

        const { track } = consumer;
        console.log("************** track", track);
        const stream = new MediaStream([track]);
        setRemoteStream(stream);
        socketDetail.emit("resumePausedConsumer", () => {});
      }
    );
  };

  return (
    <>
      <p>P2P Real time communication</p>
      <div>
        <div
          style={{
            display: "flex",
          }}
        >
          <Video
            stream={localStream}
            muted={option.mutedValue}
            controls={false}
          />
          <Video stream={remoteStream} muted={false} controls={false} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <button onClick={getRouterRtpCapabilities}>
            Get Router RTP Capabilities
          </button>
          <button onClick={createDevice}>Create Device</button>
          <button onClick={createSendTransport}>Create send transport</button>
          <button onClick={connectSendTransport}>
            Connect send transport and produce
          </button>
          <button onClick={createRecvTransport}>Create recv transport</button>
          <button onClick={connectRecvTransport}>
            Connect recv transport and consume
          </button>
        </div>
        <div>
          {/* <button onClick={() => setOption((s) => ({ ...s, mutedValue: !option.mutedValue }))}>
                               {option.mutedValue ? 'Unmute' : 'Mute'}
                           </button> */}
        </div>
      </div>
    </>
  );
}

export default Meeting;
