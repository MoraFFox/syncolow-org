"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ScrollIndicatorProps {
  children: React.ReactNode;
  height: number;
  className?: string;
}

export function ScrollIndicator({
  children,
  height,
  className,
}: ScrollIndicatorProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [showTop, setShowTop] = useState(false);
  const [showBottom, setShowBottom] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const viewport = root.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLDivElement | null;
    if (!viewport) return;
    const handler = () => {
      setShowTop(viewport.scrollTop > 0);
      setShowBottom(
        viewport.scrollTop + viewport.clientHeight < viewport.scrollHeight
      );
    };
    handler();
    viewport.addEventListener("scroll", handler);
    return () => viewport.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className={cn("relative", className)} ref={rootRef}>
      {showTop && (
        <div className='pointer-events-none absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background to-transparent' />
      )}
      <ScrollArea className={cn("w-full", `h-[${height}px]`)}>
        {children}
      </ScrollArea>
      {showBottom && (
        <div className='pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent' />
      )}
    </div>
  );
}
