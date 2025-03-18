import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";
import { Video } from "./Video";
import { useNavigate, useParams } from "react-router";
// creating our peer connection using RTCPeerConnection
const peerConnection = new RTCPeerConnection({
  /**
   * iceServers is type of RTCIceServer[]
   * interface RTCIceServer {
    credential?: string;
    urls: string | string[];
    username?: string;
  }
   */
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
});

console.log({ peerConnection });

function Meeting() {
  // all states
  const {meetingId} = useParams();
  const navigate = useNavigate()
  const [roomId, setRoomId] = useState("");
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [socketDetail, setSocketDetails] = useState(null);
  const [option, setOption] = useState({
    joined: false,
    isRecording: false,
    isFileReady: false,
    isScreenSharing: false,
    mutedValue: true,
    disabled: true,
  });

  useEffect(() => {
    // giving user media access we call it "GUM"
    window.navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then((stream) => {
        setLocalStream(stream);
        console.log(stream);
      });

    // establishing the socket connection
    const URL = "http://localhost:5006";
    const socketIo = io(URL, {
      transports: ["websocket", "polling", "flashsocket"],
    });
    socketIo.on("connect", () => {
      setSocketDetails(socketIo);
      socketIo.on("hello", (data) => {
        console.log(data);
      });
      // join the meeting
      socketIo.emit("join", {
        meetingId,
      });
    });

    socketIo.on("localDescription", async ({ description }) => {
      console.log({ description });
      peerConnection.setRemoteDescription(description);

      // setting up the stream track for the remote user
      peerConnection.ontrack = (e) => {
        console.log({ ontrackEvent: e.track });
        const stream = new MediaStream([e.track]);
        setRemoteStream(stream);
      };

      socketIo.on("iceCandidate", ({ candidate }) => {
        console.log({ candidate });
        peerConnection.addIceCandidate(candidate);
      });

      peerConnection.onicecandidate = ({ candidate }) => {
        socketIo.emit("iceCandidateReply", {
          candidate,
        });
      };

      const answer = await peerConnection.createAnswer();
      console.log({ answer });
      await peerConnection.setLocalDescription(answer);

      socketIo.emit("remoteDescription", {
        description: peerConnection.localDescription,
      });
    });

    socketIo.on("remoteDescription", async ({ description }) => {
      console.log({ description });
      peerConnection.setRemoteDescription(description);

      peerConnection.ontrack = (e) => {
        const stream = new MediaStream([e.track]);
        setRemoteStream(stream);
      };

      socketIo.on("iceCandidate", ({ candidate }) => {
        console.log({ candidate });
        peerConnection.addIceCandidate(candidate);
      });

      peerConnection.onicecandidate = ({ candidate }) => {
        socketIo.emit("iceCandidateReply", {
          candidate,
        });
      };
    });
  }, []);

  const handleJoinMeeting = async () => {
    if (roomId.length < 1) {
      return;
    }
    // sending ice candidate
    peerConnection.onicecandidate = ({ candidate }) => {
      socketDetail.emit("iceCandidate", {
        candidate,
      });
    };

    peerConnection.addTrack(localStream.getVideoTracks()[0]);

    try {
      const offer = peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      console.log({
        localDescription: peerConnection.localDescription,
      });

      socketDetail.emit("localDescription", {
        description: peerConnection.localDescription,
      });
    } catch (err) {
      console.log({ msg: err?.message });
      console.error(err);
    }
    setOption((s) => ({ ...s, joined: true }));
    navigate(`/meeting/${roomId}`);
  };

  if (!option.joined) {
    return (
      <div>
        <img
          src="https://webrtcclient.com/wp-content/uploads/2021/09/WebRTC-740-fi.png"
          alt="webrtc"
          loading="lazy"
          style={{
            width:"720px",
            height:"360px"
          }}
        />
        <h1>Join Our Meeting</h1>
        <input
          placeholder="Enter Room Id"
          value={roomId}
          style={{
            padding:"5px 2px",
          }}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <button
          onClick={handleJoinMeeting}
        >
          Join Now!
        </button>
      </div>
    );
  }

  return (
    <>
      <p>P2P Real time communication</p>

      <div>
        <div style={{
          display:"flex"
        }}>
          <Video stream={localStream} muted={option.mutedValue} />
          <Video stream={remoteStream} />
        </div>
        <div>
        <button onClick={() => setOption((s) => ({ ...s, mutedValue: !option.mutedValue }))}>
                            {option.mutedValue ? 'Unmute' : 'Mute'}
                        </button>
        </div>
       
      </div>
    </>
  );
}

export default Meeting;
