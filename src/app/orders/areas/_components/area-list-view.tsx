'use client';

import { motion } from 'framer-motion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, MapPin } from 'lucide-react';
import { AreaStats } from '@/app/actions/orders/get-area-stats';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface AreaListViewProps {
    areas: AreaStats[];
    onEdit: (area: AreaStats) => void;
    onDelete: (area: AreaStats) => void;
}

export function AreaListView({ areas, onEdit, onDelete }: AreaListViewProps) {
    return (
        <div className="rounded-md border bg-card/50 backdrop-blur-sm overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead>Area Name</TableHead>
                        <TableHead>Schedule</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Clients</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {areas.map((area, index) => (
                        <TableRow
                            key={area.id}
                            className="group hover:bg-muted/30 transition-colors"
                        >
                            <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <MapPin className="h-4 w-4" />
                                    </div>
                                    <span className="text-base">{area.name}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="font-normal">
                                    Schedule {area.deliverySchedule}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                                {formatCurrency(area.totalRevenue)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                                {area.totalOrders}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                                {area.activeClients}
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(area)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => onDelete(area)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                    {areas.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                No areas found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
