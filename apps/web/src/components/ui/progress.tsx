import React from "react";
import { cn } from "@/components/ui/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  indicatorClassName?: string
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, indicatorClassName, ...props }, ref) => {
    // Ensure value is a safe number between 0 and 100
    const safeValue = isNaN(Number(value)) ? 0 : Math.min(100, Math.max(0, Number(value)));
    return (
      <div
        ref={ref}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-[var(--primary)]/20",
          className
        )}
        {...props}
      >
        <div
          className={cn("h-full bg-[var(--primary)] transition-all duration-300", indicatorClassName)}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };

