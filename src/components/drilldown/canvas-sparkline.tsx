"use client";

import { useEffect, useRef } from "react";

interface CanvasSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  className?: string;
}

export function CanvasSparkline({
  data,
  width = 100,
  height = 30,
  color = "#2563eb", // blue-600
  fill = false,
  className,
}: CanvasSparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (data.length < 2) return;

    // Calculate scaling
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    // Add padding
    const padding = 2;
    const drawHeight = height - padding * 2;
    const drawWidth = width;

    const stepX = drawWidth / (data.length - 1);

    // Begin path
    ctx.beginPath();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = color;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // Draw lines
    data.forEach((val, i) => {
      const x = i * stepX;
      // Invert Y because canvas 0 is top
      const normalizedY = (val - min) / range;
      const y = height - padding - (normalizedY * drawHeight);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Fill area if requested
    if (fill) {
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
  }, [data, width, height, color, fill]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{ width, height }}
    />
  );
}
