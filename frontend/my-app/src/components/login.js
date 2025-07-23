"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUserLogin } from "@/hooks/useUserApi";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();
    const loginMutation = useUserLogin();

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (username.trim() === "") {
            setError("Username is required");
            return;
        }
        // Call login API
        loginMutation.mutate(
            { username, email },
            {
                onSuccess: (data) => {
                    // Store user in localStorage
                    if (data?.data?.user) {
                        localStorage.setItem("user", JSON.stringify(data.data.user));
                        localStorage.setItem("username", data.data.user.username);
                        localStorage.setItem("userId", data.data.user.id);
                    }
                    // Redirect to homepage
                    router.push("/");
                },
                onError: (err) => {
                    setError(err?.response?.data?.error || "Login failed");
                }
            }
        );
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-lg border-0 bg-white">
                <CardHeader className="space-y-1 text-center pb-8">
                    <CardTitle className="text-3xl font-bold text-gray-900">Welcome Back</CardTitle>
                    <CardDescription className="text-gray-600 text-base">Enter your username to continue</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <form className="space-y-6" onSubmit={onSubmit}>
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                                Username
                            </Label>
                            <Input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                className="h-12 px-4 text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                                Email (optional)
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                className="h-12 px-4 text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                            />
                        </div>
                        {error && <div className="text-red-600 text-sm text-center">{error}</div>}
                        <Button
                            type="submit"
                            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium text-base rounded-lg transition-colors duration-200"
                            disabled={loginMutation.isLoading}
                        >
                            {loginMutation.isLoading ? "Signing In..." : "Sign In"}
                        </Button>
                    </form>
                    <div className="text-center pt-4">
                        <p className="text-sm text-gray-500">
                            {"Don't have an account? "}
                            <a href="#" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
                                Contact support
                            </a>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

