'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MarqueeTextProps {
    children: React.ReactNode;
    className?: string;
    duration?: number;
    delay?: number;
}

export function MarqueeText({
    children,
    className,
    duration,
    delay = 0
}: MarqueeTextProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    // Convert children to string for dependency checking if possible, 
    // though ReactNode can be complex. We primarily care if the width changes.
    const contentKey = typeof children === 'string' || typeof children === 'number'
        ? String(children)
        : undefined;

    useEffect(() => {
        const checkOverflow = () => {
            if (containerRef.current && textRef.current) {
                // We add a small buffer (1px) to avoid rounding errors related to subpixel rendering
                setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth + 1);
            }
        };

        // Check immediately
        checkOverflow();

        // Check after a short delay to allow for layout shifts/fonts loading
        const timeoutId = setTimeout(checkOverflow, 100);

        window.addEventListener('resize', checkOverflow);
        return () => {
            window.removeEventListener('resize', checkOverflow);
            clearTimeout(timeoutId);
        };
    }, [contentKey, children]);

    // Calculate duration based on text length if not provided
    // Roughly 0.2s per character seems like a good baseline speed
    const calculatedDuration = duration || (
        textRef.current
            ? Math.max(5, textRef.current.scrollWidth * 0.02)
            : 10
    );

    return (
        <div
            ref={containerRef}
            className={cn("w-full overflow-hidden relative group/marquee cursor-default", className)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {isHovered && isOverflowing ? (
                <motion.div
                    className="flex whitespace-nowrap"
                    initial={{ x: 0 }}
                    animate={{ x: "-50%" }}
                    transition={{
                        repeat: Infinity,
                        ease: "linear",
                        duration: calculatedDuration,
                        delay: delay
                    }}
                    style={{ width: "fit-content" }}
                >
                    <span className="mr-8 flex items-center">{children}</span>
                    <span className="mr-8 flex items-center">{children}</span>
                </motion.div>
            ) : (
                <div className="truncate">
                    <span ref={textRef} className="inline-block">{children}</span>
                </div>
            )}
        </div>
    );
}
