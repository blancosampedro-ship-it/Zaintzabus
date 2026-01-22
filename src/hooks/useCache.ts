'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  staleWhileRevalidate?: boolean;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory cache storage
const cacheStore = new Map<string, CacheEntry<unknown>>();

/**
 * Hook para cachear datos en memoria con TTL configurable
 */
export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  const { ttl = DEFAULT_TTL, staleWhileRevalidate = true } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);
  
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fetchData = useCallback(async (skipCache = false) => {
    try {
      // Check cache first
      if (!skipCache) {
        const cached = cacheStore.get(key) as CacheEntry<T> | undefined;
        if (cached) {
          const now = Date.now();
          const isExpired = now > cached.expiresAt;
          
          if (!isExpired) {
            setData(cached.data);
            setIsLoading(false);
            setIsStale(false);
            return cached.data;
          }
          
          if (staleWhileRevalidate) {
            setData(cached.data);
            setIsStale(true);
            setIsLoading(false);
          }
        }
      }

      setIsLoading(true);
      const result = await fetcherRef.current();
      
      // Store in cache
      const now = Date.now();
      cacheStore.set(key, {
        data: result,
        timestamp: now,
        expiresAt: now + ttl,
      });

      setData(result);
      setIsStale(false);
      setError(null);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [key, ttl, staleWhileRevalidate]);

  const invalidate = useCallback(() => {
    cacheStore.delete(key);
    setIsStale(true);
  }, [key]);

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    isStale,
    invalidate,
    refresh,
  };
}

/**
 * Hook para paginación con cursor de Firestore
 */
export function usePagination<T extends { id: string }>(
  fetcher: (cursor?: string, limit?: number) => Promise<{ data: T[]; hasMore: boolean; lastCursor?: string }>,
  options: { pageSize?: number; initialData?: T[] } = {}
) {
  const { pageSize = 20, initialData = [] } = options;
  
  const [data, setData] = useState<T[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [cursor, setCursor] = useState<string | undefined>();

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const loadInitial = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await fetcherRef.current(undefined, pageSize);
      
      setData(result.data);
      setHasMore(result.hasMore);
      setCursor(result.lastCursor);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !cursor) return;
    
    try {
      setIsLoadingMore(true);
      
      const result = await fetcherRef.current(cursor, pageSize);
      
      setData(prev => [...prev, ...result.data]);
      setHasMore(result.hasMore);
      setCursor(result.lastCursor);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoadingMore(false);
    }
  }, [cursor, hasMore, isLoadingMore, pageSize]);

  const refresh = useCallback(async () => {
    setCursor(undefined);
    await loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  return {
    data,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
  };
}

/**
 * Hook para infinite scroll
 */
export function useInfiniteScroll(
  loadMore: () => void,
  options: {
    threshold?: number;
    rootMargin?: string;
    enabled?: boolean;
  } = {}
) {
  const { threshold = 0.1, rootMargin = '100px', enabled = true } = options;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  const sentinelRef = useCallback((node: HTMLElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (!node || !enabled) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreRef.current();
        }
      },
      { threshold, rootMargin }
    );

    observerRef.current.observe(node);
  }, [enabled, threshold, rootMargin]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return sentinelRef;
}

// Utility to clear all cache
export function clearCache() {
  cacheStore.clear();
}

// Utility to clear specific cache entries by prefix
export function clearCacheByPrefix(prefix: string) {
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
}
