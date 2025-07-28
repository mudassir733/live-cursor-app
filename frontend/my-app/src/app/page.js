"use client";
import { useEffect, useState, useRef } from "react";
import { Cursor } from "@/components/cursor";
import { useOnlineUsers } from "@/hooks/useUserApi";
import { useSocket, useCursorEvents } from "@/hooks/useSocket";
import { useSearchParams } from "next/navigation";

export default function Home() {
  const [username, setUsername] = useState(null);
  const [userId, setUserId] = useState(null);
  const [cursors, setCursors] = useState([]);
  const searchParams = useSearchParams();
  const roomId = searchParams.get("room") || "default";
  const socket = useSocket(username, roomId);
  const { sendCursorMove } = useCursorEvents(socket, userId);
  const { data: onlineUsers, isLoading: loadingUsers } = useOnlineUsers();
  const lastMessageRef = useRef(null); // Track last processed message

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
      const cursorData = { userId, username, x: e.clientX, y: e.clientY };
      sendCursorMove(cursorData);
    }, 30);
    window.addEventListener("mousemove", throttledMove);
    return () => window.removeEventListener("mousemove", throttledMove);
  }, [socket.isConnected, userId, username, sendCursorMove]);

  // Debounce state updates
  const debounceSetCursors = useRef(
    throttle((newCursors) => {
      setCursors(newCursors);
    }, 50) // Debounce to 50ms
  ).current;

  // Process WebSocket messages
  useEffect(() => {
    if (!username || !userId || !socket || !socket.lastMessage) return;

    const message = socket.lastMessage;
    // Skip if message is identical to last processed
    const messageStr = JSON.stringify(message);
    if (lastMessageRef.current === messageStr) return;
    lastMessageRef.current = messageStr;

    // Log only in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Processing message:', messageStr);
    }

    if (message.type === 'cursors:update' || message.type === 'connection:success') {
      const cursors = message.data?.cursors || [];
      const validCursors = cursors
        .filter(cursor => cursor && cursor.userId && typeof cursor.x === 'number' && typeof cursor.y === 'number')
        .map(cursor => ({
          userId: cursor.userId,
          username: cursor.username,
          x: cursor.x,
          y: cursor.y
        }));
      if (process.env.NODE_ENV === 'development') {
        console.log('Updating cursors from cursors:update/connection:success:', validCursors);
      }
      debounceSetCursors(validCursors);
    } else if (message.type === 'cursor:move') {
      const cursorData = message.data;
      if (!cursorData?.userId) {
        console.warn('Invalid cursor:move data:', cursorData);
        return;
      }
      debounceSetCursors((prevCursors) => {
        const newCursors = [...prevCursors];
        const index = newCursors.findIndex((c) => c.userId === cursorData.userId);
        if (index >= 0) {
          newCursors[index] = { ...newCursors[index], x: cursorData.x, y: cursorData.y, username: cursorData.username };
        } else {
          newCursors.push({ userId: cursorData.userId, username: cursorData.username, x: cursorData.x, y: cursorData.y });
        }
        if (process.env.NODE_ENV === 'development') {
          console.log('Updated cursors:', newCursors);
        }
        return newCursors;
      });
    } else if (message.type === 'user:disconnected') {
      debounceSetCursors((prevCursors) => {
        const newCursors = prevCursors.filter((c) => c.userId !== message.data.userId);
        if (process.env.NODE_ENV === 'development') {
          console.log('User disconnected, updated cursors:', newCursors);
        }
        return newCursors;
      });
    }
  }, [username, userId, socket, socket.lastMessage, debounceSetCursors]);

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
        <h2 className="text-lg font-semibold mb-2">Online users</h2>
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
      {cursors.map((c, idx) => {
        const user = onlineUsers?.find((u) => u.id === c.userId) || {
          id: c.userId,
          username: c.username,
          avatar: "/placeholder.svg",
          role: "Unknown",
          status: "Unknown",
        };

        return (
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
              user={user}
            />

          </div>
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