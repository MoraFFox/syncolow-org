'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, MapPin, TrendingUp, Users, Package } from 'lucide-react';
import { AreaStats } from '@/app/actions/orders/get-area-stats';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { MarqueeText } from '@/components/ui/marquee-text';

interface AreaGridViewProps {
    areas: AreaStats[];
    onEdit: (area: AreaStats) => void;
    onDelete: (area: AreaStats) => void;
}

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            delay: i * 0.05,
            duration: 0.3,
            ease: "easeOut"
        }
    })
} as any;

export function AreaGridView({ areas, onEdit, onDelete }: AreaGridViewProps) {
    const router = useRouter();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {areas.map((area, index) => (
                <motion.div
                    key={area.id}
                    custom={index}
                    initial="hidden"
                    animate="visible"
                    variants={cardVariants}
                    layoutId={`area-card-${area.id}`}
                >
                    <Card className="h-full border-muted/40 hover:border-primary/50 transition-colors group relative overflow-hidden bg-gradient-to-br from-card to-card/50">
                        {/* Decorative background glow */}
                        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/5 blur-3xl group-hover:bg-primary/10 transition-all pointer-events-none" />

                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <CardTitle className="flex items-center gap-2 text-xl">
                                        <MapPin className="h-5 w-5 text-primary" />
                                        {area.name}
                                    </CardTitle>
                                    <div className="flex gap-2">
                                        <Badge variant="outline" className="text-xs bg-background/50 backdrop-blur-sm border-primary/20">
                                            Schedule {area.deliverySchedule}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(area)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => onDelete(area)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent>
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="space-y-1 min-w-0"> {/* min-w-0 necessary for grid items to truncate correctly */}
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <TrendingUp className="h-3 w-3" /> Revenue
                                    </p>
                                    <MarqueeText className="text-lg font-bold tracking-tight">
                                        {formatCurrency(area.totalRevenue)}
                                    </MarqueeText>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Package className="h-3 w-3" /> Orders
                                    </p>
                                    <p className="text-lg font-bold tracking-tight">
                                        {area.totalOrders}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Users className="h-3 w-3" /> Active Clients
                                    </p>
                                    <p className="text-lg font-bold tracking-tight">
                                        {area.activeClients}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Approx. AOV</p>
                                    <p className="text-sm font-medium">
                                        {formatCurrency(area.averageOrderValue)}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-border/50">
                                <Button
                                    variant="secondary"
                                    className="w-full text-xs h-8 bg-secondary/50 hover:bg-secondary"
                                    onClick={() => router.push(`/orders/areas/${area.id}`)}
                                >
                                    View Command Details
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
    );
}
