"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type ChartType = "line" | "bar" | "area" | "donut";

interface MicroChartProps {
  data: number[];
  type?: ChartType;
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  className?: string;
  labels?: string[];
  showTooltip?: boolean;
}

export function MicroChart({
  data,
  type = "line",
  width = 100,
  height = 40,
  color = "#2563eb", // blue-600
  fill = false,
  className,
  labels,
}: MicroChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (data.length === 0) return;

    // Common variables
    const padding = 2;
    const drawHeight = height - padding * 2;
    const drawWidth = width;
    const max = Math.max(...data, 0); // Ensure 0 baseline
    const min = type === "line" || type === "area" ? Math.min(...data) : 0;
    const range = max - min || 1;

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    if (type === "donut") {
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(centerX, centerY) - padding;
      const total = data.reduce((a, b) => a + b, 0);
      let startAngle = -Math.PI / 2;

      data.forEach((val, i) => {
        const sliceAngle = (val / total) * 2 * Math.PI;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        
        // Generate variations of the color for different slices
        ctx.globalAlpha = 1 - (i * 0.15);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        
        // Draw white separator
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();

        startAngle += sliceAngle;
      });

      // Cut out center for donut
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
      ctx.fillStyle = "#ffffff"; // Assuming white background, ideally transparent or matching bg
      ctx.globalCompositeOperation = "destination-out";
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      return;
    }

    if (type === "bar") {
      const barWidth = (drawWidth / data.length) * 0.8;
      const gap = (drawWidth / data.length) * 0.2;
      
      data.forEach((val, i) => {
        const x = i * (barWidth + gap) + gap / 2;
        const normalizedH = (val / max) * drawHeight;
        const y = height - padding - normalizedH;
        
        ctx.fillStyle = color;
        ctx.fillRect(x, y, barWidth, normalizedH);
      });
      return;
    }

    // Line or Area
    const stepX = drawWidth / (data.length - 1 || 1);

    ctx.beginPath();
    data.forEach((val, i) => {
      const x = i * stepX;
      const normalizedY = (val - min) / range;
      const y = height - padding - (normalizedY * drawHeight);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    if (type === "area" || fill) {
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

  }, [data, type, width, height, color, fill]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={cn("block", className)}
      style={{ width, height }}
    />
  );
}
