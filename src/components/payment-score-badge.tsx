/** @format */
"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface PaymentScoreBadgeProps {
  score: number;
  status?: "excellent" | "good" | "fair" | "poor" | "critical";
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
}

export function PaymentScoreBadge({
  score,
  status, // kept for compatibility but score drives the color mainly
  size = 32, // Compact default for lists
  strokeWidth = 3,
  showLabel = true,
  className,
}: PaymentScoreBadgeProps) {
  // Clamp score between 0 and 100
  const normalizedScore = Math.min(100, Math.max(0, score));

  // Tactical Geometry
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (normalizedScore / 100) * circumference;

  // Dynamic Color Logic (Green -> Red gradient)
  const getColor = (s: number) => {
    if (s >= 80) return "text-emerald-500";
    if (s >= 60) return "text-emerald-400"; // Slightly lighter for high-mid
    if (s >= 50) return "text-yellow-500";
    if (s >= 30) return "text-orange-500";
    return "text-rose-600";
  };

  const getGlowColor = (s: number) => {
    if (s >= 80) return "shadow-emerald-500/20";
    if (s >= 60) return "shadow-emerald-400/20";
    if (s >= 50) return "shadow-yellow-500/20";
    if (s >= 30) return "shadow-orange-500/20";
    return "shadow-rose-600/20";
  };

  const strokeColor = getColor(normalizedScore);
  const glowShadow = getGlowColor(normalizedScore);

  // Pulse configuration
  // We create a short dash that travels along the same path length as the score
  const pulseLength = radius * 1.5; // Length of the pulse "head"
  const pulseDashArray = `${pulseLength} ${circumference}`;

  return (
    <div
      className={cn("relative flex items-center justify-center font-mono select-none", className)}
      style={{ width: size, height: size }}
    >
      {/* Background Track */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90 pointer-events-none"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />

        {/* Animated Base Fill (The static score representation) */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn("transition-colors duration-500 ease-out", strokeColor)}
          initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />

        {/* The Pulse Wave (Travels from 0 to score) */}
        {normalizedScore > 0 && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="white"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="opacity-60 blur-[1px]"
            initial={{ rotate: 0, opacity: 0 }}
            animate={{
              rotate: 360 * (normalizedScore / 100),
              opacity: [0, 1, 1, 0] // Fade in, hold, fade out
            }}
            transition={{
              duration: 2,
              ease: "linear", // Constant speed
              repeat: Infinity,
              repeatDelay: 0 // No pause
            }}
            style={{
              strokeDasharray: `${0.1} ${circumference}`, // Dot/Small Dash
              strokeDashoffset: 0,
              originX: "50%",
              originY: "50%"
            }}
          />
        )}
      </svg>

      {/* Centered Score Label */}
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(
            "font-bold tracking-tighter leading-none transition-colors duration-500",
            strokeColor
          )}
            style={{ fontSize: size * 0.38 }}
          >
            {score}
          </span>
        </div>
      )}

      {/* Optional: Status Dot for icon-only mode */}
      {!showLabel && (
        <div className={cn("absolute w-2 h-2 rounded-full bg-current shadow-lg", strokeColor)} />
      )}
    </div>
  );
}
