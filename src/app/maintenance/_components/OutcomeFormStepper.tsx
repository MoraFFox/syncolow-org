import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OutcomeStep } from '@/hooks/useOutcomeStepManager';

interface OutcomeFormStepperProps {
    steps: { id: OutcomeStep; title: string; description: string }[];
    currentStepIndex: number;
    onStepClick: (index: number) => void;
}

export function OutcomeFormStepper({ steps, currentStepIndex, onStepClick }: OutcomeFormStepperProps) {
    return (
        <div className="w-full bg-muted/20 border-b border-border/40">
            <div className="container max-w-4xl mx-auto px-4 py-4">
                <nav aria-label="Progress">
                    <ol role="list" className="flex items-center">
                        {steps.map((step, index) => {
                            const isCompleted = index < currentStepIndex;
                            const isCurrent = index === currentStepIndex;
                            const isStepsRemaining = index > currentStepIndex;

                            return (
                                <li key={step.id} className={cn("relative flex-1 flex flex-col md:flex-row md:items-center", index !== steps.length - 1 ? "pr-4" : "")}>
                                    {/* Line Connector */}
                                    {index !== steps.length - 1 && (
                                        <div
                                            className={cn(
                                                "absolute top-4 left-0 w-full h-[2px] -z-10 bg-border md:top-1/2 md:-translate-y-1/2 md:left-8 md:w-[calc(100%-2rem)] transition-colors duration-500",
                                                isCompleted ? "bg-primary" : "bg-border"
                                            )}
                                            aria-hidden="true"
                                        />
                                    )}

                                    <button
                                        onClick={() => onStepClick(index)}
                                        disabled={isStepsRemaining}
                                        className="group flex flex-col items-center md:items-start group focus:outline-none"
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className={cn(
                                                "relative flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-300",
                                                isCompleted ? "border-primary bg-primary text-primary-foreground" :
                                                    isCurrent ? "border-primary/60 bg-background text-primary ring-2 ring-primary/20 ring-offset-2" :
                                                        "border-muted-foreground/30 bg-muted/10 text-muted-foreground"
                                            )}>
                                                {isCompleted ? (
                                                    <Check className="h-4 w-4" aria-hidden="true" />
                                                ) : (
                                                    <span>{index + 1}</span>
                                                )}
                                            </span>

                                            <div className="hidden md:flex flex-col items-start text-left">
                                                <span className={cn(
                                                    "text-sm font-medium transition-colors duration-300",
                                                    isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground"
                                                )}>
                                                    {step.title}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground/80 font-mono hidden lg:block">
                                                    {step.description}
                                                </span>
                                            </div>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                </nav>
            </div>
        </div>
    );
}
