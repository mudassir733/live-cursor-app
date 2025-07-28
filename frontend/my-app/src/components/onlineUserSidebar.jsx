"use client";
import { useOnlineUsers } from "@/hooks/useUserApi";

export function OnlineUsersSidebar({ currentUserId }) {
    const { data: users, isLoading, isError } = useOnlineUsers();
    console.log("users", users)

    return (
        <div className="w-80 bg-white border-r h-screen border-slate-200 p-6">
            <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-2">Online Users</h2>
                <p className="text-sm text-slate-600">
                    {users?.length ? `${users.length} people are currently active` : "No users online"}
                </p>
            </div>

            <div className="space-y-3">
                {users?.map((user) => (
                    <div
                        key={user.id}
                        className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${user.id === currentUserId
                            ? "bg-blue-50 border border-blue-200"
                            : "hover:bg-slate-50 border border-transparent"
                            }`}
                    >
                        <div className="relative">
                            <img
                                src={"/avatar.jpg"}
                                alt={user.username}
                                className="w-10 h-10 rounded-full"
                            />
                            <div
                                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white"
                                style={{ backgroundColor: user.cursorState?.color || "#000000" }} // Use cursorState.color
                            ></div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                                <h3 className="font-medium text-slate-900 truncate">{user.username || "Unknown"}</h3>
                                {user.id === currentUserId && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">You</span>
                                )}
                            </div>
                            <p className="text-sm text-slate-600 truncate">{user.role || "Unknown"}</p>
                        </div>

                        <div className="flex items-center space-x-2">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: user.status === "online" ? "#10B981" : "#6B7280" }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 p-4 bg-slate-50 rounded-xl">
                <h3 className="font-medium text-slate-900 mb-2">Cursor Colors</h3>
                <div className="grid grid-cols-4 gap-2">
                    {users?.map((user) => (
                        <div key={user.id} className="flex flex-col items-center space-y-1">
                            <div
                                className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                                style={{ backgroundColor: user.cursorState?.color || "#000000" }}
                            ></div>
                            <span className="text-xs text-slate-600 truncate w-full text-center">
                                {(user.username || "Unknown").split(" ")[0]}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}