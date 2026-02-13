"use client";

/**
 * Button - Standardized button component with three variants
 * 
 * Variants:
 * - primary: purple/indigo background, white text
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
  // minHeight ensures icon-only buttons match the height of text buttons
  const baseStyles = {
    fontSize: "12.5px",
    fontWeight: 500,
    padding: "5px 16px",
    borderRadius: "6px",
    minHeight: "29px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "all 150ms cubic-bezier(0.16, 1, 0.3, 1)",
  };
  
  // Variant-specific styles
  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      backgroundColor: isDark ? "#8b5cf6" : "#7c3aed",
      color: "#ffffff",
      border: `0.5px solid ${isDark ? "rgba(139, 92, 246, 0.3)" : "rgba(124, 58, 237, 0.3)"}`,
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
          backgroundColor: isDark ? "#7c3aed" : "#6d28d9",
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
