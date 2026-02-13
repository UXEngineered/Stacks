"use client";

/**
 * Login Page
 *
 * Minimal login with animated UnicornStudio logo, typewriter tagline,
 * Google OAuth, and development quick-login.
 */

import { useState, useEffect, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useTheme } from "../components/ThemeProvider";
import { Button } from "../components/Button";
import { TorusAnimation } from "../components/TorusAnimation";

// ─── Constants ──────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [isLoading, setIsLoading] = useState(false);

  // ── Page entrance animation ───────────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Auth handler ───────────────────────────────────────────────────────
  const handleDevSignIn = useCallback(() => {
    setIsLoading(true);
    signIn("credentials", {
      email: "dev@example.com",
      name: "Developer",
      callbackUrl: "/projects",
    });
  }, []);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ backgroundColor: isDark ? "#171717" : "#fafafa" }}
    >
      <div
        className="w-full max-w-sm flex flex-col items-center"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(12px)",
          transition:
            "opacity 500ms cubic-bezier(0.16, 1, 0.3, 1), transform 500ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* ── Animated torus logo ──────────────────────────────────── */}
        <div className="overflow-hidden rounded-lg" style={{ width: 120, height: 120 }}>
          <TorusAnimation
            color={isDark ? "#e5e5e5" : "#404040"}
            size={120}
            speed={1.1}
            glyphSpacing={7}
            glyphSize={2}
            glyphWeight={1.1}
          />
        </div>

        {/* ── Title ──────────────────────────────────────────────── */}
        <h1
          className="mt-5 text-lg font-semibold tracking-tight"
          style={{ color: isDark ? "#fafafa" : "#171717" }}
        >
          Welcome to Stacks.
        </h1>

        {/* ── Sign-in ────────────────────────────────────────────── */}
        <div className="w-full max-w-[280px] mt-10">
          {/* Enter button — demo walkthrough */}
          <Button
            variant="primary"
            onClick={handleDevSignIn}
            disabled={isLoading}
            className="w-full justify-center mb-8"
          >
            {isLoading ? "Entering..." : "Let's Dive In"}
          </Button>
        </div>
      </div>

    </div>
  );
}
