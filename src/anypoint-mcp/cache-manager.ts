import { PathTrie } from "./path-trie";

interface Cacheable {
  set<T>(key: string, data: T): void;

  get<T>(key: string): T | undefined;

  remove(key: string): boolean;

  clear(): void;

  destroy(): void;

  getStats(): {
    totalEntries: number;
    validEntries: number;
    expiredEntries: number;
    currentSize: number;
    maxSize: number;
    hitRate: number;
  };
}

/**
 * キャッシュエントリの構造
 */
interface CacheEntry<T> {
  /** キャッシュされたデータ */
  data: T;

  /** キャッシュされた時刻（ミリ秒） */
  timestamp: number;

  /** TTL（ミリ秒） */
  ttl: number;

  /** データサイズ（概算バイト数） */
  size: number;
}

interface CacheConfig {
  entryTTL?: number;
  maxCacheSize?: number;
  maxEntries?: number;
  cleanupInterval?: number;
}

/**
 * TTL-based high-performance in-memory cache manager.
 *
 * @remarks
 * ## Concurrency Considerations
 * This class does not use explicit synchronization (e.g., Mutex) for performance and simplicity.
 * As a result, the following race condition may occur:
 *
 * - **currentSize** updates are not atomic, so concurrent accesses may lead to temporarily
 *   stale or inconsistent values.
 * - Even in Node.js’s single-threaded event loop, interruptions between operations
 *   can cause brief moments where the `currentSize` value is out-of-sync.
 * - This imprecision is acceptable because `currentSize` is used only for approximate
 *   capacity checks, and minor inaccuracies (typically micro- to millisecond scale)
 *   do not affect cache correctness or behavior.
 *
 * If strict atomicity or thread safety becomes necessary, appropriate synchronization
 * mechanisms should be added.
 */
class TTLBasedCacheManager implements Cacheable {
  private cache: Map<string, CacheEntry<any>>;

  private currentSize: number;

  private ttlPathMatcher: PathTrie<number>;

  private cleanupTimer?: NodeJS.Timeout;

  private config: Required<CacheConfig>;

  constructor(config: CacheConfig = {}) {
    this.config = {
      entryTTL       : config.entryTTL        || 60 * 1000       , // 60秒
      maxCacheSize   : config.maxCacheSize    || 50 * 1024 * 1024, // 50MB
      maxEntries     : config.maxEntries      || 1000            , // 1000件
      cleanupInterval: config.cleanupInterval || 5 * 60 * 1000   , // 5分
    };

    this.cache = new Map<string, CacheEntry<any>>();

    this.currentSize = 0;

    this.ttlPathMatcher = new PathTrie<number>();

    // ツールの結果はキャッシュしない
    this.ttlPathMatcher.insert("/amc/application-manager/api/v2/organizations/*/environments/*/deployments/*/specs/*/logs", 0);
    
    this.startCleanup();
  }
  
  set<T>(key: string, data: T): void {
    // 既存エントリがある場合は削除
    if (this.cache.has(key)) {
      this.remove(key);
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now()             , // キャッシュされた時刻（ミリ秒）
      ttl      : this.resolveTTL(key)   , // TTL（ミリ秒）
      size     : this.estimateSize(data), // データサイズ（概算バイト数）
    };
    
    // サイズ制限チェック
    this.ensureSpace(entry.size);

    // エントリ数制限チェック
    this.ensureEntryLimit();
    
    this.cache.set(key, entry);

    this.currentSize += entry.size;
  }

  /**
   * キーからTTLを解決
   */
  private resolveTTL(key: string): number {
    const [_organizationId, _method, requestUri, _headerKey] = key.split(':');
    if (requestUri) {
      const path  = requestUri.split('?')[0]!;
      const match = this.ttlPathMatcher.search(path);
      if (match) {
        return match.value;
      }
    }
    return this.config.entryTTL;
  }

  /**
   * データのサイズを推定
   */
  private estimateSize(data: any): number {
    // 簡易的なサイズ推定
    try {
      return JSON.stringify(data).length * 2; // UTF-16 assumption
    } catch {
      return 1024; // フォールバック
    }
  }

  /**
   * キャッシュサイズを確保
   */
  private ensureSpace(newEntrySize: number): void {
    // 新しいエントリを追加してもサイズ制限内なら何もしない
    if (this.currentSize + newEntrySize <= this.config.maxCacheSize) {
      return;
    }

    // LRU（最近最も使用されていない）の代わりに、古いエントリから削除
    const entries = [...this.cache.entries()].sort(([, a], [, b]) => a.timestamp - b.timestamp);

    for (const [key] of entries) {
      this.remove(key);
      if (this.currentSize + newEntrySize <= this.config.maxCacheSize) {
        break;
      }
    }
  }
  
  /**
   * エントリ数を確保
   */
  private ensureEntryLimit(): void {
    if (this.cache.size < this.config.maxEntries) {
      return;
    }
    
    // 最も古いエントリを削除
    const entries = [...this.cache.entries()].sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    if (entries.length > 0) {
      const oldestEntry = entries[0];
      if (oldestEntry) {
        const [oldestKey] = oldestEntry;
        this.remove(oldestKey);
      }
    }
  }
  
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (! entry) {
      // Increment miss count
      this.missCount++;

      return undefined;
    }
    
    // TTLチェック
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.remove(key);

      this.missCount++;

      return undefined;
    }
    
    this.hitCount++;

    return entry.data as T;
  }

  remove(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentSize -= entry.size;
      return this.cache.delete(key);
    }
    return false;
  }
  
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
  
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }
    
    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      currentSize: this.currentSize,
      maxSize: this.config.maxCacheSize,
      hitRate: this.calculateHitRate()
    };
  }
  
  private hitCount = 0;

  private missCount = 0;
  
  private calculateHitRate(): number {
    const total = this.hitCount + this.missCount;
    return total === 0 ? 0 : this.hitCount / total;
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => this.cleanup(), this.config.cleanupInterval);
  }
  
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.remove(key);
      }
    }
  }
}

export { TTLBasedCacheManager, type CacheConfig, type CacheEntry, type Cacheable };
