"use client"
"use client";
import { useEffect, useState, useRef } from "react";
import { Cursor } from "@/components/cursor";
import { useOnlineUsers } from "@/hooks/useUserApi";
import { useSocket, useCursorEvents } from "@/hooks/useSocket";

export default function Home() {
  const [username, setUsername] = useState(null);
  const [userId, setUserId] = useState(null);
  const [cursors, setCursors] = useState({});

  // Get current user info from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUsername(user.username);
      setUserId(user.id);
    } else {
      window.location.href = "/login";
    }
  }, []);

  // WebSocket connection
  const socket = useSocket(username);
  const { sendCursorMove } = useCursorEvents(socket, userId);

  // Online users query
  const { data: onlineUsers, isLoading: loadingUsers } = useOnlineUsers();

  // Handle real-time cursor broadcasting
  useEffect(() => {
    if (!socket.isConnected || !userId) return;
    const handleMove = (e) => {
      sendCursorMove({ userId, x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [socket.isConnected, userId, sendCursorMove]);

  // Listen for cursor updates from socket
  useEffect(() => {
    if (!socket.lastMessage) return;
    if (socket.lastMessage.type === "cursors:update") {
      setCursors(socket.lastMessage.data); // { userId: { x, y, username } }
    }
  }, [socket.lastMessage]);

  if (!username) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* Online Users List */}
      <div className="absolute left-4 top-4 z-20 bg-white rounded-xl shadow-lg p-4 flex flex-col items-center">
        <h2 className="text-lg font-semibold mb-2">Online Users</h2>
        {loadingUsers ? (
          <div>Loading...</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {onlineUsers && onlineUsers.length > 0 ? (
              onlineUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold border-2 border-blue-400">
                  {user.username[0].toUpperCase()}
                </div>
              ))
            ) : (
              <div className="text-gray-400">No users online</div>
            )}
          </div>
        )}
      </div>
      {/* Render all cursors */}
      {Object.keys(cursors).map((uid) => {
        const c = cursors[uid];
        return (
          <Cursor key={uid} point={[c.x, c.y]} />
        );
      })}
      {/* Greeting */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/80 rounded-xl px-8 py-4 shadow text-center">
        <h1 className="text-2xl font-bold text-gray-900">Hello, {username}</h1>
        <div className="text-gray-600 text-sm">Move your mouse to see your live cursor!</div>
      </div>
    </div>
  );
}
