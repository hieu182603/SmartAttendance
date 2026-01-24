import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    Favico?: any;
    _fav?: any;
  }
}

/**
 * Hook to dynamically load and manage Favico.js for favicon badge
 * Only loads when user is authenticated and needs badge functionality
 */
export const useFaviconBadge = () => {
  const favicoInstanceRef = useRef<any>(null);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    const loadFavico = async () => {
      // Prevent duplicate loading
      if (isLoadingRef.current || favicoInstanceRef.current) {
        return;
      }

      isLoadingRef.current = true;

      try {
        // Check if Favico is already loaded (from CDN or cache)
        if (!window.Favico) {
          // Dynamically load Favico.js from CDN
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/favico.js/0.3.10/favico.min.js';
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Favico.js'));
            document.head.appendChild(script);
          });
        }

        // Wait for Favico to be available
        let attempts = 0;
        while (!window.Favico && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (window.Favico) {
          favicoInstanceRef.current = new window.Favico({ animation: 'popFade' });
          console.log('[useFaviconBadge] Favico.js loaded successfully');
        } else {
          console.warn('[useFaviconBadge] Failed to initialize Favico after loading');
        }
      } catch (error) {
        console.error('[useFaviconBadge] Error loading Favico.js:', error);
      } finally {
        isLoadingRef.current = false;
      }
    };

    loadFavico();

    return () => {
      // Reset favicon on unmount
      if (favicoInstanceRef.current) {
        try {
          favicoInstanceRef.current.reset();
        } catch (error) {
          console.warn('[useFaviconBadge] Error resetting favicon:', error);
        }
      }
    };
  }, []);

  const setBadge = (count: number | string | null) => {
    if (!favicoInstanceRef.current) {
      return;
    }

    try {
      if (typeof count === 'number') {
        if (count > 0) {
          favicoInstanceRef.current.badge(count);
        } else {
          favicoInstanceRef.current.reset();
        }
      } else if (typeof count === 'string') {
        favicoInstanceRef.current.badge(count);
      } else {
        favicoInstanceRef.current.reset();
      }
    } catch (error) {
      console.warn('[useFaviconBadge] Error setting badge:', error);
    }
  };

  const reset = () => {
    if (favicoInstanceRef.current) {
      try {
        favicoInstanceRef.current.reset();
      } catch (error) {
        console.warn('[useFaviconBadge] Error resetting badge:', error);
      }
    }
  };

  return {
    setBadge,
    reset,
    isReady: !!favicoInstanceRef.current,
  };
};
