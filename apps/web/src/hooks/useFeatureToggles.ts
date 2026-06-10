import { useState, useEffect, useCallback } from 'react';
import { featureToggleService } from '@/services/featureToggleService';
import { useAuth } from '@/context/AuthContext';

export interface FeatureToggleMap {
  /** featureKey → effective enabled state for the current user */
  [featureKey: string]: boolean;
}

/** Three-state signal for the initial toggle fetch. */
export type FeatureToggleStatus = 'loading' | 'resolved' | 'error';

let _cache: FeatureToggleMap | null = null;
let _status: FeatureToggleStatus = 'loading';
let _listeners: Array<(map: FeatureToggleMap) => void> = [];
let _statusListeners: Array<(s: FeatureToggleStatus) => void> = [];

function notify(map: FeatureToggleMap) {
  _listeners.forEach(fn => fn(map));
}

function notifyStatus(s: FeatureToggleStatus) {
  _statusListeners.forEach(fn => fn(s));
}

/**
 * Refresh the per-user effective toggle map from the server and notify all
 * hook instances. If the request fails and a previous cache exists, the stale
 * cache is reused. If there is no cache yet the error is re-thrown so callers
 * can surface it instead of silently treating every feature as enabled.
 */
async function fetchToggles(): Promise<FeatureToggleMap> {
  try {
    const effective = await featureToggleService.getEffective();
    _cache = effective;
    _status = 'resolved';
    notify(effective);
    notifyStatus('resolved');
    return effective;
  } catch (err) {
    if (_cache !== null) {
      // Reuse stale data rather than losing current state on a transient error.
      // Status stays 'resolved' — we still have a good map from before.
      return _cache;
    }
    // No previous cache — the initial fetch failed.
    _status = 'error';
    notifyStatus('error');
    throw err;
  }
}

/**
 * Hook that returns { featureKey: effectiveEnabled } for the current user.
 * - Resolved server-side using role + company-override precedence.
 * - Cache is shared across all instances and cleared on logout.
 * - `status` is 'loading' until the first successful response or a failure:
 *     'loading'  → fetch in progress, no decision yet
 *     'resolved' → toggles map is populated and trustworthy
 *     'error'    → initial fetch failed, no stale cache available
 * - A failed initial fetch leaves toggles as null; isEnabled returns
 *   false for all keys until a successful response arrives.
 * - Call refresh() after an admin changes toggles to re-sync.
 */
export function useFeatureToggles() {
  const { user } = useAuth();
  const [toggles, setToggles] = useState<FeatureToggleMap | null>(_cache);
  const [status, setStatus] = useState<FeatureToggleStatus>(_status);

  useEffect(() => {
    const mapListener = (map: FeatureToggleMap) => setToggles({ ...map });
    const statusListener = (s: FeatureToggleStatus) => setStatus(s);
    _listeners.push(mapListener);
    _statusListeners.push(statusListener);

    if (user && _cache === null) {
      // Kick off the initial fetch only if the cache is cold.
      // _status is already 'loading' at module init, so no need to set it here.
      fetchToggles()
        .then(map => setToggles({ ...map }))
        .catch(() => {
          // Initial fetch failed and there is no cache.
          // setStatus('error') is already handled by notifyStatus inside fetchToggles.
          setToggles(null);
        });
    } else if (_cache) {
      setToggles({ ..._cache });
      setStatus('resolved');
    } else if (!user) {
      // Logged out — status resets to loading so the next user starts clean.
      setStatus('loading');
    }

    return () => {
      _listeners = _listeners.filter(fn => fn !== mapListener);
      _statusListeners = _statusListeners.filter(fn => fn !== statusListener);
    };
  }, [user]);

  // Clear cache and local state on logout so the next user gets a fresh fetch.
  useEffect(() => {
    if (!user) {
      _cache = null;
      _status = 'loading';
      setToggles(null);
      setStatus('loading');
    }
  }, [user]);

  const refresh = useCallback(() => fetchToggles(), []);

  /**
   * Returns the server-resolved effective enabled state for a feature.
   * Defaults to false when the map has not loaded yet or the key is absent,
   * rather than silently enabling features on error.
   */
  const isEnabled = useCallback(
    (featureKey: string) => toggles !== null && toggles[featureKey] === true,
    [toggles],
  );

  return { toggles: toggles ?? {}, status, isEnabled, refresh };
}

/** Call after a SUPER_ADMIN changes toggles to immediately re-sync all instances. */
export function invalidateFeatureTogglesCache() {
  _cache = null;
  _status = 'loading';
  notifyStatus('loading');
  fetchToggles().catch(() => {/* background refresh — ignore transient failures */});
}
