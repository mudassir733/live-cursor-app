"use client"
import { useEffect, useState } from "react";
import useWebSocket from "react-use-websocket";

export default function Home() {
  const [username, setUsername] = useState(null);

  const WS_URL = "ws://localhost:8000";
  useWebSocket(WS_URL, {
    queryParams: { username }
  })

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

  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-3xl font-bold">Hello, {username}</h1>
    </div>
  );
}
