'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useDrillDownStore } from '@/store/use-drilldown-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { GraduationCap, MousePointer, Eye, Settings, Keyboard, Bookmark, CheckCircle, ArrowLeft, ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TourStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void;
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to the Drilldown System!',
    description: 'Let\'s take a quick tour to help you get started with exploring data seamlessly.',
    position: 'center',
  },
  {
    id: 'drill-targets',
    title: 'Drilldown Targets',
    description: 'Hover over underlined elements to see quick previews, or click to open full details.',
    targetSelector: '[data-drill-target]:first-of-type',
    position: 'bottom',
  },
  {
    id: 'preview',
    title: 'Preview Tooltips',
    description: 'Previews show key information instantly. Use quick actions or click for more details.',
    targetSelector: '[data-drill-target]:first-of-type',
    position: 'right',
  },
  {
    id: 'settings',
    title: 'Customize Your Experience',
    description: 'Adjust hover delay, visual styles, and more in the settings page.',
    targetSelector: '[data-testid="drilldown-settings-card"]',
    position: 'top',
    action: () => {
      // Navigate to settings if not already there
      if (window.location.pathname !== '/settings') {
        window.location.href = '/settings';
      }
    },
  },
  {
    id: 'keyboard',
    title: 'Keyboard Shortcuts',
    description: 'Use Alt+Left/Right for history, Ctrl+Click for new tabs, and more.',
    position: 'center',
  },
  {
    id: 'bookmarks',
    title: 'Bookmarks & History',
    description: 'Save important views and navigate back easily with bookmarks and history.',
    targetSelector: '[data-testid="bookmarks-panel"]',
    position: 'left',
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'Explore the system at your own pace. Use the help dialog anytime for more info.',
    position: 'center',
  },
];

export function DrilldownOnboardingTour() {
  const {
    hasSeenOnboarding,
    markOnboardingComplete,
    dismissTour,
    markTourStepComplete,
    completedTourSteps,
  } = useDrillDownStore();
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const [isOpen, setIsOpen] = React.useState(false);
  const [targetElement, setTargetElement] = React.useState<HTMLElement | null>(null);
  const isMobile = useIsMobile();

  const currentStep = tourSteps[currentStepIndex];
  const isLastStep = currentStepIndex === tourSteps.length - 1;

  // Only show if not seen onboarding
  React.useEffect(() => {
    if (!hasSeenOnboarding) {
      setIsOpen(true);
    }
  }, [hasSeenOnboarding]);

  // Find target element for current step
  React.useEffect(() => {
    currentStep.action?.();
    if (currentStep.targetSelector) {
      const element = document.querySelector(currentStep.targetSelector) as HTMLElement;
      setTargetElement(element || null);
    } else {
      setTargetElement(null);
    }
  }, [currentStep]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          nextStep();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prevStep();
          break;
        case 'Escape':
          e.preventDefault();
          handleSkip();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

  const nextStep = () => {
    if (currentStepIndex < tourSteps.length - 1) {
      markTourStepComplete(currentStep.id);
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleSkip = () => {
    dismissTour();
    setIsOpen(false);
  };

  const handleComplete = () => {
    markOnboardingComplete();
    setIsOpen(false);
  };

  // Calculate spotlight clip-path
  const getSpotlightClipPath = () => {
    if (!targetElement) return 'none';

    const rect = targetElement.getBoundingClientRect();
    const padding = 8;
    const x = rect.left - padding;
    const y = rect.top - padding;
    const width = rect.width + padding * 2;
    const height = rect.height + padding * 2;

    return `polygon(0% 0%, 0% 100%, ${x}px 100%, ${x}px ${y}px, ${x + width}px ${y}px, ${x + width}px ${y + height}px, ${x}px ${y + height}px, ${x}px 100%, 100% 100%, 100% 0%)`;
  };

  // Position calculation for popover
  const getPopoverPosition = () => {
    if (!targetElement || currentStep.position === 'center') {
      return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
    }

    const rect = targetElement.getBoundingClientRect();
    const offset = 16;

    switch (currentStep.position) {
      case 'top':
        return { left: rect.left + rect.width / 2, top: rect.top - offset, transform: 'translateX(-50%) translateY(-100%)' };
      case 'bottom':
        return { left: rect.left + rect.width / 2, top: rect.bottom + offset, transform: 'translateX(-50%)' };
      case 'left':
        return { left: rect.left - offset, top: rect.top + rect.height / 2, transform: 'translateX(-100%) translateY(-50%)' };
      case 'right':
        return { left: rect.right + offset, top: rect.top + rect.height / 2, transform: 'translateY(-50%)' };
      default:
        return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
    }
  };

  const stepIcons = {
    welcome: GraduationCap,
    'drill-targets': MousePointer,
    preview: Eye,
    settings: Settings,
    keyboard: Keyboard,
    bookmarks: Bookmark,
    complete: CheckCircle,
  };

  const StepIcon = stepIcons[currentStep.id as keyof typeof stepIcons] || GraduationCap;

  if (!isOpen) return null;

  const progress = ((currentStepIndex + 1) / tourSteps.length) * 100;

  return createPortal(
    <>
      {/* Spotlight Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/70 transition-opacity duration-300"
        style={{
          clipPath: targetElement ? getSpotlightClipPath() : 'none',
        }}
        onClick={handleSkip}
      />

      {/* Tour Popover/Dialog */}
      <div
        className="fixed z-[101] pointer-events-auto"
        style={getPopoverPosition()}
      >
        <div className={cn(
          "bg-background border rounded-lg shadow-lg p-6 max-w-sm w-full",
          isMobile && "max-w-[90vw]"
        )}>
          <div className="flex items-start justify-between mb-4">
            <StepIcon className="h-6 w-6 text-primary mr-3 mt-0.5" />
            <button
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Skip tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <h3 className="text-lg font-semibold mb-2">{currentStep.title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{currentStep.description}</p>

          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-2 mb-4">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="text-xs text-muted-foreground mb-4">
            Step {currentStepIndex + 1} of {tourSteps.length}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={prevStep}
              disabled={currentStepIndex === 0}
              aria-label="Previous step"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSkip}
              aria-label="Skip tour"
            >
              Skip Tour
            </Button>

            <Button
              size="sm"
              onClick={nextStep}
              aria-label={isLastStep ? "Complete tour" : "Next step"}
            >
              {isLastStep ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Finish
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}