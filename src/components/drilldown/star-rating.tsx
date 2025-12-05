"use client";

import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number; // 0-5
  max?: number;
  size?: "sm" | "md";
  className?: string;
}

export function StarRating({ rating, max = 5, size = "md", className }: StarRatingProps) {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = max - fullStars - (hasHalfStar ? 1 : 0);

  const sizeClass = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  for (let i = 0; i < fullStars; i++) {
    stars.push(<Star key={`full-${i}`} className={cn("fill-yellow-400 text-yellow-400", sizeClass)} />);
  }

  if (hasHalfStar) {
    stars.push(<StarHalf key="half" className={cn("fill-yellow-400 text-yellow-400", sizeClass)} />);
  }

  for (let i = 0; i < emptyStars; i++) {
    stars.push(<Star key={`empty-${i}`} className={cn("text-muted-foreground/30", sizeClass)} />);
  }

  return <div className={cn("flex items-center gap-0.5", className)}>{stars}</div>;
}
