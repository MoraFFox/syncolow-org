'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  BookOpen,
  Zap,
  Keyboard,
  Eye,
  Smartphone,
  Bookmark,
  History,
  GitCompare,
  Pin,
  ExternalLink,
} from 'lucide-react'
import { DrilldownVisualLegend } from './drilldown-visual-legend'

interface DrilldownHelpDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function DrilldownHelpDialog({
  isOpen,
  onOpenChange,
}: DrilldownHelpDialogProps) {
  const handleViewDocs = () => {
    // Assuming DRILLDOWN_SYSTEM.md is hosted or link to GitHub
    window.open('/docs/DRILLDOWN_SYSTEM.md', '_blank')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Drilldown System Help
          </DialogTitle>
          <DialogDescription>
            Learn how to use the drilldown system to explore your data efficiently.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-1">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Features</span>
            </TabsTrigger>
            <TabsTrigger value="shortcuts" className="flex items-center gap-1">
              <Keyboard className="h-4 w-4" />
              <span className="hidden sm:inline">Shortcuts</span>
            </TabsTrigger>
            <TabsTrigger value="styles" className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Styles</span>
            </TabsTrigger>
            <TabsTrigger value="mobile" className="flex items-center gap-1">
              <Smartphone className="h-4 w-4" />
              <span className="hidden sm:inline">Mobile</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <p>
                The drilldown system lets you explore related data without losing context. Hover over any underlined element to see a preview, or click to view full details.
              </p>
              <p>
                This system supports 15 entity types including revenue, products, orders, customers, and more, with advanced features like bookmarks, history navigation, and mobile gestures.
              </p>
              <p>
                Customize your experience in the settings page, including hover delay, visual styles, and preview behavior.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                <Bookmark className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Bookmarks</h4>
                  <p className="text-sm text-muted-foreground">
                    Save frequently accessed drilldown views for quick access. Manage bookmarks in the drilldown panel.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tip: Use bookmarks to create shortcuts to important data views.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <History className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">History Navigation</h4>
                  <p className="text-sm text-muted-foreground">
                    Navigate through your drilldown history with Alt+Left/Right keys. See your browsing path in the history panel.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tip: Use history to backtrack through complex data explorations.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <GitCompare className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Compare Mode</h4>
                  <p className="text-sm text-muted-foreground">
                    Compare multiple entities side-by-side. Enable compare mode to select and analyze related items.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tip: Useful for analyzing trends across similar entities.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Pin className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Pinned Previews</h4>
                  <p className="text-sm text-muted-foreground">
                    Keep important previews visible while exploring other data. Pin previews to maintain context.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tip: Pin key metrics or reference data for ongoing analysis.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="shortcuts" className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shortcut</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+Click</kbd>
                  </TableCell>
                  <TableCell>Open in new tab</TableCell>
                  <TableCell>Open drilldown in a new browser tab</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">Alt+Left</kbd>
                  </TableCell>
                  <TableCell>Go back in history</TableCell>
                  <TableCell>Navigate to previous drilldown view</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">Alt+Right</kbd>
                  </TableCell>
                  <TableCell>Go forward in history</TableCell>
                  <TableCell>Navigate to next drilldown view</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">Escape</kbd>
                  </TableCell>
                  <TableCell>Close preview/dialog</TableCell>
                  <TableCell>Close current preview or dialog</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">Tab</kbd> / <kbd className="px-2 py-1 bg-muted rounded text-xs">Shift+Tab</kbd>
                  </TableCell>
                  <TableCell>Navigate between targets</TableCell>
                  <TableCell>Move focus between drilldown targets</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">Enter</kbd> / <kbd className="px-2 py-1 bg-muted rounded text-xs">Space</kbd>
                  </TableCell>
                  <TableCell>Activate focused target</TableCell>
                  <TableCell>Open drilldown for focused element</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="styles" className="space-y-4">
            <DrilldownVisualLegend />
          </TabsContent>

          <TabsContent value="mobile" className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <p>
                The drilldown system is fully optimized for mobile devices with touch-friendly gestures.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Long-press (500ms):</strong> Hold on any drilldown target to show a preview tooltip.
                </li>
                <li>
                  <strong>Swipe up:</strong> On a preview, swipe up to open the full drilldown view.
                </li>
                <li>
                  <strong>Swipe down:</strong> Swipe down on a preview or dialog to dismiss it.
                </li>
                <li>
                  <strong>Tap and hold:</strong> Use for accessing context menus on supported targets.
                </li>
              </ul>
              <p>
                All keyboard shortcuts work on mobile keyboards, and the interface adapts to smaller screens with stacked layouts and larger touch targets.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleViewDocs}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View Full Documentation
          </Button>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}