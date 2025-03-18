import { useEffect } from "react"
import {io} from "socket.io-client"

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
  iceServers : [{
    urls: "stun:stun.l.google.com:19302",
  },],
});

console.log({peerConnection})
function App() {

  useEffect(() => {
    // establishing the socket connection 
    const URL = "http://localhost:5006"
    const socketIo = io(URL, {
      transports: ['websocket', 'polling', 'flashsocket'],
    });
    socketIo.on('connect', () => {
      socketIo.on("join", (data) => {
        console.log(data);
      })
    })
  },[])
  return (
    <>
      <p>P2P Real time communication</p>
    </>
  )
}

export default App
