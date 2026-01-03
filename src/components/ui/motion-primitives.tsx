"use client";

import { motion, AnimatePresence, HTMLMotionProps, Variants, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import React from "react";

// Standard transition tokens
const springTransition = {
    type: "spring",
    stiffness: 300,
    damping: 30,
};

const smoothTransition = {
    type: "tween",
    ease: "easeInOut",
    duration: 0.3,
};

// -----------------------------------------------------------------------------
// Fade In
// -----------------------------------------------------------------------------
interface FadeInProps extends HTMLMotionProps<"div"> {
    delay?: number;
    duration?: number;
}

export function FadeIn({ children, className, delay = 0, duration = 0.4, ...props }: FadeInProps) {
    const shouldReduceMotion = useReducedMotion();
    const transition = shouldReduceMotion ? { duration: 0 } : { duration, delay, ease: "easeOut" };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition as any}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
}

// -----------------------------------------------------------------------------
// Slide In (Axis configurable)
// -----------------------------------------------------------------------------
interface SlideInProps extends HTMLMotionProps<"div"> {
    direction?: "up" | "down" | "left" | "right";
    delay?: number;
    distance?: number;
}

export function SlideIn({ children, className, direction = "up", delay = 0, distance = 20, ...props }: SlideInProps) {
    const shouldReduceMotion = useReducedMotion();

    // Calculate initial position based on direction and reduced motion preference
    // If reduced motion is preferred, start at 0,0 (no slide) but still fadeIn (opacity 0 -> 1)
    const initialY = shouldReduceMotion ? 0 : (direction === "up" ? distance : direction === "down" ? -distance : 0);
    const initialX = shouldReduceMotion ? 0 : (direction === "left" ? distance : direction === "right" ? -distance : 0);

    const variants: Variants = {
        hidden: {
            opacity: 0,
            y: initialY,
            x: initialX,
        },
        visible: {
            opacity: 1,
            y: 0,
            x: 0,
            transition: shouldReduceMotion ? { duration: 0 } : { ...springTransition, delay }
        },
        exit: {
            opacity: 0,
            y: initialY,
            x: initialX,
            transition: { duration: 0.2 }
        }
    } as any;

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={variants}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
}

// -----------------------------------------------------------------------------
// Scale In
// -----------------------------------------------------------------------------
export function ScaleIn({ children, className, delay = 0, ...props }: FadeInProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ ...springTransition, delay } as any}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
}

// -----------------------------------------------------------------------------
// Stagger Container
// -----------------------------------------------------------------------------
interface StaggerContainerProps extends HTMLMotionProps<"div"> {
    staggerDelay?: number;
}

export function StaggerContainer({ children, className, staggerDelay = 0.1, ...props }: StaggerContainerProps) {
    return (
        <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={{
                visible: { transition: { staggerChildren: staggerDelay } },
            } as any}
            className={className}
            {...props}
        >
            {children}
        </motion.div >
    );
}

export function StaggerItem({ children, className, ...props }: HTMLMotionProps<"div">) {
    const variants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: springTransition },
    };

    return (
        <motion.div variants={variants as any} className={className} {...props}>
            {children}
        </motion.div>
    );
}

// -----------------------------------------------------------------------------
// Micro Interaction Wrappers
// -----------------------------------------------------------------------------
export function HoverScale({ children, className, scale = 1.02, ...props }: HTMLMotionProps<"div"> & { scale?: number }) {
    return (
        <motion.div
            whileHover={{ scale }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className={cn("cursor-pointer", className)}
            {...props}
        >
            {children}
        </motion.div>
    );
}

export function TapScale({ children, className, ...props }: HTMLMotionProps<"div">) {
    return (
        <motion.div
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
}
