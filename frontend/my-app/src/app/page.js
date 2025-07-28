"use client";
import { useEffect, useState, useRef } from "react";
import { Cursor } from "@/components/cursor";
import { useOnlineUsers } from "@/hooks/useUserApi";
import { useSocket, useCursorEvents } from "@/hooks/useSocket";
import { useSearchParams } from "next/navigation";
import { OnlineUsersSidebar } from "@/components/onlineUserSidebar";
import { useCurrentUser } from "@/hooks/useUserApi";

export default function Home() {
  const [username, setUsername] = useState(null);
  const [users, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [cursors, setCursors] = useState([]);
  const searchParams = useSearchParams();
  const roomId = searchParams.get("room") || "default";
  const socket = useSocket(username, roomId);
  const { sendCursorMove } = useCursorEvents(socket, userId);
  const { data: onlineUsers, isLoading: loadingUsers } = useOnlineUsers();
  const lastMessageRef = useRef(null);


  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUser(user);
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
    // if (process.env.NODE_ENV === 'development') {
    //   console.log('Processing message:', messageStr);
    // }

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
        // if (process.env.NODE_ENV === 'development') {
        //   console.log('Updated cursors:', newCursors);
        // }
        return newCursors;
      });
    } else if (message.type === 'user:disconnected') {
      debounceSetCursors((prevCursors) => {
        const newCursors = prevCursors.filter((c) => c.userId !== message.data.userId);
        // if (process.env.NODE_ENV === 'development') {
        //   console.log('User disconnected, updated cursors:', newCursors);
        // }
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
    <div className="relative min-h-screen bg-gray-50 overflow-hidden">

      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">LC</span>
            </div>
            <h1 className="text-xl font-semibold text-slate-900">Live Cursor Workspace</h1>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-slate-600"> {onlineUsers?.length} users online</span>
            </div>
          </div>
        </div>
      </header>

      <OnlineUsersSidebar currentUserId={userId} />





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
    </div>
  );
}