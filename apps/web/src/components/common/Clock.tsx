import React, { useState, useEffect, memo } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface ClockProps {
  className?: string;
  showStatus?: boolean;
  statusText?: string;
}

/**
 * Clock component - Displays current time with auto-update every minute
 * Separate component to avoid reloading entire page when time updates
 * Memoized to prevent unnecessary re-renders when parent updates
 * Uses layoutId and ref tracking to prevent animation re-trigger on parent re-renders
 */
const Clock: React.FC<ClockProps> = ({ 
  className = "",
  showStatus = true,
  statusText = "Hệ thống hoạt động tốt"
}) => {
  const [currentTime, setCurrentTime] = useState(() => 
    new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
  
  // Track if initial animation should run
  // This prevents re-animation when parent re-renders
  const [hasAnimated, setHasAnimated] = useState(false);

  // Update time every minute
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };

    // Update every minute (60000ms)
    const interval = setInterval(updateTime, 60000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Mark animation as complete after initial animation (only run once on mount)
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasAnimated(true);
    }, 600); // After animation completes (300ms delay + 300ms duration)

    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      className={`text-right ${className}`}
      layoutId="clock-container"
      // Only animate on initial mount, not on re-renders
      initial={!hasAnimated ? { opacity: 0, x: 20 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={!hasAnimated ? { delay: 0.3, duration: 0.3 } : { duration: 0 }}
    >
      <motion.div
        className="text-6xl font-bold mb-2 drop-shadow-lg"
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {currentTime}
      </motion.div>
      {showStatus && (
        <div className="flex items-center justify-end space-x-2">
          <Sparkles className="h-5 w-5 drop-shadow-md" />
          <span className="text-lg font-medium drop-shadow-sm">{statusText}</span>
        </div>
      )}
    </motion.div>
  );
};

// Memoize component to prevent re-renders when parent updates
// Only re-render if props actually change
const MemoizedClock = memo(Clock, (prevProps, nextProps) => {
  return (
    prevProps.className === nextProps.className &&
    prevProps.showStatus === nextProps.showStatus &&
    prevProps.statusText === nextProps.statusText
  );
});

// Set display name for better debugging
MemoizedClock.displayName = 'Clock';

export default MemoizedClock;

// Named export for backward compatibility
export { Clock };

