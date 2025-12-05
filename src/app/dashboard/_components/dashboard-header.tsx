"use client";

import { useEffect, useState } from "react";
import { RefreshIndicator } from "./refresh-indicator";

interface DashboardHeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  userName?: string;
  lastUpdated?: Date;
}

export function DashboardHeader({ onRefresh, isRefreshing, userName = "User", lastUpdated }: DashboardHeaderProps) {
  const [greeting, setGreeting] = useState("Good morning");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">
          {greeting}, {userName}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your business today.
        </p>
      </div>
      <div>
        <RefreshIndicator lastUpdated={lastUpdated} onRefresh={onRefresh} isRefreshing={isRefreshing} compact />
      </div>
    </div>
  );
}
