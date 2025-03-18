import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import cors from "cors";
import {createWorker} from "./mediasoupConfig.js";
const app = express();
const server = createServer(app);

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
  })
);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
});

io.on("connection", (socket) => {
  console.log("Socket Connected " + socket.id);

  socket.emit("ping", {
    message: "pong",
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });

  // Handle client requests for MediaSoup
  socket.on("joinRoom", async (roomId, callback) => {
    // Room joining logic here
    console.log(`Client joined room: ${roomId}`);

    const transport = await createWebRtcTransport(router);
    callback({ transportOptions: transport });
  });
});

const createWebRtcTransport = async (router) => {
  const transport = await router.createWebRtcTransport({
    listenIps: [{ ip: "0.0.0.0", announcedIp: "127.0.0.1" }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  });

  transport.on("dtlsstatechange", (state) => {
    if (state === "closed") {
      transport.close();
    }
  });

  transport.on("close", () => {
    console.log("Transport closed");
  });

  return transport;
};

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});

(async () => {
    await createWorker();
  })();