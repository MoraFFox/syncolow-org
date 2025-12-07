"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MoreHorizontal, ShoppingCart, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const BottomNavItem = ({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
}) => (
  <Link
    href={href}
    className={cn(
      "flex flex-col items-center justify-center gap-1 w-full h-full text-xs transition-colors",
      isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
    )}
  >
    <Icon className='h-5 w-5' />
    <span>{label}</span>
  </Link>
);

export function BottomNav({ onMoreClick }: { onMoreClick: () => void }) {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/clients", label: "Clients", icon: Users },
    { href: "/orders", label: "Orders", icon: ShoppingCart },
  ];

  return (
    <nav className='fixed bottom-0 left-0 right-0 h-16 bg-background border-t z-20 md:hidden'>
      <div className='flex items-stretch justify-around h-full'>
        {navItems.map((item) => (
          <BottomNavItem
            key={item.href}
            {...item}
            isActive={pathname.startsWith(item.href)}
          />
        ))}
        <button
          onClick={onMoreClick}
          className='flex flex-col items-center justify-center gap-1 w-full h-full text-xs text-muted-foreground hover:text-primary transition-colors'
        >
          <MoreHorizontal className='h-5 w-5' />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
