"use client";

/**
 * Login Page
 * 
 * Simple, minimal login with Google OAuth only.
 * Development mode includes a quick login form.
 */

import { useState, useEffect } from "react";
import { signIn, getProviders } from "next-auth/react";
import { useTheme } from "../components/ThemeProvider";

export default function LoginPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const [devEmail, setDevEmail] = useState("dev@example.com");
  const [devName, setDevName] = useState("Developer");
  const [isLoading, setIsLoading] = useState(false);
  const [hasCredentialsProvider, setHasCredentialsProvider] = useState(false);
  const [hasGoogleProvider, setHasGoogleProvider] = useState(false);
  
  // Check available providers
  useEffect(() => {
    getProviders().then((providers) => {
      if (providers) {
        setHasCredentialsProvider("credentials" in providers);
        setHasGoogleProvider("google" in providers);
      }
    });
  }, []);

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/projects" });
  };

  const handleDevSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await signIn("credentials", {
      email: devEmail,
      name: devName,
      callbackUrl: "/projects",
    });
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: isDark ? "#0a0a0a" : "#fafafa" }}
    >
      <div 
        className="w-full max-w-sm p-8"
        style={{ 
          backgroundColor: isDark ? "#171717" : "#ffffff",
          border: `1px solid ${isDark ? "#404040" : "#e5e5e5"}`,
        }}
      >
        <div className="text-center mb-8">
          <h1 
            className="text-xl font-semibold tracking-tight"
            style={{ color: isDark ? "#fafafa" : "#171717" }}
          >
            Sign in to Fieldbook
          </h1>
          <p 
            className="mt-2 text-sm"
            style={{ color: isDark ? "#a3a3a3" : "#525252" }}
          >
            Research synthesis, structured and traceable.
          </p>
        </div>

        {/* Development Login */}
        {hasCredentialsProvider && (
          <>
            <form onSubmit={handleDevSignIn} className="mb-6">
              <div
                className="text-[10px] font-semibold tracking-wider uppercase mb-3 text-center"
                style={{ color: isDark ? "#737373" : "#a3a3a3" }}
              >
                Development Login
              </div>
              <input
                type="email"
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-3 py-2 text-sm mb-2 outline-none"
                style={{
                  backgroundColor: isDark ? "#262626" : "#f5f5f5",
                  color: isDark ? "#fafafa" : "#171717",
                  border: `1px solid ${isDark ? "#404040" : "#e5e5e5"}`,
                }}
              />
              <input
                type="text"
                value={devName}
                onChange={(e) => setDevName(e.target.value)}
                placeholder="Name"
                className="w-full px-3 py-2 text-sm mb-3 outline-none"
                style={{
                  backgroundColor: isDark ? "#262626" : "#f5f5f5",
                  color: isDark ? "#fafafa" : "#171717",
                  border: `1px solid ${isDark ? "#404040" : "#e5e5e5"}`,
                }}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: isDark ? "#fafafa" : "#171717",
                  color: isDark ? "#171717" : "#fafafa",
                }}
              >
                {isLoading ? "Signing in..." : "Sign in as Developer"}
              </button>
            </form>

            <div 
              className="flex items-center gap-3 mb-6"
              style={{ color: isDark ? "#525252" : "#d4d4d4" }}
            >
              <div className="flex-1 h-px" style={{ backgroundColor: isDark ? "#404040" : "#e5e5e5" }} />
              <span className="text-xs">or</span>
              <div className="flex-1 h-px" style={{ backgroundColor: isDark ? "#404040" : "#e5e5e5" }} />
            </div>
          </>
        )}

        {/* Google Login */}
        {hasGoogleProvider && (
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 text-sm font-medium transition-colors"
            style={{
              backgroundColor: isDark ? "#262626" : "#f5f5f5",
              color: isDark ? "#fafafa" : "#171717",
              border: `1px solid ${isDark ? "#404040" : "#e5e5e5"}`,
            }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>
        )}

        <p 
          className="mt-6 text-center text-xs"
          style={{ color: isDark ? "#525252" : "#a3a3a3" }}
        >
          By signing in, you agree to our Terms of Service.
        </p>
      </div>
    </div>
  );
}
