import React from 'react';
import { Progress } from '@/components/ui/progress';

interface ProgressBarProps {
  value: number;
  max: number;
  className?: string;
  showPercentage?: boolean;
  statusMessage?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  value, 
  max, 
  className = '', 
  showPercentage = true, 
  statusMessage 
}) => {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className={`w-full space-y-2 ${className}`}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">
          {statusMessage || `${value} of ${max} completed`}
        </span>
        {showPercentage && (
          <span className="text-sm text-muted-foreground">
            {percentage}%
          </span>
        )}
      </div>
      <Progress value={percentage} className="w-full" />
    </div>
  );
};

export default ProgressBar;