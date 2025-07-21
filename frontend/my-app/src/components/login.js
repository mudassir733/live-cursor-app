"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react";
import { useRouter } from "next/navigation"

export default function LoginPage() {
    const [username, setUsename] = useState();
    const router = useRouter();


    const onSubmit = (e) => {
        e.preventDefault();
        if (username.trim() === "") return;

        // Save username to localStorage
        localStorage.setItem("username", username);

        // Redirect to homepage
        router.push('/');
    }
    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-lg border-0 bg-white">
                <CardHeader className="space-y-1 text-center pb-8">
                    <CardTitle className="text-3xl font-bold text-gray-900">Welcome Back</CardTitle>
                    <CardDescription className="text-gray-600 text-base">Enter your username to continue</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                            Username
                        </Label>
                        <Input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsename(e.target.value)}
                            placeholder="Enter your username"
                            className="h-12 px-4 text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                            required
                        />
                    </div>
                    <Button
                        type="submit"
                        onClick={onSubmit}
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium text-base rounded-lg transition-colors duration-200"
                    >
                        Sign In
                    </Button>
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
    )
}
