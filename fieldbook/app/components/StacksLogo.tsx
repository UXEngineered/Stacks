"use client";

import { useState } from "react";

/**
 * StacksLogo - Animated logo with staggered ellipses
 * 
 * Features a wave animation where ellipses flop from right to left
 * in a staggered pattern, creating a dynamic visual effect.
 * 
 * On hover: transitions to perfect concentric circles (chain/freeze effect)
 */

interface StacksLogoProps {
  className?: string;
  size?: number;
  color?: string;
}

export function StacksLogo({ className = "", size = 16, color = "currentColor" }: StacksLogoProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Easing for smooth transitions
  const easing = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const duration = '400ms';
  
  // Circle radii - concentric when hovered
  const radii = [4, 7, 10];

  return (
    <svg 
      className={`cursor-pointer ${className}`}
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {radii.map((r, i) => (
        <ellipse
          key={i}
          cx="12"
          cy="12"
          rx={isHovered ? r : 3 + i * 3}
          ry={isHovered ? r : 9}
          stroke={color}
          strokeWidth={1.2}
          style={{
            transformOrigin: "12px 12px",
            transform: isHovered ? 'rotateY(0deg) rotateX(0deg)' : `rotateY(${-20 + i * 20}deg) rotateX(5deg)`,
            transition: `rx ${duration} ${easing}, ry ${duration} ${easing}, transform ${duration} ${easing}`,
            animationPlayState: isHovered ? 'paused' : 'running',
          }}
        />
      ))}
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
