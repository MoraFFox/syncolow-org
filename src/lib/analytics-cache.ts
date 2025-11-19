/**
 * Analytics Cache Manager
 * Manages sessionStorage caching for analytics data to reduce Firestore requests
 */

const CACHE_PREFIX = 'analytics_';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const AnalyticsCache = {
  /**
   * Get cached analytics data for a date range
   */
  get(from: string, to: string) {
    const key = `${CACHE_PREFIX}${from}_${to}`;
    const cached = sessionStorage.getItem(key);
    
    if (!cached) return null;
    
    try {
      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      
      // Return data if cache is fresh
      if (age < CACHE_DURATION) {
        return data;
      }
      
      // Cache expired
      sessionStorage.removeItem(key);
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Set cached analytics data for a date range
   */
  set(from: string, to: string, data: any) {
    const key = `${CACHE_PREFIX}${from}_${to}`;
    try {
      sessionStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      // Handle quota exceeded
      this.clearAll();
    }
  },

  /**
   * Clear all analytics cache
   */
  clearAll() {
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
  },

  /**
   * Clear expired cache entries
   */
  clearExpired() {
    Object.keys(sessionStorage).forEach(key => {
      if (!key.startsWith(CACHE_PREFIX)) return;
      
      try {
        const cached = sessionStorage.getItem(key);
        if (!cached) return;
        
        const { timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        if (age >= CACHE_DURATION) {
          sessionStorage.removeItem(key);
        }
      } catch {
        sessionStorage.removeItem(key);
      }
    });
  }
};
