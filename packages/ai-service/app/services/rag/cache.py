"""
RAG Cache Module - Provides in-memory caching for RAG queries

Uses cachetools TTLCache for time-based expiration.
Significantly improves response time for repeated queries.
"""

import logging
from typing import Any, Optional
from hashlib import md5
import json

try:
    from cachetools import TTLCache
    CACHETOOLS_AVAILABLE = True
except ImportError:
    CACHETOOLS_AVAILABLE = False

from app.utils.config import (
    RAG_CACHE_ENABLED,
    RAG_CACHE_TTL,
    RAG_CACHE_MAXSIZE
)

logger = logging.getLogger(__name__)


class RAGCache:
    """
    In-memory cache for RAG queries
    
    Provides caching for:
    - Database query results (employee count, department list, etc.)
    - Intent detection results
    - Vector search results
    
    Usage:
        cache = RAGCache()
        
        # Check cache
        result = cache.get_db_result("query_hash")
        if result is None:
            result = await db_query()
            cache.set_db_result("query_hash", result)
    """
    
    def __init__(
        self,
        maxsize: int = None,
        ttl: int = None
    ):
        """
        Initialize RAG cache
        
        Args:
            maxsize: Maximum cache entries (default from config)
            ttl: Time-to-live in seconds (default from config)
        """
        self._enabled = RAG_CACHE_ENABLED and CACHETOOLS_AVAILABLE
        
        if not self._enabled:
            if not CACHETOOLS_AVAILABLE:
                logger.warning("cachetools not installed, caching disabled")
            else:
                logger.info("RAG caching disabled via config")
            return
        
        maxsize = maxsize or RAG_CACHE_MAXSIZE
        ttl = ttl or RAG_CACHE_TTL
        
        # Separate caches for different data types
        self._db_cache = TTLCache(maxsize=maxsize, ttl=ttl)
        self._intent_cache = TTLCache(maxsize=500, ttl=3600)  # 1 hour for intents
        self._vector_cache = TTLCache(maxsize=200, ttl=ttl)
        
        logger.info(f"RAGCache initialized: maxsize={maxsize}, ttl={ttl}s")
    
    @property
    def enabled(self) -> bool:
        """Check if caching is enabled"""
        return self._enabled
    
    def _make_hash(self, *args) -> str:
        """Create a hash key from arguments"""
        key_str = json.dumps(args, sort_keys=True, default=str)
        return md5(key_str.encode()).hexdigest()
    
    # =========================================================================
    # Database Query Cache
    #
    # This cache is scoped to GLOBAL / aggregate queries. It enforces at runtime
    # that callers never pass user-identifying parameters (which would cause
    # cross-user data leakage because the cache key does not include the caller).
    # =========================================================================

    # Param keys that indicate user-specific data; caching is refused when they
    # appear in `params`. Lowercase comparison is used so "userId" and "user_id"
    # both match.
    _USER_SCOPED_PARAM_KEYS = {
        "user_id", "userid", "email", "employee_id",
    }

    def _assert_global_scope(self, query_type: str, params: Optional[dict]) -> bool:
        """Return True if params are safe for the global db_cache, False otherwise.

        We log a warning instead of raising so a buggy caller degrades to
        "no caching" rather than taking down the request.
        """
        if not params:
            return True
        for k in params.keys():
            if isinstance(k, str) and k.lower() in self._USER_SCOPED_PARAM_KEYS:
                logger.warning(
                    f"RAGCache db_cache refused: query_type='{query_type}' param '{k}' "
                    f"is user-scoped. Use a per-user cache or omit this param."
                )
                return False
        return True

    def get_db_result(self, query_type: str, params: dict = None) -> Optional[Any]:
        """Get cached global query result. Returns None (cache miss) if params
        contain user-scoped keys.
        """
        if not self._enabled:
            return None
        if not self._assert_global_scope(query_type, params):
            return None

        key = self._make_hash(query_type, params)
        result = self._db_cache.get(key)

        if result is not None:
            logger.debug(f"Cache HIT for {query_type}")

        return result

    def set_db_result(self, query_type: str, params: dict, result: Any):
        """Cache a global query result. Silently skips caching if params contain
        user-scoped keys (prevents cross-user leakage).
        """
        if not self._enabled:
            return
        if not self._assert_global_scope(query_type, params):
            return

        key = self._make_hash(query_type, params)
        self._db_cache[key] = result
        logger.debug(f"Cached {query_type}")
    
    # =========================================================================
    # Intent Detection Cache
    # =========================================================================
    
    def get_intent(self, message: str) -> Optional[tuple]:
        """
        Get cached intent detection result
        
        Args:
            message: User message
            
        Returns:
            Tuple of (intent_type, details) or None
        """
        if not self._enabled:
            return None
        
        # Normalize message for better cache hits
        normalized = message.lower().strip()
        key = self._make_hash("intent", normalized)
        return self._intent_cache.get(key)
    
    def set_intent(self, message: str, intent_type: str, details: dict):
        """
        Cache intent detection result
        
        Args:
            message: User message
            intent_type: Detected intent type
            details: Intent details
        """
        if not self._enabled:
            return
        
        normalized = message.lower().strip()
        key = self._make_hash("intent", normalized)
        self._intent_cache[key] = (intent_type, details)
    
    # =========================================================================
    # Vector Search Cache
    # =========================================================================
    
    def get_vector_result(self, query: str, limit: int = 5) -> Optional[list]:
        """
        Get cached vector search result
        
        Args:
            query: Search query
            limit: Number of results
            
        Returns:
            Cached results or None
        """
        if not self._enabled:
            return None
        
        key = self._make_hash("vector", query.lower().strip(), limit)
        return self._vector_cache.get(key)
    
    def set_vector_result(self, query: str, limit: int, results: list):
        """
        Cache vector search result
        
        Args:
            query: Search query
            limit: Number of results
            results: Results to cache
        """
        if not self._enabled:
            return
        
        key = self._make_hash("vector", query.lower().strip(), limit)
        self._vector_cache[key] = results
    
    # =========================================================================
    # Cache Management
    # =========================================================================
    
    def clear(self):
        """Clear all caches"""
        if not self._enabled:
            return
        
        self._db_cache.clear()
        self._intent_cache.clear()
        self._vector_cache.clear()
        logger.info("RAG cache cleared")
    
    def get_stats(self) -> dict:
        """Get cache statistics"""
        if not self._enabled:
            return {"enabled": False}
        
        return {
            "enabled": True,
            "db_cache": {
                "size": len(self._db_cache),
                "maxsize": self._db_cache.maxsize,
                "ttl": self._db_cache.ttl
            },
            "intent_cache": {
                "size": len(self._intent_cache),
                "maxsize": self._intent_cache.maxsize,
                "ttl": self._intent_cache.ttl
            },
            "vector_cache": {
                "size": len(self._vector_cache),
                "maxsize": self._vector_cache.maxsize,
                "ttl": self._vector_cache.ttl
            }
        }


# Global cache instance
_cache_instance: Optional[RAGCache] = None


def get_rag_cache() -> RAGCache:
    """Get the global RAG cache instance"""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = RAGCache()
    return _cache_instance
