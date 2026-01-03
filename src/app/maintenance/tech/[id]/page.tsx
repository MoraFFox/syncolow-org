"use client";

import { useEffect, useState, use } from "react";
import { useMaintenanceStore } from "@/store/use-maintenance-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    Play,
    Mic,
    Camera,
    CheckCircle,
    MapPin,
    Calendar,
    User,
    Clock,
    Box
} from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { MaintenanceVisit } from "@/lib/types";
import { PartsGridPicker } from "@/components/maintenance/parts-grid-picker";
import { WorkLog } from "@/components/maintenance/tech-work-log";

// Helper to simulate "Swipe to Confirm"
function SwipeButton({ onConfirm, label = "Slide to Start" }: { onConfirm: () => void, label?: string }) {
    const [dragX, setDragX] = useState(0);
    const [isConfirmed, setIsConfirmed] = useState(false);
    const maxWidth = 250; // approximate width of track

    const handleDrag = (e: React.DragEvent | React.TouchEvent) => {
        // Simplified drag logic for POC
        // In prod, use framer-motion or use-gesture
    }

    // For this milestone, we'll use a mocked "Hold to Confirm" or just a nice slider animation
    // simulated with a click for stability in this prompt context
    return (
        <div className="relative h-14 bg-muted rounded-full overflow-hidden select-none cursor-pointer group"
            onClick={() => { setIsConfirmed(true); setTimeout(onConfirm, 500); }}
        >
            <div
                className={cn(
                    "absolute left-0 top-0 bottom-0 bg-primary transition-all duration-500 flex items-center justify-center",
                    isConfirmed ? "w-full" : "w-14"
                )}
            >
                {isConfirmed ? <CheckCircle className="text-primary-foreground h-6 w-6" /> : <Play className="text-primary-foreground h-6 w-6" />}
            </div>
            <div className={cn("absolute inset-0 flex items-center justify-center text-sm font-medium transition-opacity", isConfirmed ? "opacity-0" : "opacity-100")}>
                {label}
            </div>
        </div>
    )
}

export default function TechTaskDetail({ params }: { params: Promise<{ id: string }> }) {
    // Unwrap params correctly for Next 15+
    const resolvedParams = use(params);
    const router = useRouter();
    const { maintenanceVisits, fetchInitialData, updateMaintenanceVisit } = useMaintenanceStore();
    const [visit, setVisit] = useState<MaintenanceVisit | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'work' | 'parts'>('overview');
    const [localParts, setLocalParts] = useState<{ name: string, quantity: number, price: number }[]>([]); // Temp state for picker

    useEffect(() => {
        const load = async () => {
            if (maintenanceVisits.length === 0) await fetchInitialData();
            const found = maintenanceVisits.find(v => v.id === resolvedParams.id);
            setVisit(found || null);
            if (found) {
                setLocalParts(found.spareParts?.map(p => ({
                    name: p.name,
                    quantity: p.quantity,
                    price: p.price || 0
                })) || []);
            }
        };
        load();
    }, [resolvedParams.id, maintenanceVisits, fetchInitialData]);

    const handlePartsChange = async (newParts: typeof localParts) => {
        setLocalParts(newParts);
        // Auto-save logic (Debounced ideally, but direct for now)
        if (visit) {
            const spareParts = newParts.map(p => ({
                id: crypto.randomUUID(), // New parts get new IDs, existing should strictly be tracked better but acceptable for POC
                name: p.name,
                price: p.price,
                quantity: p.quantity,
                paidBy: 'Client' as const // Default
            }));
            await updateMaintenanceVisit(visit.id, { spareParts });
        }
    };

    if (!visit) return <div className="p-8 text-center text-muted-foreground">Loading Task...</div>;

    const handleStartJob = async () => {
        await updateMaintenanceVisit(visit.id, { status: "In Progress" });
        // Optimistic update local state if needed
    };

    const handleCompleteJob = async () => {
        await updateMaintenanceVisit(visit.id, { status: "Completed", resolutionStatus: "solved" });
        router.push('/maintenance/tech');
    };

    return (
        <div className="bg-background min-h-screen pb-24">
            {/* Nav */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md p-4 flex items-center gap-4 border-b">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="font-semibold text-lg leading-none">Task #{visit.id.substring(0, 6)}</h1>
                    <span className="text-xs text-muted-foreground">{visit.branchName || visit.companyName}</span>
                </div>
                <Badge variant={visit.status === 'In Progress' ? 'default' : 'outline'}>
                    {visit.status}
                </Badge>
            </div>

            {/* Content Scroller */}
            <div className="p-4 space-y-6">

                {/* Status Hero */}
                {visit.status !== 'In Progress' && visit.status !== 'Completed' && (
                    <div className="bg-card border rounded-2xl p-6 shadow-sm text-center space-y-4">
                        <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary mb-2">
                            <Clock className="h-8 w-8" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Ready to Start?</h2>
                            <p className="text-muted-foreground text-sm">Scheduled for {format(new Date(visit.date), "h:mm a")}</p>
                        </div>
                        <SwipeButton onConfirm={handleStartJob} label="Swipe to Start Job" />
                    </div>
                )}

                {/* In Progress Controls */}
                {visit.status === 'In Progress' && (
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl border-dashed">
                            <Mic className="h-6 w-6 text-primary" />
                            <span>Add Voice Note</span>
                        </Button>
                        <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl border-dashed">
                            <Camera className="h-6 w-6 text-primary" />
                            <span>Take Photo</span>
                        </Button>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex p-1 bg-muted rounded-xl mb-4">
                    {['overview', 'work', 'parts'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={cn(
                                "flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize",
                                activeTab === tab ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Issue</h3>
                            <p className="text-base bg-muted/30 p-3 rounded-lg border">
                                {visit.maintenanceNotes || "No notes provided."}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Location</h3>
                            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border">
                                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">{visit.branchName || visit.companyName}</p>
                                    <p className="text-sm text-muted-foreground">{visit.address || "No address on file"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Work Log */}
                {activeTab === 'work' && (
                    <WorkLog
                        visit={visit}
                        onUpdate={async (data) => {
                            await updateMaintenanceVisit(visit.id, data);
                            // Optimistic update for local visit state (optional but good for UX)
                            setVisit({ ...visit, ...data });
                        }}
                    />
                )}

                {/* Parts Picker */}
                {activeTab === 'parts' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 pb-24">
                        <PartsGridPicker
                            currentParts={localParts}
                            onPartChange={handlePartsChange}
                        />
                    </div>
                )}
            </div>

            {/* Bottom Action Bar */}
            {visit.status === 'In Progress' && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t pb-8">
                    <Button className="w-full h-12 text-lg rounded-xl shadow-lg shadow-primary/20" onClick={handleCompleteJob}>
                        Complete Job
                    </Button>
                </div>
            )}
        </div>
    );
}
