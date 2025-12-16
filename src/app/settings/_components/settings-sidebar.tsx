"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SettingsSidebarProps {
    items: {
        title: string;
        value: string;
        icon?: React.ReactNode;
    }[];
    activeTab: string;
    onTabChange: (value: string) => void;
}

export function SettingsSidebar({ items, activeTab, onTabChange }: SettingsSidebarProps) {
    return (
        <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
            {items.map((item) => (
                <Button
                    key={item.value}
                    variant="ghost"
                    className={cn(
                        "justify-start hover:bg-muted font-medium",
                        activeTab === item.value
                            ? "bg-muted hover:bg-muted"
                            : "text-muted-foreground"
                    )}
                    onClick={() => onTabChange(item.value)}
                >
                    {item.icon && <span className="mr-2">{item.icon}</span>}
                    {item.title}
                </Button>
            ))}
        </nav>
    );
}
