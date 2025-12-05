"use client";

import { cn } from "@/lib/utils";

import { ReactNode } from "react";

interface MiniTableProps {
  data: Record<string, ReactNode>[];
  columns?: { key: string; label?: string; align?: "left" | "right" | "center" }[];
  className?: string;
  limit?: number;
}

export function MiniTable({ data, columns, className, limit = 5 }: MiniTableProps) {
  if (!data || data.length === 0) return null;

  // Infer columns if not provided
  const cols = columns || Object.keys(data[0]).map(key => ({ key, label: key, align: "left" as const }));
  const displayData = data.slice(0, limit);

  return (
    <div className={cn("w-full overflow-hidden text-xs", className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/50">
            {cols.map((col) => (
              <th 
                key={col.key} 
                className={cn(
                  "py-1 px-1.5 font-medium text-muted-foreground uppercase tracking-wider text-[10px]",
                  col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                )}
              >
                {col.label || col.key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayData.map((row, i) => (
            <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
              {cols.map((col) => (
                <td 
                  key={col.key} 
                  className={cn(
                    "py-1.5 px-1.5 truncate max-w-[120px]",
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                  )}
                >
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
