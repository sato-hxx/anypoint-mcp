import { injectable } from "tsyringe";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { Router } from "./router";
import { DI_TOKEN } from "./di/token";
import { inject } from "tsyringe";

interface ServerConfig {
  name?: string;
  version?: string;
}

class Server {
  private readonly server: McpServer;
  private readonly router: Router;

  constructor(router: Router, serverConfig: ServerConfig = {}) {
    this.server = new McpServer({
      name   : serverConfig.name    || "anypoint-mcp",
      version: serverConfig.version || "1.0.0"
    });

    this.router = router;
    this.router.registerRoutes(this.server);
  }

  async connect(transport: Transport): Promise<void> {
    return this.server.connect(transport);
  }

  async close(): Promise<void> {
    return this.server.close();
  }
}

@injectable()
class ServerFactory {
  constructor(@inject(DI_TOKEN.MCPRouter) private readonly router: Router) {}

  create(config: ServerConfig): Server {
    return new Server(this.router, config);
  }
}


export { Server, ServerFactory };