"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
}

const MAX_PARTICLES = 60;

/**
 * Full-screen canvas of slowly drifting glowing dust, fixed behind all content.
 * Performance-minded: capped particle count, DPR-aware, rAF loop, resize-aware,
 * and a single static frame when the user prefers reduced motion.
 */
export default function ParticlesBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    const particles: Particle[] = [];

    const seed = () => {
      particles.length = 0;
      // ponytail: density scales with viewport area, capped at MAX_PARTICLES.
      const count = Math.min(
        MAX_PARTICLES,
        Math.round((width * height) / 26000)
      );
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.12,
          r: Math.random() * 1.6 + 0.4,
          a: Math.random() * 0.5 + 0.15,
        });
      }
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(47, 212, 255, ${p.a})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = "rgba(47, 212, 255, 0.6)";
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    };

    const step = () => {
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -2) p.x = width + 2;
        else if (p.x > width + 2) p.x = -2;
        if (p.y < -2) p.y = height + 2;
        else if (p.y > height + 2) p.y = -2;
      }
      draw();
      rafId = requestAnimationFrame(step);
    };

    let rafId = 0;
    resize();

    if (reduceMotion) {
      draw();
    } else {
      rafId = requestAnimationFrame(step);
    }

    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
