"use client";

import { useEffect } from "react";
export function KeyboardQuickPeek() {

    useEffect(() => {
        // Should probably check if drilldown is effectively active or allowed?
        // Always active is fine for now.

        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for Alt + Number (1-9)
            if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
                const num = parseInt(e.key, 10);
                if (!isNaN(num) && num >= 1 && num <= 9) {
                    // Prevent browser defaults if necessary (Alt+Left/Right are Nav, but Numbers usually safe)
                    e.preventDefault();

                    // Index is 0-based, Key is 1-based
                    const index = num - 1;

                    // Dispatch Event
                    window.dispatchEvent(new CustomEvent('drill:quick-peek', { detail: { index } }));
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return null;
}
