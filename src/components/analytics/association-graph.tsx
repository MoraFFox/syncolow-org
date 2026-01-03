'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssociationNode, AssociationLink } from "@/app/actions/analytics/types";
import { ResponsiveContainer, Sankey, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { Share2 } from "lucide-react";

interface AssociationGraphProps {
    data?: { nodes: AssociationNode[], links: AssociationLink[] };
    className?: string;
    loading?: boolean;
}

export function AssociationGraph({ data, className, loading }: AssociationGraphProps) {
    if (loading || !data) {
        return (
            <Card className={cn("bg-zinc-950 border-zinc-800", className)}>
                <div className="h-[300px] flex items-center justify-center animate-pulse">
                    <Share2 className="h-8 w-8 text-zinc-700" />
                </div>
            </Card>
        );
    }

    // Transform for Recharts Sankey (It's the closest to a network graph in Recharts standard suite)
    // Or we stick to a simple node-link viz using custom SVG if we want force-directed physics
    // For simplicity and "Ultramode" rigidity, a Chord-like Sankey flow is cleaner.

    // Constraint: Recharts Sankey requires strict index-based links. 
    // We map node IDs to indices.
    const nodeMap = new Map<string, number>();
    data.nodes.forEach((n, i) => nodeMap.set(n.id, i));

    const sankeyData = {
        nodes: data.nodes.map(n => ({ name: n.name })),
        links: data.links.map(l => ({
            source: nodeMap.get(l.source) || 0,
            target: nodeMap.get(l.target) || 0,
            value: l.value
        }))
    };

    return (
        <Card className={cn("bg-zinc-950/50 border-zinc-800/50 backdrop-blur-sm relative overflow-hidden", className)}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400 tracking-wider uppercase font-mono flex items-center gap-2">
                    <Share2 className="h-4 w-4" /> Association Cloud
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <Sankey
                            data={sankeyData}
                            node={{ stroke: 'none', fill: '#3b82f6', width: 10 }}
                            link={{ stroke: '#3b82f6', strokeOpacity: 0.2 }}
                            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                        >
                            <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#e4e4e7', fontSize: '12px', fontFamily: 'monospace' }} />
                        </Sankey>
                    </ResponsiveContainer>
                </div>
                <div className="text-center mt-2 text-[10px] text-zinc-600 font-mono">
                    High Co-occurrence Probability Path
                </div>
            </CardContent>
        </Card>
    );
}
