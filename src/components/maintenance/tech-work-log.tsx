"use client";

import { useState, useEffect } from "react";
import { useMaintenanceStore } from "@/store/use-maintenance-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Mic,
    Camera,
    CheckSquare,
    MessageSquare,
    Save,
    AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MaintenanceVisit } from "@/lib/types";

interface WorkLogProps {
    visit: MaintenanceVisit;
    onUpdate: (data: Partial<MaintenanceVisit>) => Promise<void>;
}

export function WorkLog({ visit, onUpdate }: WorkLogProps) {
    const { problemsCatalog } = useMaintenanceStore();
    const [report, setReport] = useState(visit.overallReport || "");
    const [recommendations, setRecommendations] = useState(visit.baristaRecommendations || "");
    const [selectedProblems, setSelectedProblems] = useState<string[]>(visit.problemReason || []);
    const [resolution, setResolution] = useState(visit.resolutionStatus || "solved");
    const [nonResolutionReason, setNonResolutionReason] = useState(visit.nonResolutionReason || "");
    const [isSaving, setIsSaving] = useState(false);

    // Debounced save or manual save? For tech mode, manual "Save Progress" is often safer + auto-save on unmount

    const handleSave = async () => {
        setIsSaving(true);
        await onUpdate({
            overallReport: report,
            baristaRecommendations: recommendations,
            problemReason: selectedProblems,
            resolutionStatus: resolution as any,
            nonResolutionReason: resolution !== 'solved' ? nonResolutionReason : undefined
        });
        setIsSaving(false);
    };

    const toggleProblem = (problem: string) => {
        if (selectedProblems.includes(problem)) {
            setSelectedProblems(selectedProblems.filter(p => p !== problem));
        } else {
            setSelectedProblems([...selectedProblems, problem]);
        }
    };

    return (
        <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-2">

            {/* Resolution Status */}
            <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Resolution Status</Label>
                <div className="grid grid-cols-2 gap-2">
                    {['solved', 'partial', 'waiting_parts', 'not_solved'].map((status) => (
                        <div
                            key={status}
                            onClick={() => setResolution(status as any)}
                            className={cn(
                                "border rounded-xl p-3 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all",
                                resolution === status
                                    ? "bg-primary/10 border-primary text-primary"
                                    : "bg-card hover:bg-muted"
                            )}
                        >
                            <span className="capitalize font-medium text-sm">{status.replace('_', ' ')}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Non-Resolution Reason (Conditional) */}
            {resolution !== 'solved' && (
                <div className="space-y-2 animate-in zoom-in-95">
                    <Label className="text-xs uppercase tracking-wider text-red-500 font-semibold flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Why wasn't it solved?
                    </Label>
                    <Textarea
                        placeholder="e.g. Need special tool, access denied..."
                        value={nonResolutionReason}
                        onChange={(e) => setNonResolutionReason(e.target.value)}
                        className="bg-red-50/50 border-red-100 dark:bg-red-950/10 dark:border-red-900/50"
                    />
                </div>
            )}

            {/* Common Problems Checklist */}
            <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" />
                    Identified Issues
                </Label>
                <div className="flex flex-wrap gap-2">
                    {problemsCatalog.map((item) => (
                        <Badge
                            key={item.id}
                            variant={selectedProblems.includes(item.problem) ? "default" : "outline"}
                            className={cn(
                                "cursor-pointer px-3 py-1.5 text-sm font-normal rounded-full transition-all active:scale-95 select-none",
                                !selectedProblems.includes(item.problem) && "opacity-70 hover:opacity-100 bg-background"
                            )}
                            onClick={() => toggleProblem(item.problem)}
                        >
                            {item.problem}
                        </Badge>
                    ))}
                    {/* Add One-off Logic could go here */}
                </div>
            </div>

            {/* Work Performed */}
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Work Performed
                    </Label>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-muted/50">
                            <Mic className="h-4 w-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-muted/50">
                            <Camera className="h-4 w-4 text-primary" />
                        </Button>
                    </div>
                </div>
                <Textarea
                    placeholder="Describe the work done..."
                    className="min-h-[120px] text-base"
                    value={report}
                    onChange={(e) => setReport(e.target.value)}
                />
            </div>

            {/* Recommendations */}
            <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Recommendations</Label>
                <Textarea
                    placeholder="Any notes for the barista or future visits?"
                    value={recommendations}
                    onChange={(e) => setRecommendations(e.target.value)}
                />
            </div>

            {/* Floating Save Button */}
            <Button
                onClick={handleSave}
                disabled={isSaving}
                className={cn(
                    "w-full h-12 text-lg shadow-lg transition-all",
                    isSaving ? "opacity-80" : "hover:scale-[1.02]"
                )}
            >
                {isSaving ? "Saving..." : "Save Work Log"}
            </Button>
        </div>
    );
}
