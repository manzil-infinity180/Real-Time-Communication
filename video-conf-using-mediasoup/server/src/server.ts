import express, { Request, Response } from "express";
import {
  AppData,
  Consumer,
  Producer,
  Router,
  WebRtcTransport,
  Worker,
} from "mediasoup/types";
import mediasoup from "mediasoup";
const app = express();
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { routerOptions } from "./utils.js";
import { createWebRtcTransport } from "./transport.js";
import { error } from "console";
const server = createServer(app);

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true,
  },
});

// we will take care of this things
const peers = io.of("/mediasoup");

app.get("/health", (req: Request, res: Response) => {
  res.send("yepp i am running !!!!");
});

/**
 * Worker : mediasoup.types.Worker
 * AppData : mediasoup.types.AppData
 */
let worker: Worker<AppData>;
export let router: Router<AppData>;
let producerTransport: WebRtcTransport<AppData> | undefined;
let consumerTransport: WebRtcTransport<AppData> | undefined;
let producer: Producer<AppData> | undefined;
let consumer: Consumer<AppData> | undefined;

/**
 *
 * @returns  Promise<Worker<AppData>>
 */
const createWorker = async () => {
  const newWorker = await mediasoup.createWorker({
    logLevel: "warn",
    rtcMinPort: 10000, // Minimun RTC port for ICE, DTLS, RTP, etc.
    rtcMaxPort: 10100, // Maximum RTC port for ICE, DTLS, RTP, etc.
  });

  console.log(`Worker process ID ${newWorker.pid}`);

  newWorker.on("died", () => {
    console.error("mediasoup worker has died");
    // Gracefully shut down the process to allow for recovery or troubleshooting.
    setTimeout(() => {
      process.exit();
    }, 2000);
  });

  return newWorker;
};

// Create and initialize the mediasoup Worker.
worker = await createWorker();

peers.on("connection", async (socket) => {
  console.log("CONNECTED::: SOCKET ID ", socket.id);

  socket.emit("connection-success", {
    socketId: socket.id,
  });

  socket.on("disconnect", () => {
    console.log("DISCONNECTD !!!");
  });

  /**
   * Create a router for the peer.
   * A router is required to route media to/from this peer.
   */
  router?.createWebRtcTransport;
  router = await worker.createRouter({
    mediaCodecs: routerOptions,
  });

  /**
   * Event handler for fetching router RTP capabilities.
   * RTP capabilities are required for configuring transports and producers/consumers.
   * This function is called when a peer requests the router RTP capabilities.
   * @param {function} callback - A callback function to handle the result of the router RTP capabilities request.
   *
   * An Object with the RTP capabilities of the router.
   * These capabilities are typically needed by mediasoup clients to compute their sending RTP parameters.
   * @docs https://mediasoup.org/documentation/v3/mediasoup/api/#router-rtpCapabilities
   */
  socket.on("getRouterRtpCapabilities", (callback) => {
    const routerRtpCapabilities = router.rtpCapabilities;
    callback({ routerRtpCapabilities });
  });

  /**
   * Event handler for creating a transport.
   * A transport is required for sending or producing media.
   * This function is called when a peer requests to create a transport.
   * The callback function is used to send the transport parameters to the peer.
   * @param {boolean} data.sender - Indicates whether the transport is for sending or receiving media.
   * @param {function} callback - A callback function to handle the result of the transport creation.
   */
  socket.on("createTransport", async ({ sender }, callback) => {
    if (sender) {
      producerTransport = await createWebRtcTransport(callback);
    } else {
      consumerTransport = await createWebRtcTransport(callback);
    }
  });

  socket.on("connectProducerTransport", async ({ dtlsParameters }) => {
    await producerTransport?.connect({ dtlsParameters });
  });

  socket.on("transport-produce", async ({ kind, rtpParameters }, callback) => {
    producer = await producerTransport?.produce({
      kind,
      rtpParameters,
    });

    producer?.on("transportclose", () => {
      console.log("TRANSPORT CLOSE ::: Producer transport closed");
      producer?.close();
    });
    callback({ id: producer?.id });
  });

  socket.on("connectConsumerTransport", async ({ dtlsParameters }) => {
    await consumerTransport?.connect({ dtlsParameters });
  });

  socket.on("consumeMedia", async ({ rtpCapabilities }, callback) => {
    try {
      if (producer) {
        if (!router.canConsume({ producerId: producer?.id, rtpCapabilities })) {
          console.error(
            "NO RTC-CAPABILITIES ::: do not have rtc capabilities to consume this !!!!"
          );
          return;
        }
        console.log("CONSUMING :::");

        const consumer = await consumerTransport?.consume({
          producerId: producer.id,
          rtpCapabilities,
          // Pause the consumer initially if it's a video consumer
          // This can help save bandwidth until the video is actually needed
          paused: producer?.kind === "video",
        });

        consumer?.on("transportclose", () => {
          console.log("CONSUMER TRANSPORT CLOSING !!!");
          consumer?.close();
        });

        consumer?.on("transportclose", () => {
          console.log("PRODUCER CLOSING !!!");
          consumer?.close();
        });

        callback({
          params: {
            producerId: producer?.id,
            id: consumer?.id,
            kind: consumer?.kind,
            rtpParameters: consumer?.rtpParameters,
          },
        });
      }
    } catch (err: unknown) {
      console.log(err);
      callback({
        params: {
          error,
        },
      });
    }
  });

  socket.on("resumePausedConsumer", async () => {
    console.log("CONSUME RESUMING !!!");
    await consumer?.resume();
  })
});

server.listen("6066", () => {
  console.log("we are running on port 6066 🚀");
});
