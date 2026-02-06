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
  ...props 
}: ButtonProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  // Shared styles for all variants
  const baseStyles = {
    fontSize: "13px",
    fontWeight: 500,
    padding: "6px 12px",
    borderRadius: "1px",
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
      border: "1px solid transparent",
    },
    secondary: {
      backgroundColor: "transparent",
      color: isDark ? "#fafafa" : "#171717",
      border: `1px solid ${isDark ? "#525252" : "#d4d4d4"}`,
    },
    tertiary: {
      backgroundColor: "transparent",
      color: isDark ? "#fafafa" : "#171717",
      border: "1px solid transparent",
    },
  };
  
  // Hover styles applied via onMouseEnter/Leave for more control
  const getHoverStyles = (): React.CSSProperties => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: isDark ? "#333333" : "#262626",
        };
      case "secondary":
        return {
          backgroundColor: isDark ? "rgba(250, 250, 250, 0.08)" : "rgba(23, 23, 23, 0.05)",
        };
      case "tertiary":
        return {
          backgroundColor: isDark ? "rgba(250, 250, 250, 0.08)" : "rgba(23, 23, 23, 0.05)",
        };
    }
  };

  return (
    <button
      className={`inline-flex items-center justify-center ${className}`}
      style={{
        ...baseStyles,
        ...variantStyles[variant],
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
