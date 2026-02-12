"use client";

/**
 * Login Page
 *
 * Open, airy sign-in screen that feels like the entry point
 * to an IDE for context and strategy decision making.
 * Uses shared Button components and Stacks typography.
 *
 * Exit animation: fades out + lifts up before navigating,
 * matching the transition pattern used across the app.
 */

import { useState, useEffect, useRef } from "react";
import { signIn, getProviders } from "next-auth/react";
import { useTheme } from "../components/ThemeProvider";
import { StacksLogo } from "../components/StacksLogo";
import { Button } from "../components/Button";

const EASING = "cubic-bezier(0.16, 1, 0.3, 1)";

export default function LoginPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [devEmail, setDevEmail] = useState("dev@example.com");
  const [devName, setDevName] = useState("Developer");
  const [isLoading, setIsLoading] = useState(false);
  const [hasCredentialsProvider, setHasCredentialsProvider] = useState(false);
  const [hasGoogleProvider, setHasGoogleProvider] = useState(false);

  // Entrance animation
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Small delay so the browser paints the initial state first
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Exit animation
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    getProviders().then((providers) => {
      if (providers) {
        setHasCredentialsProvider("credentials" in providers);
        setHasGoogleProvider("google" in providers);
      }
    });
  }, []);

  // ── Typewriter rotating status line ────────────────────────────────────
  const STATUS_LINES = [
    "Derived from 5 signals",
    "2 downstream impacts",
    "1 recalibration pending",
    "No new movement",
    "3 syntheses evolving",
    "1 artifact ready for review",
    "Lineage intact across 4 nodes",
    "2 sources awaiting integration",
  ];

  const [lineIndex, setLineIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isExiting) return; // Stop typing during exit
    const fullText = STATUS_LINES[lineIndex];

    if (isTyping) {
      if (displayed.length < fullText.length) {
        timeoutRef.current = setTimeout(() => {
          setDisplayed(fullText.slice(0, displayed.length + 1));
        }, 45 + Math.random() * 35);
      } else {
        timeoutRef.current = setTimeout(() => {
          setIsTyping(false);
        }, 2800);
      }
    } else {
      if (displayed.length > 0) {
        timeoutRef.current = setTimeout(() => {
          setDisplayed(displayed.slice(0, -1));
        }, 25);
      } else {
        setLineIndex((i) => (i + 1) % STATUS_LINES.length);
        setIsTyping(true);
      }
    }

    return () => clearTimeout(timeoutRef.current);
  }, [displayed, isTyping, lineIndex, isExiting, STATUS_LINES]);

  // ── Sign-in handlers with exit animation ──────────────────────────────
  const handleGoogleSignIn = () => {
    setIsExiting(true);
    setTimeout(() => {
      signIn("google", { callbackUrl: "/projects" });
    }, 350);
  };

  const handleDevSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsExiting(true);
    setTimeout(() => {
      signIn("credentials", {
        email: devEmail,
        name: devName,
        callbackUrl: "/projects",
      });
    }, 350);
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
    color: isDark ? "#fafafa" : "#171717",
    border: `0.5px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
    borderRadius: "6px",
    fontSize: "12.5px",
    padding: "8px 12px",
    outline: "none",
    transition: "border-color 150ms ease",
  };

  // Shared transition state: entrance (mounted) and exit (isExiting)
  const isVisible = mounted && !isExiting;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ backgroundColor: isDark ? "#171717" : "#fafafa" }}
    >
      {/* Content — vertically centered, generous whitespace */}
      <div
        className="w-full max-w-[340px] px-6"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(12px)",
          transition: `opacity 500ms ${EASING}, transform 500ms ${EASING}`,
        }}
      >
        {/* Logo + wordmark */}
        <div className="flex flex-col items-center mb-14">
          <StacksLogo
            size={36}
            color={isDark ? "#a3a3a3" : "#737373"}
          />
          <h1
            className="mt-4 text-lg font-semibold tracking-tight"
            style={{ color: isDark ? "#fafafa" : "#171717" }}
          >
            Stacks
          </h1>
          <div
            className="mt-3 text-[12px] text-center font-mono"
            style={{
              color: isDark ? "#737373" : "#a3a3a3",
              height: "18px",
            }}
          >
            {displayed}
            <span
              className="inline-block w-px ml-0.5"
              style={{
                height: "12px",
                backgroundColor: isDark ? "#737373" : "#a3a3a3",
                verticalAlign: "text-bottom",
                animation: "cursorBlink 800ms step-end infinite",
              }}
            />
          </div>
          <style>{`
            @keyframes cursorBlink {
              0%, 100% { opacity: 1; }
              50% { opacity: 0; }
            }
          `}</style>
        </div>

        {/* Sign-in options */}
        <div className="flex flex-col gap-6">
          {/* Google OAuth */}
          {hasGoogleProvider && (
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2.5 cursor-pointer"
              style={{
                ...inputStyle,
                backgroundColor: "transparent",
                border: `0.5px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`,
                padding: "9px 16px",
                fontWeight: 500,
                color: isDark ? "#d4d4d4" : "#404040",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.03)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill={isDark ? "#a3a3a3" : "#737373"}
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill={isDark ? "#a3a3a3" : "#737373"}
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill={isDark ? "#a3a3a3" : "#737373"}
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill={isDark ? "#a3a3a3" : "#737373"}
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          )}

          {/* Divider — only when both providers exist */}
          {hasCredentialsProvider && hasGoogleProvider && (
            <div className="flex items-center gap-3">
              <div
                className="flex-1 h-px"
                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}
              />
              <span
                className="text-[10px] uppercase tracking-wider font-medium"
                style={{ color: isDark ? "#404040" : "#d4d4d4" }}
              >
                or
              </span>
              <div
                className="flex-1 h-px"
                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}
              />
            </div>
          )}

          {/* Dev credentials login */}
          {hasCredentialsProvider && (
            <form onSubmit={handleDevSignIn} className="flex flex-col gap-3">
              <div
                className="text-[10px] font-semibold tracking-wider uppercase"
                style={{ color: isDark ? "#525252" : "#a3a3a3" }}
              >
                Developer easy login
              </div>
              <input
                type="email"
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
                placeholder="Email"
                className="w-full"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = isDark ? "rgba(139,92,246,0.4)" : "rgba(124,58,237,0.4)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
                }}
              />
              <input
                type="text"
                value={devName}
                onChange={(e) => setDevName(e.target.value)}
                placeholder="Name"
                className="w-full"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = isDark ? "rgba(139,92,246,0.4)" : "rgba(124,58,237,0.4)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
                }}
              />
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                style={{ width: "100%", padding: "8px 16px" }}
              >
                {isLoading ? "Entering..." : "Enter Stacks"}
              </Button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p
          className="mt-10 text-center text-[11px]"
          style={{ color: isDark ? "#333333" : "#d4d4d4" }}
        >
          Because thinking deserves version control.
        </p>
      </div>
    </div>
  );
}
