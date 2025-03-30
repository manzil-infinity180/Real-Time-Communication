import {useNavigate} from "react-router"
function Home() {
    const navigate = useNavigate()
    return (
        <>
        <h1>Hello Everyone</h1>
    <button onClick={() => navigate("/meeting/join")}>Join Our meeting</button>
        </>
    )
}

export default Home;