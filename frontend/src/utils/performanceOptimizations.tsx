import React, { memo } from 'react';

/**
 * Performance optimization utilities
 * Provides memoized components and helpers for reducing re-renders
 */

/**
 * Generic memoized card component
 * Use this for KPI cards, stat cards, etc.
 */
export const MemoizedCard = memo(({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  return <div className={className}>{children}</div>;
});
MemoizedCard.displayName = 'MemoizedCard';

/**
 * Check if props are equal for shallow comparison
 * Use with React.memo for components with simple props
 */
export function shallowEqual(prevProps: any, nextProps: any): boolean {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  for (const key of prevKeys) {
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Deep comparison for complex objects
 * Use sparingly as it's more expensive than shallow comparison
 */
export function deepEqual(prevProps: any, nextProps: any): boolean {
  return JSON.stringify(prevProps) === JSON.stringify(nextProps);
}

/**
 * Memoization helper for expensive computations
 * Simple cache implementation
 */
export class MemoCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private maxAge: number;

  constructor(maxAge = 60000) {
    // Default 1 minute cache
    this.maxAge = maxAge;
  }

  get(key: string): T | undefined {
    const cached = this.cache.get(key);
    if (!cached) return undefined;

    const now = Date.now();
    if (now - cached.timestamp > this.maxAge) {
      this.cache.delete(key);
      return undefined;
    }

    return cached.value;
  }

  set(key: string, value: T): void {
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Debounce function for expensive operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for rate-limiting
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export default {
  MemoizedCard,
  shallowEqual,
  deepEqual,
  MemoCache,
  debounce,
  throttle,
};

