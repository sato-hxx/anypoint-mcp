import { z } from "zod";
import { Logger } from "./logger";

const ConfigSchema = z.object({
  server: z.object({
    name   : z.string().default("anypoint-mcp"),
    version: z.string().default("1.0.0"),
  }),

  auth: z.object({
    clientId    : z.string().min(32, "ANYPOINT_CLIENT_ID must not be empty"),
    clientSecret: z.string().min(32, "ANYPOINT_CLIENT_SECRET must be at least 32 characters"),
  }),

  api: z.object({
    baseUrl      : z.string().url().default("https://anypoint.mulesoft.com"),
    timeout      : z.number().positive().default(30000), // 30秒
    retryAttempts: z.number().min(0).max(5).default(3),
  }).default({}),

  cache: z.object({
    entryTTL       : z.number().positive().default(60 * 1000),        // 1分
    maxEntries     : z.number().positive().default(1000),             // 1000件
    maxSize        : z.number().positive().default(50 * 1024 * 1024), // 50MB
    cleanupInterval: z.number().positive().default(5 * 60 * 1000),    // 5分
  }).default({}),
  
  enableCaching: z.boolean().default(true),

  logLevel: z.enum(["DEBUG", "INFO", "WARN", "ERROR"]).default("INFO"),

  organizationId: z.string().min(36, "ANYPOINT_ORGANIZATION_ID must be a valid UUID"),
});

type Config = z.infer<typeof ConfigSchema>;

function loadConfig(): Config {
  const rawConfig = {
    server: {
      name   : process.env.ANYPOINT_SERVER_NAME,
      version: process.env.ANYPOINT_SERVER_VERSION,
    },

    auth: {
      clientId: process.env.ANYPOINT_CLIENT_ID,
      clientSecret: process.env.ANYPOINT_CLIENT_SECRET,
    },
    
    cache: {
      entryTTL       : process.env.ANYPOINT_CACHE_ENTRY_TTL        ? parseInt(process.env.ANYPOINT_CACHE_ENTRY_TTL)        : undefined,
      maxEntries     : process.env.ANYPOINT_CACHE_MAX_ENTRIES      ? parseInt(process.env.ANYPOINT_CACHE_MAX_ENTRIES)      : undefined,
      maxSize        : process.env.ANYPOINT_CACHE_MAX_SIZE         ? parseInt(process.env.ANYPOINT_CACHE_MAX_SIZE)         : undefined,
      cleanupInterval: process.env.ANYPOINT_CACHE_CLEANUP_INTERVAL ? parseInt(process.env.ANYPOINT_CACHE_CLEANUP_INTERVAL) : undefined,
    },
    
    api: {
      baseUrl      : process.env.ANYPOINT_API_BASE_URL,
      timeout      : process.env.ANYPOINT_API_TIMEOUT        ? parseInt(process.env.ANYPOINT_API_TIMEOUT)        : undefined,
      retryAttempts: process.env.ANYPOINT_API_RETRY_ATTEMPTS ? parseInt(process.env.ANYPOINT_API_RETRY_ATTEMPTS) : undefined,
    },

    enableCaching: process.env.ANYPOINT_ENABLE_CACHE !== "false",

    logLevel: process.env.ANYPOINT_LOG_LEVEL,

    organizationId: process.env.ANYPOINT_ORGANIZATION_ID,
  };

  try {
    return ConfigSchema.parse(rawConfig);
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      Logger.getInstance().error("Configuration validation failed");
      error.errors.forEach(err => Logger.getInstance().error(`Configuration error: ${err.path.join('.')}: ${err.message}`));
    }
    throw error;
  }
}

export { loadConfig, type Config };