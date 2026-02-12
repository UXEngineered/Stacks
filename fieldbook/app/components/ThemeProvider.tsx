"use client";

/**
 * Theme Provider for light/dark mode toggle
 * 
 * Simple client-side theme management with localStorage persistence.
 */

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Read theme synchronously on the client to avoid a flash.
 * Falls back to "light" during SSR or if nothing is stored.
 */
function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = localStorage.getItem("fieldlibrary-theme");
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // localStorage unavailable
  }
  return "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [mounted, setMounted] = useState(false);

  // Mark as mounted after first render
  useEffect(() => {
    setMounted(true);
  }, []);

  // Apply theme class to html and body
  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    const body = document.body;
    
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      body.style.backgroundColor = "#171717";
      body.style.color = "#fafafa";
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
      body.style.backgroundColor = "#ffffff";
      body.style.color = "#171717";
    }
    
    localStorage.setItem("fieldlibrary-theme", theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // Show children immediately but with default light theme
  // The useEffect will apply the correct theme after hydration
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
