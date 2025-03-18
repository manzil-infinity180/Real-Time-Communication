import { useEffect, useRef } from "react";

export function Video({stream, muted=true, controls=false}) {
    const videoStream = useRef();
    useEffect(() => {
        if(videoStream && videoStream.current){
            console.log(videoStream.current);
            videoStream.current.srcObject = stream
        }
    },[videoStream, stream]);
    return (
        <>
        {console.log(stream)}
        {stream && <>
            <video
            style={{ borderRadius: 10, margin: '4px' }}
            ref={videoStream}
            muted={muted}
            autoPlay={true}
            playsInline={true}
            controls={controls}
            className="w-full h-auto sm:w-1/2 sm:h-1/2 md:w-1/3 md:h-1/3"
        />
        </>
        }
        </>
    );
}
