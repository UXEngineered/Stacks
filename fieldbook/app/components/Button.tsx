"use client";

/**
 * Button - Standardized button component with three variants
 * 
 * Variants:
 * - primary: off-white background, dark text (dark mode) / dark background, light text (light mode)
 * - secondary: transparent with outline
 * - tertiary: no background, no border, same spacing
 * 
 * All buttons have consistent sizing and 12px font.
 */

import { ReactNode, ButtonHTMLAttributes } from "react";
import { useTheme } from "./ThemeProvider";

type ButtonVariant = "primary" | "secondary" | "tertiary";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

export function Button({ 
  variant = "primary", 
  children, 
  className = "",
  disabled,
  style: customStyle,
  ...props 
}: ButtonProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  // Shared styles for all variants
  const baseStyles = {
    fontSize: "12.5px",
    fontWeight: 500,
    padding: "5px 16px",
    borderRadius: "6px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "all 150ms cubic-bezier(0.16, 1, 0.3, 1)",
  };
  
  // Variant-specific styles
  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      // Dark mode: subtle lift from background (#171717 -> #262626), light text
      // Light mode: dark bg, light text
      backgroundColor: isDark ? "#262626" : "#171717",
      color: isDark ? "#fafafa" : "#fafafa",
      border: `0.5px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
    },
    secondary: {
      backgroundColor: "transparent",
      color: isDark ? "#a3a3a3" : "#525252",
      border: `0.5px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`,
    },
    tertiary: {
      backgroundColor: "transparent",
      color: isDark ? "#a3a3a3" : "#525252",
      border: "0.5px solid transparent",
    },
  };
  
  // Hover styles applied via onMouseEnter/Leave for more control
  const getHoverStyles = (): React.CSSProperties => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: isDark ? "#2a2a2a" : "#1f1f1f",
        };
      case "secondary":
        return {
          backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)",
        };
      case "tertiary":
        // Link-like behavior: no background change, just text color brightens
        return {
          color: isDark ? "#fafafa" : "#171717",
        };
    }
  };

  return (
    <button
      className={`inline-flex items-center justify-center ${className}`}
      style={{
        ...baseStyles,
        ...variantStyles[variant],
        ...customStyle,
      }}
      disabled={disabled}
      onMouseEnter={(e) => {
        if (!disabled) {
          const hoverStyles = getHoverStyles();
          Object.assign(e.currentTarget.style, hoverStyles);
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          Object.assign(e.currentTarget.style, variantStyles[variant]);
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
}
