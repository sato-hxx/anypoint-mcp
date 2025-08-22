import { APIClient, APIClientConfig } from "./api-client";
import { Cacheable } from "./cache-manager";
import { Authorizable } from "./authorizer";

class CachedAPIClient extends APIClient {
  private cacheManager: Cacheable;
  
  constructor(authorizer: Authorizable, organizationId: string, cacheManager: Cacheable, config: APIClientConfig = {}) {
    super(authorizer, organizationId, config);
    this.cacheManager = cacheManager;
  }
  
  async get<T>(path: string, headers?: Record<string, string>): Promise<T> {
    const cacheKey = this.generateCacheKey('GET', path, headers);
    
    const cached = this.cacheManager.get<T>(cacheKey);
    if (cached) {
      return cached;
    }
    
    const result = await super.get<T>(path, headers);
    
    this.cacheManager.set(cacheKey, result);
    
    return result;
  }
  
  getCacheStats() {
    return this.cacheManager.getStats();
  }
  
  clearCache(): void {
    this.cacheManager.clear();
  }
  
  destroy(): void {
    this.cacheManager.destroy();
  }
  
  private generateCacheKey(method: string, path: string, headers?: Record<string, string>): string {
    return `${this.organizationId}:${method}:${path}:${ JSON.stringify(headers ?? {}) }`;
  }
}

export { CachedAPIClient };
