import { useState } from "react";
import { useNavigate } from "react-router";
import { io } from "socket.io-client";
import { Video } from "./Video";
function Meeting() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [socketDetail, setSocketDetails] = useState(null);
  const [user, setUser] = useState("");
  const [option, setOption] = useState({
    joined: false,
    isRecording: false,
    isFileReady: false,
    isScreenSharing: false,
    mutedValue: true,
    disabled: true,
    showVideo: true,
  });

  function handleJoinMeeting() {
    if (roomId.length < 1 || user.length < 1) {
      return;
    }
    const URL = "http://localhost:3000";
    const socket = io(URL, {
      transports: ["websocket", "polling", "flashsocket"],
    });

    socket.emit("joinRoom", { username: user, roomId });
    socket.on("connect", () => {
      console.log("Connected to server");
      setSocketDetails(socket);
    });

    socket.on("roomJoined", ({ roomId, username }) => {
      console.log(`Joined room ${roomId} as ${username}`);
      // Initialize media streams and UI updates here
    });

    socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      alert("Connection failed. Please try again.");
    });

    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then((stream) => {
        setLocalStream(stream);

        remoteParticipant("local", stream);
        socket.emit("newParticipant", { id: "local", stream });

        socket.on("newParticipant", ({ id, stream }) => {
          remoteParticipant(id, stream);
        });

        socket.on("participantLeft", (id) => {
          removeParticipantVideo(id);
        });
      })
      .catch((error) => {
        console.error("Error accessing media devices.", error);
        alert(
          "Could not access your camera and microphone. Please check your permissions."
        );
      });

    setOption((s) => ({ ...s, joined: true }));
    navigate(`/meeting/${roomId}`);
  }

  function handleAudioButton() {
    setOption((s) => ({ ...s, mutedValue: !option.mutedValue }));
    // TODO: do not remove audio from video element do it using localStream
    localStream.getAudioTracks()[0].enabled = option.mutedValue;
  }
  function handleLeaveRoomButton() {
    socketDetail.emit("leaveRoom", { username: user, roomId });
    if (socketDetail) {
      socketDetail.disconnect();
    }
    if (localStream) {
      localStream.getTracks().forEach(function (track) {
        track.stop();
      });
    }
  }
  // TODO: Not working
  function handleStopVideoButton() {
    // localStream.getVideoTracks()[0].enabled = videoEnabled;
    setOption((s) => ({ ...s, showVideo: !option.showVideo }));
    localStream.getVideoTracks()[0] = false;
  }

  function remoteParticipant(id, stream) {
    const videoElement = document.createElement("video");
    videoElement.id = id;
    videoElement.srcObject = stream;
    videoElement.autoplay = true;
    document.getElementById("participant-view").appendChild(videoElement);
  }

  const removeParticipantVideo = (id) => {
    const videoElement = document.getElementById(id);
    if (videoElement) {
      videoElement.srcObject.getTracks().forEach((track) => track.stop());
      videoElement.remove();
    }
  };

  if (!option.joined) {
    return (
      <div>
        <img
          src="https://webrtcclient.com/wp-content/uploads/2021/09/WebRTC-740-fi.png"
          alt="webrtc"
          loading="lazy"
          style={{
            width: "720px",
            height: "360px",
          }}
        />
        <h1>Join Our Meeting</h1>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <input
            placeholder="Enter Username"
            value={user}
            onChange={(e) => setUser(e.target.value)}
          />
          <input
            placeholder="Enter Room Id"
            value={roomId}
            //   style={{
            //     padding:"5px 2px",
            //   }}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button onClick={handleJoinMeeting}>Join Now!</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <h1>Meeting Page</h1>
      <div
        style={{
          display: "flex",
        }}
      >
        {/* <Video stream={localStream} muted={option.mutedValue} /> */}
        {/* <Video stream={remoteStream} /> */}
      </div>
      <div id="controls">
        <button id="mute-button" onClick={handleAudioButton}>
          {option.mutedValue ? "Unmute" : "Mute"}
        </button>
        <button id="video-button" onClick={handleStopVideoButton}>
          {option.mutedValue ? "Stop Video" : "Start Video"}
        </button>
        <button id="leave-button" onClick={handleLeaveRoomButton}>
          Leave Room
        </button>
      </div>

      <div id="participant-view"></div>
    </>
  );
}

export default Meeting;
