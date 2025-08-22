#!/usr/bin/env node

import "reflect-metadata"; // TSyringeに必要
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ServerFactory } from "./anypoint-mcp/server";
import { loadConfig } from "./anypoint-mcp/config";
import { Logger } from "./anypoint-mcp/logger";
import { DIContainer } from "./anypoint-mcp/di/container";
import { DI_TOKEN } from "./anypoint-mcp/di/token";

async function main() {
  const config = loadConfig();
  
  // initialize DI container
  DIContainer.setup(config);

  // initialize logger
  const logger = Logger.getInstance()
  logger.setLogLevel(config.logLevel);
  
  logger.info("Starting MCP Server");
  try {
    const server = DIContainer.resolve<ServerFactory>(DI_TOKEN.ServerFactory).create(config.server);
    await server.connect(new StdioServerTransport());
    logger.info("Started MCP Server", {
      name         : config.server.name,
      version      : config.server.version,
      enableCaching: config.enableCaching,
      logLevel     : config.logLevel
    });
  } catch (error) {
    Logger.getInstance().error("Failed to initialize server", <Error>error);
    throw error;
  }
}

main();