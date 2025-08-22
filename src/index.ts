#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MCPServer } from "./anypoint-mcp/mcp-server";
import { loadConfig, displayConfig } from "./anypoint-mcp/config";
import { createLogger, getLogger } from "./anypoint-mcp/logger";

async function main() {
  // 設定を読み込み・バリデーション
  const config = loadConfig();
  
  // ロガーを初期化
  const logger = createLogger(config.logLevel);
  
  // デバッグレベルの場合のみ設定を表示
  if (config.logLevel === "debug") {
    displayConfig(config);
  }

  logger.info("Starting Anypoint MCP Server", {
    version: "1.0.0",
    logLevel: config.logLevel,
    cacheEnabled: config.enableCache,
  });

  const server = new MCPServer(config);
  
  await server.connect(new StdioServerTransport());
  
  logger.info("MCP Server connected and ready");
}

main().catch((error) => {
  const logger = getLogger();
  logger.logError("Fatal error during startup", error);
  process.exit(1);
});
