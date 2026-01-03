
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Wrench,
  Smile,
  Phone,
  Star,
  BarChart3,
  Tags,
  Building,
  ClipboardList,
  Upload,
  Settings,
  GitBranch,
  Bell,
  XCircle,
  Map,
  HardHat,
  CreditCard
} from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

const mainMenuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: BarChart3,
    subItems: [
      { href: '/analytics/cancellation', label: 'Cancellations', icon: XCircle },
      { href: '/analytics/notifications', label: 'Notifications', icon: Bell },
    ]
  },
  { href: '/clients', label: 'Companies', icon: Building },
  {
    href: '/products',
    label: 'Products',
    icon: Package,
    subItems: [
      { href: '/products/categories', label: 'Categories', icon: Tags },
    ]
  },
  {
    href: '/orders',
    label: 'Orders',
    icon: ShoppingCart,
    subItems: [
      { href: '/orders/areas', label: 'Areas', icon: Map },
    ]
  },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  {
    href: '/maintenance',
    label: 'Maintenance',
    icon: Wrench,
    subItems: [
      { href: '/maintenance/services', label: 'Services Catalog', icon: Tags },
    ]
  },
  { href: '/baristas', label: 'Baristas', icon: HardHat },
  { href: '/visits', label: 'Visits & Calls', icon: Phone },
  { href: '/feedback', label: 'Feedback', icon: Star },
];

const settingsMenuItem = { href: '/settings', label: 'Settings', icon: Settings };


export function MainNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col justify-between h-full p-2">
      <SidebarMenu>
        {mainMenuItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith(item.href) && (item.href === '/' ? pathname === '/' : true)}
              className="w-full"
            >
              <Link href={item.href}>
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
            {item.subItems && (
              <SidebarMenuSub>
                {item.subItems.map(subItem => (
                  <SidebarMenuSubItem key={subItem.href}>
                    <SidebarMenuSubButton asChild isActive={pathname.startsWith(subItem.href)}>
                      <Link href={subItem.href}>
                        <subItem.icon className="h-4 w-4" />
                        <span>{subItem.label}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            )}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>

      <div>
        <Separator className="my-2" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith(settingsMenuItem.href)}
              className="w-full"
            >
              <Link href={settingsMenuItem.href}>
                <settingsMenuItem.icon className="h-4 w-4" />
                <span>{settingsMenuItem.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </div>
  );
}
