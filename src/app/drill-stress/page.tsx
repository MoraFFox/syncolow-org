'use client';

import React, { useState } from 'react';
import { DrillTarget } from '@/components/drilldown/drill-target';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function DrillStressPage() {
    const [count, setCount] = useState(1000);
    const [mounted, setMounted] = useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const items = Array.from({ length: count }).map((_, i) => ({
        id: `stress-item-${i}`,
        value: `Item ${i}`,
        kind: (i % 3 === 0 ? 'product' : i % 3 === 1 ? 'order' : 'company') as 'product' | 'order' | 'company'
    }));

    if (!mounted) return <div className="p-10">Loading stress test...</div>;

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Drilldown Stress Test</h1>
                    <p className="text-muted-foreground">
                        Rendering {count} interactive drill targets. Open Network tab to monitor prefetching.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setCount(500)} variant="outline">500 Items</Button>
                    <Button onClick={() => setCount(1000)} variant="outline">1k Items</Button>
                    <Button onClick={() => setCount(2500)} variant="outline">2.5k Items</Button>
                </div>
            </div>

            <Card className="p-6">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
                    {items.map((item) => (
                        <DrillTarget
                            key={item.id}
                            kind={item.kind}
                            payload={{ id: item.id, value: item.value }}
                            className="p-4 border rounded hover:bg-muted/50 transition-colors text-sm truncate"
                        >
                            {item.value} ({item.kind})
                        </DrillTarget>
                    ))}
                </div>
            </Card>
        </div>
    );
}
