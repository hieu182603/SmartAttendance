import { onCLS, onFID, onFCP, onLCP, onTTFB, onINP, type Metric } from 'web-vitals';

/**
 * Report Web Vitals metrics to analytics service
 * Currently logs to console, but can be extended to send to Google Analytics, Sentry, etc.
 */
export function reportWebVitals(metric: Metric) {
  // Log in development
  if (import.meta.env.DEV) {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: Math.round(metric.value),
      rating: metric.rating,
      delta: Math.round(metric.delta),
      id: metric.id,
    });
  }

  // Send to analytics in production
  if (import.meta.env.PROD) {
    // Example: Send to Google Analytics
    if (typeof window.gtag === 'function') {
      window.gtag('event', metric.name, {
        value: Math.round(metric.value),
        metric_id: metric.id,
        metric_value: metric.value,
        metric_delta: metric.delta,
        metric_rating: metric.rating,
      });
    }

    // Example: Send to custom analytics endpoint
    // You can replace this with your own analytics service
    try {
      const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
      if (endpoint) {
        navigator.sendBeacon(
          endpoint,
          JSON.stringify({
            name: metric.name,
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta,
            id: metric.id,
            navigationType: metric.navigationType,
            timestamp: Date.now(),
          })
        );
      }
    } catch (error) {
      // Silently fail - don't break the app
      console.warn('[Web Vitals] Failed to send metric:', error);
    }
  }
}

/**
 * Initialize Web Vitals tracking
 * Call this once in your app entry point (main.tsx)
 */
export function initWebVitals() {
  try {
    // Core Web Vitals
    onCLS(reportWebVitals);  // Cumulative Layout Shift
    onFID(reportWebVitals);  // First Input Delay (deprecated, use INP)
    onLCP(reportWebVitals);  // Largest Contentful Paint

    // Other important metrics
    onFCP(reportWebVitals);  // First Contentful Paint
    onTTFB(reportWebVitals); // Time to First Byte
    onINP(reportWebVitals);  // Interaction to Next Paint (new)

    if (import.meta.env.DEV) {
      console.log('[Web Vitals] Monitoring initialized');
    }
  } catch (error) {
    console.error('[Web Vitals] Failed to initialize:', error);
  }
}

/**
 * Custom performance marks for specific features
 */
export const performanceMarks = {
  markDashboardLoaded: () => {
    performance.mark('dashboard-loaded');
    performance.measure('dashboard-load-time', 'navigationStart', 'dashboard-loaded');
    
    const measure = performance.getEntriesByName('dashboard-load-time')[0];
    if (measure && import.meta.env.DEV) {
      console.log(`[Performance] Dashboard loaded in ${Math.round(measure.duration)}ms`);
    }
  },

  markChartRendered: (chartName: string) => {
    const markName = `chart-${chartName}-rendered`;
    performance.mark(markName);
    
    if (import.meta.env.DEV) {
      const entries = performance.getEntriesByName(markName);
      if (entries.length > 0) {
        console.log(`[Performance] Chart "${chartName}" rendered at ${Math.round(entries[0].startTime)}ms`);
      }
    }
  },

  markFaceDetectionReady: () => {
    performance.mark('face-detection-ready');
    performance.measure('face-detection-init', 'navigationStart', 'face-detection-ready');
    
    const measure = performance.getEntriesByName('face-detection-init')[0];
    if (measure && import.meta.env.DEV) {
      console.log(`[Performance] Face detection ready in ${Math.round(measure.duration)}ms`);
    }
  },
};

// Export for use in components
export default {
  reportWebVitals,
  initWebVitals,
  performanceMarks,
};

