"use client"
"use client";
import { useEffect, useState, useRef } from "react";
import { Cursor } from "@/components/cursor";
import { fetchAllCursors } from "@/lib/api";
import { useOnlineUsers } from "@/hooks/useUserApi";
import { useSocket, useCursorEvents } from "@/hooks/useSocket";

import { useSearchParams } from "next/navigation";

export default function Home() {
  // Always call hooks in the same order, at the top
  const [username, setUsername] = useState(null);
  const [userId, setUserId] = useState(null);
  const [cursors, setCursors] = useState([]); // [{ userId, username, x, y }]
  const searchParams = useSearchParams();
  const roomId = searchParams.get("room") || "default"; // fallback to 'default' room
  const socket = useSocket(username, roomId);
  const { sendCursorMove } = useCursorEvents(socket, userId);
  const { data: onlineUsers, isLoading: loadingUsers } = useOnlineUsers();

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


  // Real-time: update cursors from WebSocket events
  useEffect(() => {
    if (!username || !userId) return;
    if (!socket || !socket.lastMessage) return;
    if (
      socket.lastMessage.type === "cursors:update" ||
      socket.lastMessage.type === "connection:success"
    ) {
      // Expect an array: [{ userId, username, x, y }]
      setCursors(socket.lastMessage.data?.cursors || []);
    }
  }, [username, userId, socket, socket?.lastMessage]);





  // Throttle function
  function throttle(fn, wait) {
    let last = 0;
    return (...args) => {
      const now = Date.now();
      if (now - last > wait) {
        last = now;
        fn(...args);
      }
    };
  }
  // Handle real-time cursor broadcasting (throttled)
  useEffect(() => {
    if (!socket.isConnected || !userId) return;
    const throttledMove = throttle((e) => {
      sendCursorMove({ userId, username, x: e.clientX, y: e.clientY });
    }, 30);
    window.addEventListener("mousemove", throttledMove);
    return () => window.removeEventListener("mousemove", throttledMove);
  }, [socket.isConnected, userId, username, sendCursorMove]);

  // Listen for cursor updates from socket
  useEffect(() => {
    if (!socket.lastMessage) return;
    if (socket.lastMessage.type === "cursors:update" || socket.lastMessage.type === "connection:success") {
      // Expect an array: [{ userId, username, x, y }]
      setCursors(socket.lastMessage.data?.cursors || []);
    }
  }, [socket.lastMessage]);

  if (!username || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
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
      {/* Render all cursors (Figma/Miro style) */}
      {cursors.map((c, idx) => (
        <div
          key={c.userId || `${c.username}-${idx}`}
          style={{
            position: "absolute",
            left: c.x,
            top: c.y,
            zIndex: c.userId === userId ? 20 : 10,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            transform: "translate(-50%, -50%)",
          }}
        >
          <Cursor
            point={[0, 0]}
            color={c.userId === userId ? "#6366f1" : "#f43f5e"}
            size={36}
            shadow={c.userId === userId}
          />
          <span
            style={{
              marginLeft: 8,
              background: c.userId === userId ? "#6366f1" : "#f43f5e",
              color: "white",
              fontWeight: 600,
              borderRadius: 6,
              padding: "2px 8px",
              fontSize: 14,
              boxShadow: c.userId === userId ? "0 2px 8px #6366f180" : "0 2px 8px #f43f5e40",
              border: c.userId === userId ? "2px solid #6366f1" : "2px solid #f43f5e",
              position: "relative",
              top: 0,
            }}
          >
            {c.username}
          </span>
        </div>
      ))}
      {/* Greeting */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/80 rounded-xl px-8 py-4 shadow text-center">
        <h1 className="text-2xl font-bold text-gray-900">Hello, {username}</h1>
        <div className="text-gray-600 text-sm">Move your mouse to see your live cursor!</div>
      </div>
    </div>
  );
}
