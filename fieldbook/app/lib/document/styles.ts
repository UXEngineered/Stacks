/**
 * Fieldbook Style System
 *
 * Enforces visual consistency by constraining:
 * - Color palette (semantic, not arbitrary)
 * - Typography scale (limited, purposeful sizes)
 * - Spacing rhythm (consistent visual hierarchy)
 *
 * This is NOT a runtime style engine - it's a design contract
 * that components and renderers should follow.
 */

// =============================================================================
// COLOR PALETTE
// =============================================================================

/**
 * Semantic color tokens
 * Components should reference these, not arbitrary hex values
 */
export const colors = {
  // Base neutrals (for text, borders, backgrounds)
  neutral: {
    50: "#FAFAFA",
    100: "#F5F5F5",
    200: "#E5E5E5",
    300: "#D4D4D4",
    400: "#A3A3A3",
    500: "#737373",
    600: "#525252",
    700: "#404040",
    800: "#262626",
    900: "#171717",
  },

  // Callout intent colors (background, border, icon)
  callout: {
    decision: {
      bg: "#ECFDF5",      // green-50
      border: "#6EE7B7",  // green-300
      icon: "#059669",    // green-600
      text: "#065F46",    // green-800
    },
    assumption: {
      bg: "#FEF3C7",      // amber-100
      border: "#FCD34D",  // amber-300
      icon: "#D97706",    // amber-600
      text: "#92400E",    // amber-800
    },
    open_question: {
      bg: "#DBEAFE",      // blue-100
      border: "#93C5FD",  // blue-300
      icon: "#2563EB",    // blue-600
      text: "#1E40AF",    // blue-800
    },
    constraint: {
      bg: "#F3F4F6",      // gray-100
      border: "#D1D5DB",  // gray-300
      icon: "#4B5563",    // gray-600
      text: "#1F2937",    // gray-800
    },
    risk: {
      bg: "#FEE2E2",      // red-100
      border: "#FCA5A5",  // red-300
      icon: "#DC2626",    // red-600
      text: "#991B1B",    // red-800
    },
  },

  // Accent (for links, selections, focus states)
  accent: {
    primary: "#2563EB",   // blue-600
    hover: "#1D4ED8",     // blue-700
    light: "#DBEAFE",     // blue-100
  },
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

/**
 * Font stack - system fonts only, no custom font loading
 * This ensures fast rendering and consistent cross-platform appearance
 */
export const fontFamily = {
  sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
} as const;

/**
 * Type scale - intentionally limited
 * Based on a 1.25 ratio (major third) from 16px base
 *
 * Usage:
 * - xs: Fine print, metadata
 * - sm: Secondary text, captions
 * - base: Body text (default)
 * - lg: Lead paragraphs, emphasis
 * - xl: h3 headings
 * - 2xl: h2 headings
 * - 3xl: h1 headings, document titles
 */
export const fontSize = {
  xs: "0.75rem",    // 12px
  sm: "0.875rem",   // 14px
  base: "1rem",     // 16px
  lg: "1.125rem",   // 18px
  xl: "1.25rem",    // 20px
  "2xl": "1.5rem",  // 24px
  "3xl": "1.875rem", // 30px
} as const;

/**
 * Line heights paired with font sizes
 */
export const lineHeight = {
  tight: "1.25",    // Headings
  normal: "1.5",    // Body text
  relaxed: "1.625", // Long-form reading
} as const;

/**
 * Font weights - only what we need
 */
export const fontWeight = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

/**
 * Heading styles mapped to levels
 */
export const headingStyles = {
  1: {
    fontSize: fontSize["3xl"],
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.tight,
    marginTop: "0",
    marginBottom: "1.5rem",
  },
  2: {
    fontSize: fontSize["2xl"],
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
    marginTop: "2rem",
    marginBottom: "1rem",
  },
  3: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
    marginTop: "1.5rem",
    marginBottom: "0.75rem",
  },
} as const;

// =============================================================================
// SPACING
// =============================================================================

/**
 * Spacing scale (in rem)
 * Based on 4px grid (0.25rem)
 */
export const spacing = {
  0: "0",
  1: "0.25rem",   // 4px
  2: "0.5rem",    // 8px
  3: "0.75rem",   // 12px
  4: "1rem",      // 16px
  5: "1.25rem",   // 20px
  6: "1.5rem",    // 24px
  8: "2rem",      // 32px
  10: "2.5rem",   // 40px
  12: "3rem",     // 48px
} as const;

/**
 * Block spacing (vertical rhythm between blocks)
 */
export const blockSpacing = {
  paragraph: spacing[4],
  heading: spacing[6],
  list: spacing[4],
  quote: spacing[6],
  callout: spacing[6],
  divider: spacing[8],
} as const;

/**
 * Indent levels for nested content
 */
export const indentWidth = spacing[6]; // 24px per level

// =============================================================================
// BORDERS & RADIUS
// =============================================================================

export const borderRadius = {
  none: "0",
  sm: "0.25rem",   // 4px
  md: "0.375rem",  // 6px
  lg: "0.5rem",    // 8px
} as const;

export const borderWidth = {
  DEFAULT: "1px",
  2: "2px",
} as const;

// =============================================================================
// CALLOUT STYLING
// =============================================================================

import type { CalloutIntent } from "./types";

/**
 * Get styles for a callout based on intent
 */
export function getCalloutStyles(intent: CalloutIntent) {
  const palette = colors.callout[intent];
  return {
    backgroundColor: palette.bg,
    borderColor: palette.border,
    borderWidth: borderWidth.DEFAULT,
    borderRadius: borderRadius.md,
    padding: spacing[4],
    iconColor: palette.icon,
    textColor: palette.text,
  };
}

/**
 * Callout intent labels for UI
 */
export const calloutLabels: Record<CalloutIntent, string> = {
  decision: "Decision",
  assumption: "Assumption",
  open_question: "Open Question",
  constraint: "Constraint",
  risk: "Risk",
};

/**
 * Callout intent icons (emoji for simplicity, could be SVG paths)
 */
export const calloutIcons: Record<CalloutIntent, string> = {
  decision: "✓",
  assumption: "○",
  open_question: "?",
  constraint: "◆",
  risk: "⚠",
};
