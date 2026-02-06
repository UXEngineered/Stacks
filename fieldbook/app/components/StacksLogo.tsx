"use client";

/**
 * StacksLogo - Animated logo with staggered ellipses
 * 
 * Features a wave animation where ellipses flop from right to left
 * in a staggered pattern, creating a dynamic visual effect.
 */

interface StacksLogoProps {
  className?: string;
  size?: number;
  color?: string;
}

export function StacksLogo({ className = "", size = 16, color = "currentColor" }: StacksLogoProps) {
  // 3 ellipses with staggered animation delays
  const delays = ["0s", "0.3s", "0.6s"];

  return (
    <svg 
      className={className}
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none"
    >
      {delays.map((delay, i) => (
        <ellipse
          key={i}
          cx="12"
          cy="12"
          rx={3 + i * 3}
          ry="9"
          stroke={color}
          strokeWidth={1.2}
          style={{
            transformOrigin: "12px 12px",
            animation: `stacksFlop 5s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite`,
            animationDelay: delay,
          }}
        />
      ))}
      <style jsx global>{`
        @keyframes stacksFlop {
          0%, 100% {
            transform: rotateY(0deg) rotateX(5deg);
          }
          50% {
            transform: rotateY(180deg) rotateX(-5deg);
          }
        }
      `}</style>
    </svg>
  );
}

export function StacksLogoStatic({ className = "", size = 16, color = "currentColor" }: StacksLogoProps) {
  return (
    <svg 
      className={className}
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none"
    >
      {[0, 1, 2].map((i) => (
        <ellipse
          key={i}
          cx="12"
          cy="12"
          rx={3 + i * 3}
          ry="9"
          stroke={color}
          strokeWidth={1.2}
          style={{
            transformOrigin: "12px 12px",
            transform: `rotateY(${-20 + i * 10}deg)`,
          }}
        />
      ))}
    </svg>
  );
}
