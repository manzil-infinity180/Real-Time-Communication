import './App.css'
import {createBrowserRouter, RouterProvider} from "react-router"
import Home from './Home'
import Meeting from './Meeting'

function App() {

  const router = createBrowserRouter([
    {
      path:"*",
      element:<Home />
    }, 
    {
      path:"/meeting/:meetingId",
      element: <Meeting />
    }
  ])

  return (
    <>
      <RouterProvider router={router} />
    </>
  )
}

export default App
