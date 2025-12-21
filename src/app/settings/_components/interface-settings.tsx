"use client";

import { useDrillSettings } from "@/store/use-drill-settings";
import { useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { HelpCircle } from "lucide-react";
import { DrilldownHelpDialog } from "@/components/drilldown/drilldown-help-dialog";

export function InterfaceSettings() {
    const {
        settings,
        setHoverDelay,
        togglePreviews,
        setVisualStyle,
        toggleQuietMode,
        setPreviewSize,
        setPreviewTheme,

    } = useDrillSettings();

    const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);

    return (
        <div className='flex flex-col gap-6'>
            <Card data-testid="drilldown-settings-card">
                <CardHeader className='flex flex-row items-center justify-between'>
                    <div>
                        <CardTitle>Drilldown Experience</CardTitle>
                        <CardDescription>
                            Customize hover previews and navigation behavior.{" "}
                            <Button
                                variant='link'
                                className='p-0 h-auto text-sm'
                                onClick={() => setIsHelpDialogOpen(true)}
                            >
                                Learn more
                            </Button>
                        </CardDescription>
                    </div>
                    <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => setIsHelpDialogOpen(true)}
                        aria-label='Drilldown help'
                    >
                        <HelpCircle className='h-4 w-4' />
                    </Button>
                </CardHeader>
                <CardContent className='space-y-6'>
                    {/* Enable/Disable Previews */}
                    <div className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
                            <Label>Enable Hover Previews</Label>
                            <p className='text-sm text-muted-foreground'>
                                Show preview cards when hovering over drilldown targets.
                            </p>
                        </div>
                        <Switch
                            checked={settings.previewsEnabled}
                            onCheckedChange={togglePreviews}
                        />
                    </div>

                    {/* Quiet Mode Toggle */}
                    <div className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
                            <Label>Quiet Mode</Label>
                            <p className='text-sm text-muted-foreground'>
                                Disable automatic pinning of previews after 3 seconds.
                            </p>
                        </div>
                        <Switch
                            checked={settings.quietMode}
                            onCheckedChange={toggleQuietMode}
                            disabled={!settings.previewsEnabled}
                        />
                    </div>

                    {/* Hover Delay Slider */}
                    <div className='space-y-2'>
                        <div className='flex items-center justify-between'>
                            <Label>Hover Delay</Label>
                            <span className='text-sm text-muted-foreground'>
                                {settings.hoverDelay}ms
                            </span>
                        </div>
                        <Slider
                            value={[settings.hoverDelay]}
                            onValueChange={([value]) => setHoverDelay(value)}
                            min={200}
                            max={1000}
                            step={100}
                            disabled={!settings.previewsEnabled}
                            className='w-full'
                        />
                        <p className='text-xs text-muted-foreground'>
                            Adjust how quickly previews appear (200ms = instant, 1000ms =
                            delayed).
                        </p>
                    </div>

                    {/* Preview Size Select */}
                    <div className='space-y-2'>
                        <Label>Preview Size</Label>
                        <Select
                            value={settings.previewSize}
                            onValueChange={(value) =>
                                setPreviewSize(value as "compact" | "normal" | "expanded")
                            }
                            disabled={!settings.previewsEnabled}
                        >
                            <SelectTrigger className='w-full md:w-1/2'>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value='compact'>Compact (minimal info)</SelectItem>
                                <SelectItem value='normal'>Normal (balanced)</SelectItem>
                                <SelectItem value='expanded'>Expanded (full details)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className='text-sm text-muted-foreground'>
                            Control how much information is shown in preview cards.
                        </p>
                    </div>

                    {/* Preview Theme Select */}
                    <div className='space-y-2'>
                        <Label>Preview Theme</Label>
                        <Select
                            value={settings.previewTheme}
                            onValueChange={(value) =>
                                setPreviewTheme(value as "default" | "glass" | "solid")
                            }
                            disabled={!settings.previewsEnabled}
                        >
                            <SelectTrigger className='w-full md:w-1/2'>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value='default'>Default (semi-transparent)</SelectItem>
                                <SelectItem value='glass'>Glass (frosted blur)</SelectItem>
                                <SelectItem value='solid'>Solid (opaque colors)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className='text-sm text-muted-foreground'>
                            Choose the visual style for preview cards.
                        </p>
                    </div>

                    {/* Visual Style Select */}
                    <div className='space-y-2'>
                        <Label>Visual Style</Label>
                        <Select
                            value={settings.visualStyle}
                            onValueChange={(value) =>
                                setVisualStyle(value as "subtle" | "normal" | "prominent")
                            }
                        >
                            <SelectTrigger className='w-full md:w-1/2'>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value='subtle'>Subtle (cursor only)</SelectItem>
                                <SelectItem value='normal'>
                                    Normal (dotted underline)
                                </SelectItem>
                                <SelectItem value='prominent'>
                                    Prominent (bold underline)
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p className='text-sm text-muted-foreground'>
                            Control how drilldown targets are visually indicated.
                        </p>
                    </div>


                </CardContent>
            </Card>

            <DrilldownHelpDialog
                isOpen={isHelpDialogOpen}
                onOpenChange={setIsHelpDialogOpen}
            />
        </div>
    );
}
