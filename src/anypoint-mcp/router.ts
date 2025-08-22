import { injectable, inject } from "tsyringe";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { EnvironmentController } from "./controllers/environment-controller";
import { DeploymentController } from "./controllers/deployment-controller";
import { LogController } from "./controllers/log-controller";
import { Logger } from "./logger";
import { Config } from "./config";
import { DI_TOKEN } from "./di/token";

@injectable()
export class Router {
  constructor(
    @inject(DI_TOKEN.Config) private readonly config: Config,
    @inject(DI_TOKEN.EnvironmentController) private readonly environmentController: EnvironmentController,
    @inject(DI_TOKEN.DeploymentController) private readonly deploymentController: DeploymentController,
    @inject(DI_TOKEN.LogController) private readonly logController: LogController
  ) {}

  registerRoutes(server: McpServer): void {
    this.registerEnvironmentResource(server);
    this.registerDeploymentResource(server);
    this.registerLogTool(server);
  }

  private registerEnvironmentResource(server: McpServer): void {
    server.registerResource(
      "environments",
      `anypoint://accounts/api/organizations/${this.config.organizationId}/environments`,
      {
        title: "MuleSoft Anypoint Platform Environments",
        description: `List of all environments (Design, Sandbox, Production) in the MuleSoft Anypoint organization with
          their configuration details including IDs, names, types, and permissions`,
        mimeType: "text/plain"
      },
      this.environmentController.getEnvironments
    );
  }

  private registerDeploymentResource(server: McpServer): void {
    server.registerResource(
      "deployments",
      new ResourceTemplate(
        `anypoint://amc/application-manager/api/v2/organizations/${this.config.organizationId}/environments/{environmentName}/deployments`,
        {
          list: undefined,
          complete: {
            environmentName: this.deploymentController.getEnvironmentNameCompletions
          }
        }
      ),
      {
        title: "MuleSoft Application Deployments",
        description: `List of deployed applications in a specific environment with
          their deployment status, runtime versions, target information, and application states (RUNNING, STOPPED, etc.)`
      },
      this.deploymentController.getDeployments
    );
  }

  private registerLogTool(server: McpServer): void {
    server.registerTool(
      "search-logs",
      {
        title: "Search Application Logs",
        description: "Search and filter application logs from MuleSoft deployments with advanced filtering options including time range, log levels, and message patterns",
        inputSchema: {
          environmentName: z.string()
            .describe(`Environment name -
              Specifies the target environment for log searching (e.g., Production, Sandbox, Design)`),

          deploymentName: z.string()
            .describe(`Deployment name - Specifies the target application deployment for log searching`),

          deploymentSpecVersion: z.string().optional()
            .describe(`Deployment spec version - Specifies a particular version to search logs for.
              If omitted, uses the latest version`),

          afterDocId: z.string().min(0).max(50).optional()
            .describe(`Document ID for pagination - Start searching from log entries after this ID.
              Used for pagination (0-50 characters)`),

          length: z.number().min(0).max(1000).optional()
            .describe(`Maximum number of log entries - Maximum number of log entries to retrieve in a single request
              (0-1000 entries, default value depends on API specification)`),

          startTime: z.string().datetime().optional()
            .transform(value => value ? new Date(value).getTime() : undefined)
            .describe(`Start time - Start time of the search period in ISO8601 format
              (e.g., '2022-01-01T00:00:00Z' or '2022-01-01T09:00:00+09:00')`),

          endTime: z.string().datetime().optional()
            .transform(value => value ? new Date(value).getTime() : undefined)
            .describe(`End time - End time of the search period in ISO8601 format
              (e.g., '2022-01-01T23:59:59Z' or '2022-01-01T23:59:59+09:00')`),

          regexp: z.string().min(0).max(240).optional()
            .describe(`Regular expression for message filtering - Regular expression pattern to filter log message content
              (0-240 characters)`),

          descending: z.boolean().optional()
            .describe(`Descending order mode - If true, displays from the latest logs.
              If false, displays from older logs (default: false)`),

          replicaId: z.array(z.string()).optional()
            .describe(`Replica IDs filter - Specify to search logs from specific replicas
              (Kubernetes pods, etc.) only (maximum 10 items)`),

          logLevel: z.array(z.enum(["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"])).optional()
            .describe(`Log level filter - Specifies target Log4J log levels for searching.
              Multiple selections allowed (maximum 10 items).
              Severity order: TRACE < DEBUG < INFO < WARN < ERROR < FATAL`),
        }
      },
      this.logController.searchLogs
    );
  }
}
