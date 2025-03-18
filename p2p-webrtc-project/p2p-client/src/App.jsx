import {createBrowserRouter, RouterProvider } from "react-router-dom"
import Home from "./Home";
import Meeting from "./Meeting";

function App() {
    const router = createBrowserRouter([
        {
            path: "/meeting/:meetingId",
            element: <Meeting />,
        },
        {
            path: "*", 
            element: <Home />
        }
    ]);
    return (<>
    <RouterProvider router={router} />
    </>)
}

export default App;