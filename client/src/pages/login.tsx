import { MainLayout } from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import type { User } from "@shared/schema";
import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff } from 'lucide-react';
import { Label } from '@/components/ui/label';


const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');

  // Check for recovery parameters in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const recovery = urlParams.get('recovery');
    const message = urlParams.get('message');

    if (recovery === 'success' && message) {
      setRecoveryMessage(message);
      // Pre-fill admin credentials if this is a recovery
      if (message.includes('markur')) {
        setUsername('markur');
        setPassword('TempPass2025!');
      }
      // Clear URL parameters
      window.history.replaceState({}, document.title, '/login');
    } else if (recovery === 'error' && message) {
      setError(message);
      // Clear URL parameters
      window.history.replaceState({}, document.title, '/login');
    }
  }, []);


  // Check if user is already logged in
  const { data: user, isLoading: isCheckingAuth } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
  });

  // Don't redirect immediately, let user see the login form first
  // Only redirect after successful login through the mutation

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: LoginForm) => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        const contentType = response.headers.get("content-type");

        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          console.error("Received non-JSON response:", text);
          throw new Error("Server error: Expected JSON response but received HTML");
        }

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.message || `Login failed with status ${response.status}`);
        }

        return responseData;
      } catch (error) {
        console.error("Login request error:", error);
        if (error instanceof SyntaxError) {
          throw new Error("Server returned invalid response format");
        }
        throw error;
      }
    },
    onSuccess: async (data) => {
      const isAdmin = data.user.isAdmin;
      toast({
        title: "Login successful!",
        description: isAdmin ? "Welcome to admin dashboard!" : "Welcome back!",
      });
      // Update auth status immediately
      queryClient.setQueryData(["/api/auth/me"], data.user);
      // Redirect based on user role
      setTimeout(() => {
        setLocation(isAdmin ? "/admin" : "/");
      }, 1000);
    },
    onError: (error: Error) => {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: { username: string; password: string }) => {
    console.log("Attempting login for:", data.username);
    mutate(data);
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Login</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
        {recoveryMessage && (
          <Alert>
            <AlertDescription className="text-green-700 bg-green-50 border-green-200">
              {recoveryMessage}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => onSubmit(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </Form>
              <div className="text-center mt-4">
                <Link href="/forgot-password">
                  <Button variant="link" className="text-sm">
                    Forgot your password?
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}