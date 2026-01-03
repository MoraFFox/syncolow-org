"use client";

import React from 'react';
import { MaintenanceEmployee, MaintenanceVisit } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress'; // Re-importing Progress as we'll use standard one here for now or standard bar style
import { Phone, Mail, MapPin, Calendar, Clock, Award, ShieldCheck, Edit } from 'lucide-react';

interface CrewProfileHeaderProps {
    employee: MaintenanceEmployee;
    activeVisits: MaintenanceVisit[];
    onEdit: () => void;
}

export function CrewProfileHeader({ employee, activeVisits, onEdit }: CrewProfileHeaderProps) {
    const activeCount = activeVisits.length;
    // Mock Availability Status
    const isAvailable = activeCount < 3;
    const statusColor = isAvailable ? "bg-green-500" : "bg-yellow-500";
    const statusText = isAvailable ? "Available for Dispatch" : "On High Load";

    // Initials
    const initials = employee.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <Card className="overflow-hidden border-t-4 border-t-primary">
            <div className="h-32 bg-gradient-to-r from-primary/10 via-primary/5 to-background w-full relative">
                <div className="absolute top-4 right-4">
                    <Button variant="outline" size="sm" className="bg-background/50 backdrop-blur-sm" onClick={onEdit}>
                        <Edit className="h-3.5 w-3.5 mr-2" /> Edit Profile
                    </Button>
                </div>
            </div>
            <CardContent className="px-6 relative">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Avatar overlapping the banner */}
                    <div className="-mt-12 relative flex-shrink-0">
                        <Avatar className="h-24 w-24 border-4 border-background bg-muted shadow-lg">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${employee.name}`} />
                            <AvatarFallback className="text-xl font-bold">{initials}</AvatarFallback>
                        </Avatar>
                        <div className={`absolute bottom-1 right-1 h-5 w-5 rounded-full border-2 border-background ${statusColor}`} title={statusText} />
                    </div>

                    {/* Info Section */}
                    <div className="pt-2 flex-grow space-y-2">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <div>
                                <h1 className="text-2xl font-bold">{employee.name}</h1>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                                    <span className="flex items-center gap-1">
                                        <Badge variant="outline" className="text-xs font-normal bg-primary/5 border-primary/20 text-primary">Senior Technician</Badge>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <ShieldCheck className="h-3.5 w-3.5 text-green-600" /> Verified
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5" /> 5+ Years Exp.
                                    </span>
                                </div>
                            </div>

                            {/* Quick Actions / Status */}
                            <div className="flex items-center gap-3">
                                <div className="text-right hidden md:block">
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Current Load</div>
                                    <div className="font-mono text-lg font-medium">{activeCount} <span className="text-xs text-muted-foreground">Active Jobs</span></div>
                                </div>
                            </div>
                        </div>

                        {/* Contact Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border/50">
                            <div className="flex items-center gap-3 text-sm">
                                <div className="p-2 rounded-full bg-accent/50">
                                    <Phone className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <div className="font-medium">Phone</div>
                                    <div className="text-muted-foreground">{employee.phone}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <div className="p-2 rounded-full bg-accent/50">
                                    <Mail className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <div className="font-medium">Email</div>
                                    <div className="text-muted-foreground">{employee.email || "N/A"}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <div className="p-2 rounded-full bg-accent/50">
                                    <MapPin className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <div className="font-medium">Base</div>
                                    <div className="text-muted-foreground">Main Workshop</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <div className="p-2 rounded-full bg-accent/50">
                                    <Award className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <div className="font-medium">Rating</div>
                                    <div className="text-muted-foreground">4.8 / 5.0</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
