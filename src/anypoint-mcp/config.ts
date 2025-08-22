import { z } from "zod";
import { getLogger } from "./logger";

// ResourceTTL設定のパーサー
function parseResourceTTL(value?: string): Record<string, number> {
  if (! value) {
    return {
      // 環境は60分（変更頻度が低い）
      "/accounts/api/organizations/*/environments": 60 * 60 * 1000, 
      // ログは常に最新のものを取得する
      "/amc/application-manager/api/v2/organizations/*/environments/*/deployments/*/specs/*/logs": 0 
    };
  }

  const result: Record<string, number> = {};
  const entries = value.split(',');
  
  for (const entry of entries) {
    const [path, ttlStr] = entry.split(':');
    if (path && ttlStr) {
      const ttl = parseInt(ttlStr.trim());
      if (! isNaN(ttl) && ttl >= 0) {
        result[path.trim()] = ttl;
      }
    }
  }
  
  return result;
}

const ConfigSchema = z.object({
  // 必須設定
  clientId: z.string()
    .min(1, "ANYPOINT_CLIENT_ID must not be empty"),
    // .regex(/^[a-f0-9-]{36}$/, "ANYPOINT_CLIENT_ID must be a valid UUID"),
  
  clientSecret: z.string()
    .min(10, "ANYPOINT_CLIENT_SECRET must be at least 10 characters"),
  
  organizationId: z.string()
    .min(1, "ANYPOINT_ORGANIZATION_ID must not be empty"),
    // .regex(/^[a-f0-9-]{36}$/, "ANYPOINT_ORGANIZATION_ID must be a valid UUID"),
  
  // オプション設定（デフォルト値付き）
  enableCache: z.boolean().default(true),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  
  // キャッシュ設定
  cache: z.object({
    maxSize: z.number().positive().default(50 * 1024 * 1024), // 50MB
    maxEntries: z.number().positive().default(1000),
    cleanupInterval: z.number().positive().default(5 * 60 * 1000), // 5分
    defaultTTL: z.number().positive().default(60 * 1000), // 1分
    resourceTTL: z.string()
      .optional()
      .refine((value) => {
        if (! value) {
          return true;
        }
        const entries = value.split(',');
        return entries.every(entry => {
          const [path, ttl] = entry.split(':');
          if (! (path && ttl)) {
            return false;
          }
          const ttlNum = parseInt(ttl.trim());
          return !isNaN(ttlNum) && ttlNum >= 0;
        });
      }, "Resource TTL format must be 'path:milliseconds,path:milliseconds' where milliseconds >= 0")
      .transform(parseResourceTTL),
  }).default({}),
  
  // API設定
  api: z.object({
    baseUrl: z.string().url().default("https://anypoint.mulesoft.com"),
    timeout: z.number().positive().default(30000), // 30秒
    retryAttempts: z.number().min(0).max(5).default(3),
  }).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  const rawConfig = {
    clientId: process.env.ANYPOINT_CLIENT_ID,
    clientSecret: process.env.ANYPOINT_CLIENT_SECRET,
    organizationId: process.env.ANYPOINT_ORGANIZATION_ID,
    enableCache: process.env.ANYPOINT_ENABLE_CACHE !== "false",
    logLevel: process.env.ANYPOINT_LOG_LEVEL,
    
    cache: {
      maxSize: process.env.ANYPOINT_CACHE_MAX_SIZE ? 
        parseInt(process.env.ANYPOINT_CACHE_MAX_SIZE) : undefined,
      maxEntries: process.env.ANYPOINT_CACHE_MAX_ENTRIES ? 
        parseInt(process.env.ANYPOINT_CACHE_MAX_ENTRIES) : undefined,
      cleanupInterval: process.env.ANYPOINT_CACHE_CLEANUP_INTERVAL ? 
        parseInt(process.env.ANYPOINT_CACHE_CLEANUP_INTERVAL) : undefined,
      defaultTTL: process.env.ANYPOINT_CACHE_DEFAULT_TTL ? 
        parseInt(process.env.ANYPOINT_CACHE_DEFAULT_TTL) : undefined,
      resourceTTL: process.env.ANYPOINT_CACHE_RESOURCE_TTL,
    },
    
    api: {
      baseUrl: process.env.ANYPOINT_API_BASE_URL,
      timeout: process.env.ANYPOINT_API_TIMEOUT ? 
        parseInt(process.env.ANYPOINT_API_TIMEOUT) : undefined,
      retryAttempts: process.env.ANYPOINT_API_RETRY_ATTEMPTS ? 
        parseInt(process.env.ANYPOINT_API_RETRY_ATTEMPTS) : undefined,
    },
  };

  try {
    return ConfigSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const logger = getLogger();
      logger.error("Configuration validation failed");
      error.errors.forEach(err => {
        logger.error(`Configuration error: ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

// 設定値の表示用（機密情報をマスク）
export function displayConfig(config: Config): void {
  const logger = getLogger();
  logger.info("Configuration loaded", {
    organizationId: config.organizationId,
    clientId: config.clientId,
    clientSecret: '*'.repeat(config.clientSecret.length),
    cacheEnabled: config.enableCache,
    logLevel: config.logLevel,
    apiBaseUrl: config.api.baseUrl,
    apiTimeout: `${config.api.timeout}ms`,
    cacheMaxSize: `${Math.round(config.cache.maxSize / 1024 / 1024)}MB`,
    cacheMaxEntries: config.cache.maxEntries,
  });
}
