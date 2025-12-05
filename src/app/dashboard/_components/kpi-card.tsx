import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  loading?: boolean;
  variant?: "default" | "destructive" | "success" | "warning" | "info";
  className?: string;
}

const variantStyles = {
  default: "border-border",
  destructive: "border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900",
  success: "border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-900",
  warning: "border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-900",
  info: "border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-900",
};

const iconStyles = {
  default: "text-muted-foreground",
  destructive: "text-red-600 dark:text-red-400",
  success: "text-green-600 dark:text-green-400",
  warning: "text-orange-600 dark:text-orange-400",
  info: "text-blue-600 dark:text-blue-400",
};

export function KpiCard({
  title,
  value,
  icon: Icon,
  loading = false,
  variant = "default",
  className,
}: KpiCardProps) {
  return (
    <Card className={cn("transition-all duration-200 hover:shadow-md", variantStyles[variant], className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", iconStyles[variant])} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className={cn("text-2xl font-bold", iconStyles[variant])}>{value}</div>
        )}
      </CardContent>
    </Card>
  );
}
