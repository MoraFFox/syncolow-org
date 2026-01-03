"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock skills data for now since backend doesn't support it yet
const INITIAL_SKILLS = [
    'HVAC Repair', 'Electrical', 'Planned Maintenance', 'Customer Service'
];

interface CrewSkillsWidgetProps {
    className?: string;
    readOnly?: boolean;
}

export function CrewSkillsWidget({ className, readOnly = false }: CrewSkillsWidgetProps) {
    const [skills, setSkills] = useState<string[]>(INITIAL_SKILLS);
    const [newSkill, setNewSkill] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAddSkill = () => {
        if (newSkill.trim() && !skills.includes(newSkill.trim())) {
            setSkills([...skills, newSkill.trim()]);
            setNewSkill('');
            setIsAdding(false);
        }
    };

    const handleRemoveSkill = (skillToRemove: string) => {
        setSkills(skills.filter(s => s !== skillToRemove));
    };

    return (
        <Card className={cn("h-full", className)}>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div className="space-y-1">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Tag className="h-4 w-4 text-primary" /> Skills & Certifications
                        </CardTitle>
                        <CardDescription>
                            Competencies verified for this technician.
                        </CardDescription>
                    </div>
                    {!readOnly && !isAdding && (
                        <Button variant="ghost" size="sm" onClick={() => setIsAdding(true)}>
                            <Plus className="h-4 w-4" /> Add
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-2">
                    {skills.map(skill => (
                        <Badge key={skill} variant="secondary" className="px-2 py-1 flex items-center gap-1 hover:bg-secondary/80 transition-colors">
                            {skill}
                            {!readOnly && (
                                <button onClick={() => handleRemoveSkill(skill)} className="ml-1 text-muted-foreground hover:text-foreground">
                                    <X className="h-3 w-3" />
                                    <span className="sr-only">Remove {skill}</span>
                                </button>
                            )}
                        </Badge>
                    ))}
                    {skills.length === 0 && (
                        <span className="text-sm text-muted-foreground italic">No skills listed.</span>
                    )}
                </div>

                {isAdding && (
                    <div className="mt-4 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <Input
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            placeholder="Enter skill..."
                            className="h-8"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                            autoFocus
                        />
                        <Button size="sm" onClick={handleAddSkill} disabled={!newSkill.trim()}>Add</Button>
                        <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
