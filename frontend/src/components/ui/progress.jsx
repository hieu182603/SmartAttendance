import React from "react";
import { cn } from "./utils";

const Progress = React.forwardRef(({ className, value = 0, ...props }, ref) => {
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
        className="h-full w-full flex-1 bg-[var(--primary)] transition-all duration-300"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </div>
  );
});
Progress.displayName = "Progress";

export { Progress };
