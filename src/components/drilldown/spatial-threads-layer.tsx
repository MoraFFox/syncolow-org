"use client";

import * as React from "react";
import { useDrillUserData } from "@/store/use-drill-user-data";
import { motion } from "framer-motion";

import { useDrillSettings } from "@/store/use-drill-settings";

export function SpatialThreadsLayer() {
    const { pinnedPreviews } = useDrillUserData();
    const { settings } = useDrillSettings();

    if (settings.quietMode) return null;

    if (!pinnedPreviews || pinnedPreviews.length < 2) return null;

    // Generate connections
    // We want to connect items that are related.
    // 1. Same Company
    // 2. Parent-Child (Company -> Order)
    // 3. Same Type (maybe faint line?)

    const connections: Array<{
        id: string;
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        color: string;
        strength: number; // 1 = strong, 0.5 = weak
    }> = [];

    for (let i = 0; i < pinnedPreviews.length; i++) {
        for (let j = i + 1; j < pinnedPreviews.length; j++) {
            const a = pinnedPreviews[i];
            const b = pinnedPreviews[j];

            if (!a.position || !b.position) continue;

            let connected = false;
            let color = "stroke-border";
            let strength = 0.5;

            // Type-safe payload access
            const payA = a.payload as Record<string, unknown>;
            const payB = b.payload as Record<string, unknown>;

            // Check 1: Explicit ID match (Reference)
            // e.g. Order.companyId === Company.id
            if (a.kind === 'company' && (payB.companyId === payA.id)) {
                connected = true;
                color = "stroke-primary"; // Strong parent-child
                strength = 1;
            }
            else if (b.kind === 'company' && (payA.companyId === payB.id)) {
                connected = true;
                color = "stroke-primary";
                strength = 1;
            }
            // Check 2: Shared Parent
            else if (payA.companyId && payB.companyId && payA.companyId === payB.companyId) {
                connected = true;
                color = "stroke-muted-foreground"; // Sibling
                strength = 0.5;
            }

            if (connected) {
                connections.push({
                    id: `${a.id}-${b.id}`,
                    x1: a.position.x + 150, // improved anchor (width/2 approx)
                    y1: a.position.y + 50,  // improved anchor
                    x2: b.position.x + 150,
                    y2: b.position.y + 50,
                    color,
                    strength
                });
            }
        }
    }

    return (
        <svg className="fixed inset-0 pointer-events-none z-40 overflow-visible">
            {connections.map((conn) => (
                <motion.line
                    key={conn.id}
                    x1={conn.x1}
                    y1={conn.y1}
                    x2={conn.x2}
                    y2={conn.y2}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: conn.strength }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={conn.color}
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                />
            ))}
        </svg>
    );
}
