import { useEffect } from "react"
import {io} from "socket.io-client"
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
