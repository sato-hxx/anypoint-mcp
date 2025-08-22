import { APIClient } from "./api-client";
import { Cacheable } from "./cache-manager";
import { Authorizable } from "./authorizer";

/**
 * リソースタイプ別のTTL設定
 */
interface ResourceTTLConfig {
  /** 環境一覧のTTL（デフォルト: 5分） */
  environments?: number;
  /** デプロイメント一覧のTTL（デフォルト: 30秒） */
  deployments?: number;
  /** ログのTTL（デフォルト: 10秒） */
  logs?: number;
  /** その他のTTL（デフォルト: 1分） */
  default?: number;
}

/**
 * キャッシュ機能付きAPIクライアント
 */
class CachedAPIClient extends APIClient {
  private cacheManager: Cacheable;
  
  constructor(
    authorizer: Authorizable, 
    organizationId: string, 
    cacheManager: Cacheable,
    options: { baseUri?: string; timeout?: number; retryAttempts?: number } = {}
  ) {
    super(authorizer, organizationId, options);
    this.cacheManager = cacheManager;
  }
  
  /**
   * キャッシュ機能付きGETリクエスト
   */
  async get<T>(path: string, headers?: Record<string, string>): Promise<T> {
    // 1. キャッシュキーの生成
    const cacheKey = this.generateCacheKey('GET', path, headers);
    
    // 2. キャッシュから取得を試行
    const cached = this.cacheManager.get<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    // 3. APIリクエストを実行
    const result = await super.get<T>(path, headers);
    
    this.cacheManager.set(cacheKey, result);
    
    return result;
  }
  
  /**
   * キャッシュ統計を取得
   */
  getCacheStats() {
    return this.cacheManager.getStats();
  }
  
  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cacheManager.clear();
  }
  
  /**
   * リソースを破棄
   */
  destroy(): void {
    this.cacheManager.destroy();
  }
  
  private generateCacheKey(method: string, path: string, headers?: Record<string, string>): string {
    return `${this.organizationId}:${method}:${path}:${ JSON.stringify(headers ?? {}) }`;
  }
}

export { CachedAPIClient, type ResourceTTLConfig };
