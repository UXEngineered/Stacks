"use client";

/**
 * TorusAnimation — A 3D torus rendered with cross-stitch X glyphs.
 *
 * Each surface sample is drawn as a small "×" whose opacity is driven
 * by the surface normal's alignment with the light direction, creating
 * a dithered 3D rotation effect.
 *
 * Tunable props:
 *   color        — glyph color (default: brand purple)
 *   bgColor      — canvas background (default: transparent)
 *   size         — canvas width & height in px
 *   speed        — rotation speed multiplier (1 = default)
 *   glyphSpacing — distance between glyph sample points (smaller = denser)
 *   glyphSize    — size of each × stroke
 */

import { useEffect, useRef, useCallback } from "react";

interface TorusAnimationProps {
  /** Glyph color — any CSS color string */
  color?: string;
  /** Canvas background — use "transparent" for no background */
  bgColor?: string;
  /** Canvas width & height in px */
  size?: number;
  /** Rotation speed multiplier (1 = calm default) */
  speed?: number;
  /** Grid spacing between glyph centers in px */
  glyphSpacing?: number;
  /** Half-length of each × arm in px */
  glyphSize?: number;
  /** Line width of each × stroke */
  glyphWeight?: number;
}

// ─── 3D math helpers ──────────────────────────────────────────────────────────

function rotateX(x: number, y: number, z: number, a: number) {
  const cos = Math.cos(a), sin = Math.sin(a);
  return [x, y * cos - z * sin, y * sin + z * cos] as const;
}

function rotateY(x: number, y: number, z: number, a: number) {
  const cos = Math.cos(a), sin = Math.sin(a);
  return [x * cos + z * sin, y, -x * sin + z * cos] as const;
}

function rotateZ(x: number, y: number, z: number, a: number) {
  const cos = Math.cos(a), sin = Math.sin(a);
  return [x * cos - y * sin, x * sin + y * cos, z] as const;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TorusAnimation({
  color = "#8b5cf6",
  bgColor = "transparent",
  size = 220,
  speed = 1,
  glyphSpacing = 10,
  glyphSize = 3.2,
  glyphWeight = 1.4,
}: TorusAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, t: number) => {
      const w = size;
      const h = size;
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

      ctx.clearRect(0, 0, w * dpr, h * dpr);

      if (bgColor !== "transparent") {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w * dpr, h * dpr);
      }

      // Torus parameters (proportional to canvas size)
      // Max extent = (R + r) * scale must fit within w/2
      // With R=1.0, r=0.4 → max = 1.4 * scale ≤ w * 0.46 → safe
      const scale = w * 0.32;
      const R = 1.0;  // major radius
      const r = 0.4;  // minor radius

      // Rotation angles — slow tumble on multiple axes
      const time = t * 0.0005 * speed;
      const ax = time * 0.7;
      const ay = time * 1.0;
      const az = time * 0.3;

      // Light direction (normalized, from upper-left-front)
      const lx = -0.4, ly = -0.6, lz = 0.7;

      // Sample density on the torus surface — scale with canvas size
      const uSteps = w < 60 ? 40 : 80;
      const vSteps = w < 60 ? 20 : 40;
      const du = (2 * Math.PI) / uSteps;
      const dv = (2 * Math.PI) / vSteps;

      // Z-buffer: grid of glyphs
      const cols = Math.ceil((w * dpr) / glyphSpacing);
      const rows = Math.ceil((h * dpr) / glyphSpacing);
      const zBuf = new Float64Array(cols * rows).fill(-Infinity);
      const lumBuf = new Float64Array(cols * rows).fill(0);

      const cx = (w * dpr) / 2;
      const cy = (h * dpr) / 2;

      // Sample torus surface and project
      for (let ui = 0; ui < uSteps; ui++) {
        const u = ui * du;
        const cosU = Math.cos(u), sinU = Math.sin(u);

        for (let vi = 0; vi < vSteps; vi++) {
          const v = vi * dv;
          const cosV = Math.cos(v), sinV = Math.sin(v);

          // Point on torus
          let px = (R + r * cosV) * cosU;
          let py = (R + r * cosV) * sinU;
          let pz = r * sinV;

          // Normal at this point
          let nx = cosV * cosU;
          let ny = cosV * sinU;
          let nz = sinV;

          // Rotate point
          [px, py, pz] = rotateX(px, py, pz, ax);
          [px, py, pz] = rotateY(px, py, pz, ay);
          [px, py, pz] = rotateZ(px, py, pz, az);

          // Rotate normal
          [nx, ny, nz] = rotateX(nx, ny, nz, ax);
          [nx, ny, nz] = rotateY(nx, ny, nz, ay);
          [nx, ny, nz] = rotateZ(nx, ny, nz, az);

          // Diffuse lighting
          const luminance = Math.max(0, nx * lx + ny * ly + nz * lz);

          // Project to 2D (orthographic)
          const screenX = cx + px * scale * dpr;
          const screenY = cy + py * scale * dpr;

          // Snap to glyph grid
          const col = Math.round(screenX / glyphSpacing);
          const row = Math.round(screenY / glyphSpacing);

          if (col < 0 || col >= cols || row < 0 || row >= rows) continue;

          const idx = row * cols + col;

          // Z-buffer test (use pz for depth)
          if (pz > zBuf[idx]) {
            zBuf[idx] = pz;
            lumBuf[idx] = luminance;
          }
        }
      }

      // ── Parse the base color into RGB components ─────────────
      // Supports hex (#rgb, #rrggbb) and falls back to white
      let baseR = 229, baseG = 229, baseB = 229;
      if (color.startsWith("#")) {
        const hex = color.slice(1);
        if (hex.length === 3) {
          baseR = parseInt(hex[0] + hex[0], 16);
          baseG = parseInt(hex[1] + hex[1], 16);
          baseB = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
          baseR = parseInt(hex.slice(0, 2), 16);
          baseG = parseInt(hex.slice(2, 4), 16);
          baseB = parseInt(hex.slice(4, 6), 16);
        }
      }

      // ── Quantized 3-tier dither palette ──────────────────────
      // Instead of smooth interpolation, snap luminance into 3 distinct
      // bands: dark (edge), mid (transition), bright (front-facing).
      // This creates the segmented cross-stitch look.
      //
      // Tier 1 (dark):  ~20% brightness of base color, low opacity
      // Tier 2 (mid):   ~55% brightness of base color, medium opacity
      // Tier 3 (bright): full base color, full opacity

      const tiers = [
        { minLum: 0.00, maxLum: 0.25, r: Math.round(baseR * 0.18), g: Math.round(baseG * 0.18), b: Math.round(baseB * 0.18), alpha: 0.35 },
        { minLum: 0.25, maxLum: 0.55, r: Math.round(baseR * 0.50), g: Math.round(baseG * 0.50), b: Math.round(baseB * 0.50), alpha: 0.65 },
        { minLum: 0.55, maxLum: 1.01, r: baseR, g: baseG, b: baseB, alpha: 1.0 },
      ];

      // Draw glyphs — quantized into color tiers
      ctx.lineCap = "round";
      ctx.lineWidth = glyphWeight * dpr;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const idx = row * cols + col;
          const lum = lumBuf[idx];

          if (lum <= 0.01) continue;

          // Find which tier this luminance falls into
          const tier = tiers.find((t) => lum >= t.minLum && lum < t.maxLum) || tiers[2];

          const gx = col * glyphSpacing;
          const gy = row * glyphSpacing;
          const gs = glyphSize * dpr;

          ctx.globalAlpha = tier.alpha;
          ctx.strokeStyle = `rgb(${tier.r},${tier.g},${tier.b})`;

          // Draw ×
          ctx.beginPath();
          ctx.moveTo(gx - gs, gy - gs);
          ctx.lineTo(gx + gs, gy + gs);
          ctx.moveTo(gx + gs, gy - gs);
          ctx.lineTo(gx - gs, gy + gs);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;
    },
    [size, bgColor, color, speed, glyphSpacing, glyphSize, glyphWeight]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;

    const loop = (t: number) => {
      if (!running) return;
      draw(ctx, t);
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [size, draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}
