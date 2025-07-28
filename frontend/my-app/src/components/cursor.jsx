import { usePerfectCursor } from "../hooks/useCursor";
import { useEffect, useRef } from "react";

export function Cursor({ point, color, size, shadow, user }) {
    const cursorRef = useRef(null);

    const onPointChange = usePerfectCursor((point) => {
        if (cursorRef.current) {
            cursorRef.current.style.left = `${point[0]}px`;
            cursorRef.current.style.top = `${point[1]}px`;
        }
    }, point);

    useEffect(() => {
        onPointChange(point);
    }, [point, onPointChange]);

    return (
        <div
            className="absolute pointer-events-none z-50 transition-all duration-100 ease-out"
            style={{
                transform: "translate(-2px, -2px)",
            }}
        >
            {/* Cursor */}
            <div className="relative">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="drop-shadow-lg">
                    <path
                        d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                        fill={user.cursorState?.color || "#000000"}
                        stroke="white"
                        strokeWidth="1"
                    />
                </svg>

                {/* User Label */}
                <div
                    className="absolute left-6 top-2 bg-white rounded-lg shadow-lg border border-slate-200 pl-3 pr-7 py-2 whitespace-nowrap pointer-events-auto cursor-pointer transition-all duration-200 hover:shadow-xl"
                    style={{ borderLeftColor: user.cursorState?.color || "#000000", borderLeftWidth: "2px" }}
                >
                    <div className="flex items-center space-x-2">
                        <img src={"/avatar.jpg"} alt={user.username} className="w-5 h-5 rounded-full" />
                        <span className="text-sm font-medium text-slate-800">{user.username}</span>
                    </div>
                </div>

                {/* Profile Tooltip */}
                {/* {user.avatar && (
                    <div
                        className="absolute left-6 top-14 bg-white rounded-xl shadow-xl border border-slate-200 p-4 w-64 pointer-events-auto z-60 animate-in fade-in-0 zoom-in-95 duration-200"
                        style={{ borderTopColor: "blue", borderTopWidth: "3px" }}
                    >
                        <div className="flex items-start space-x-3">
                            <img src={user.avatar || "/placeholder.svg"} alt={user.name} className="w-12 h-12 rounded-full" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-slate-900">{user.name}</h3>
                                <p className="text-sm text-slate-600 mb-2">{user.role}</p>
                                <div className="flex items-center space-x-2">
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: user.status === "online" ? "#10B981" : "#6B7280" }}
                                    ></div>
                                    <span className="text-xs text-slate-500 capitalize">{user.status}</span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100">
                            <div className="flex space-x-2">
                                <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-2 px-3 rounded-lg transition-colors">
                                    Message
                                </button>
                                <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs py-2 px-3 rounded-lg transition-colors">
                                    Follow
                                </button>
                            </div>
                        </div>
                    </div>
                )} */}
            </div>
        </div>
    );
}