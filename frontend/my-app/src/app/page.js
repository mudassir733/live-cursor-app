"use client"
import { useEffect, useState, useRef } from "react";
import useWebSocket from "react-use-websocket";
import throttle from "lodash.throttle";

import { Cursor } from "@/components/cursor";


const randerCursor = users => {
  return Object.keys(users).map(uuid => {
    const user = users[uuid];

    return (
      <Cursor key={uuid} username={user.username} point={[user.state.x, user.state.y]} />
    )

  })
}


const renderUserList = users => {
  return <ul>
    {Object.keys(users).map(uuid => {
      return <li key={uuid}>{JSON.stringify(users[uuid])}</li>
    })
    }
  </ul>
}

export default function Home() {
  const [username, setUsername] = useState(null);

  const WS_URL = "ws://localhost:8000";
  const { sendJsonMessage, lastJsonMessage } = useWebSocket(WS_URL, {
    queryParams: { username }
  })

  const TROTTLE = 50;
  const sendTrottlejsontrottle = useRef(throttle(sendJsonMessage, TROTTLE));

  useEffect(() => {

    sendJsonMessage({
      x: 0,
      y: 0
    });

    window.addEventListener("mousemove", e => {
      sendTrottlejsontrottle.current((() => {
        const payload = {
          x: e.clientX,
          y: e.clientY
        };
        return payload
      })());

    })
  }, [])

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    } else {
      window.location.href = "/login";
    }
  }, []);

  if (!username) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  if (lastJsonMessage) {
    return <>
      {randerCursor(lastJsonMessage)}
      {renderUserList(lastJsonMessage)}
    </>
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-3xl font-bold">Hello, {username}</h1>
    </div>
  );
}
