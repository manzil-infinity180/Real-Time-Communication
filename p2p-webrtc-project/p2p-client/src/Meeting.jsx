import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";
import { Video } from "./Video";
import { useNavigate } from "react-router";
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
  const navigate = useNavigate()
  const [meetingId, setMeetingId] = useState("");
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
        peerIdentity: "rahul-vishwakarma",
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
    if (meetingId.length < 1) {
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
    navigate(`/meeting/${meetingId}`);
  };

  if (!option.joined) {
    return (
      <div className="flex justify-center items-center flex-col h-screen">
        <img
          src="https://webrtcclient.com/wp-content/uploads/2021/09/WebRTC-740-fi.png"
          alt="webrtc"
          loading="lazy"
          className="w-48 sm:w-72"
        />
        <h3 className="text-xl italic">Join the Meeting</h3>
        <input
          placeholder="Enter Room Id"
          className="file-input text-lg font-serif m-4 px-2"
          value={meetingId}
          onChange={(e) => setMeetingId(e.target.value)}
        />
        <button
          onClick={handleJoinMeeting}
          className="text-lg border font-mono rounded bg-blue-600 text-white px-3 py-2"
        >
          Join Now!
        </button>
      </div>
    );
  }

  return (
    <>
      <p>P2P Real time communication</p>

      <div className="bg-white p-6 shadow-lg rounded-md">
        <div className="flex-col justify-center space-x-4 mb-4 md:flex md:flex-row">
          <Video stream={localStream} muted={option.mutedValue} />
          <Video stream={remoteStream} />
        </div>
      </div>
    </>
  );
}

export default Meeting;
