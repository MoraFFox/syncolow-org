"use client";

import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Building, GitBranch, MoreHorizontal } from 'lucide-react';
import type { Company } from '@/lib/types';
import { cn } from '@/lib/utils';
import { PaymentScoreBadge } from '@/components/payment-score-badge';
import { Checkbox } from '@/components/ui/checkbox';

interface ListItem extends Company {
  depth: number;

    return (
        <>
            {renderMobileView()}
            {renderDesktopView()}
        </>
    );
}