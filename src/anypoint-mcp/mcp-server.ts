import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { APIClient } from "./api-client";
import { CachedAPIClient } from "./cached-api-client";
import { TTLBasedCacheManager } from "./cache-manager";
import { ClientCredentialsAuthorizer } from "./authorizer";
import { EnvironmentRepository } from "./repository/environment-repository";
import { DeploymentRepository } from "./repository/deployment-repository";
import { DeploymentSpecRepository, DeploymentSpecResponse} from "./repository/deployment-spec-repository";
import { LogCriteria, LogRepository } from "./repository/log-repository";
import { NameableFinder, VersionableFinder } from "./finder";
import { Config } from "./config";
import { getLogger } from "./logger";
import { z } from "zod";

interface MCPServerConfig {
  name?: string;
  version?: string;
}

class ResourceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResourceNotFoundError";
  }
}

class MCPServer {
  private readonly server: McpServer;
  private readonly apiClient: APIClient;
  private readonly config: Config;

  constructor(config: Config, serverConfig: MCPServerConfig = {}) {
    this.config = config;
    const logger = getLogger();
    
    this.server = new McpServer({
      name   : serverConfig.name    || "anypoint-mcp",
      version: serverConfig.version || "1.0.0"
    });

    logger.debug("Initializing MCP Server", {
      name: serverConfig.name || "anypoint-mcp",
      version: serverConfig.version || "1.0.0",
      organizationId: config.organizationId,
    });

    const authorizer = new ClientCredentialsAuthorizer(config.clientId, config.clientSecret);

    if (config.enableCache) {
      logger.debug("Initializing cache manager", {
        maxSize: `${Math.round(config.cache.maxSize / 1024 / 1024)}MB`,
        maxEntries: config.cache.maxEntries,
        cleanupInterval: `${config.cache.cleanupInterval / 1000}s`,
        defaultTTL: `${config.cache.defaultTTL / 1000}s`,
        resourceTTLCount: Object.keys(config.cache.resourceTTL).length,
      });

      const cacheManager = new TTLBasedCacheManager({
        maxCacheSize   : config.cache.maxSize,
        maxEntries     : config.cache.maxEntries,
        cleanupInterval: config.cache.cleanupInterval,
        defaultTTL     : config.cache.defaultTTL,
        resourceTTL    : config.cache.resourceTTL,
      });

      this.apiClient = new CachedAPIClient(
        authorizer, 
        config.organizationId, 
        cacheManager,
        {
          baseUri: config.api.baseUrl,
          timeout: config.api.timeout,
          retryAttempts: config.api.retryAttempts
        }
      );
      logger.info("API client initialized with caching enabled");
    }
    else {
      this.apiClient = new APIClient(authorizer, config.organizationId, {
        baseUri: config.api.baseUrl,
        timeout: config.api.timeout,
        retryAttempts: config.api.retryAttempts
      });
      logger.info("API client initialized without caching");
    }

    // リソースの登録
    logger.debug("Registering MCP resources");
    this.registerEnvironmentsResource();
    this.registerDeploymentsResource();
    this.registerDeploymentSpecsResource();

    // ツールの登録
    logger.debug("Registering MCP tools");
    this.registerDeploymentLogTool();
    
    logger.info("MCP Server initialization completed");
  }

  // MCP Server基本操作は委譲
  async connect(transport: Transport): Promise<void> {
    return this.server.connect(transport);
  }

  async close(): Promise<void> {
    return this.server.close();
  }

  private registerEnvironmentsResource(): void {
    // リソース登録は委譲先のサーバーに任せる
    this.server.registerResource(
      "environments",
      `anypoint://accounts/api/organizations/${this.apiClient.organizationId}/environments`,
      {
        title: "MuleSoft Anypoint Platform Environments",
        description: `List of all environments (Design, Sandbox, Production) in the MuleSoft Anypoint organization with
          their configuration details including IDs, names, types, and permissions`,
        mimeType: "text/plain"
      },
      async (uri) => {
        const environments = await new EnvironmentRepository(this.apiClient).findAll();
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(environments, null, 2)
          }]
        }
      }
    );
  }

  private registerDeploymentsResource(): void {
    this.server.registerResource(
      "deployments",
      new ResourceTemplate(
        `anypoint://amc/application-manager/api/v2/organizations/${this.apiClient.organizationId}/environments/{environmentName}/deployments`,
        {
          list: undefined,
          complete: {
            environmentName: async (value, context) => {
              const environments = await new EnvironmentRepository(this.apiClient).findAll();
              return environments.map(env => env.name).filter(name => name.toLowerCase().startsWith(value.toLowerCase()));
            }
          }
        }
      ),
      {
        title: "MuleSoft Application Deployments",
        description: `List of deployed applications in a specific environment with
          their deployment status, runtime versions, target information, and application states (RUNNING, STOPPED, etc.)`
      },
      async (uri, { environmentName }) => {
        const deployments = await this.getDeploymentsByEnvironmentName(environmentName as string);
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(deployments, null, 2)
          }]
        }
      }
    );
  }

  private registerDeploymentSpecsResource(): void {
    this.server.registerResource(
      "deployment-specs",
      new ResourceTemplate(
        `anypoint://amc/application-manager/api/v2/organizations/${this.apiClient.organizationId}/environments/{environmentName}/deployments/{deploymentName}/specs`,
        {
          list: undefined,
          complete: {
            environmentName: async (value, context) => {
              const environments = await new EnvironmentRepository(this.apiClient).findAll();
              return environments.map(env => env.name).filter(name => name.toLowerCase().startsWith(value.toLowerCase()));
            },
            deploymentName: async (value, context) => {
              const environmentName = context?.arguments?.["environmentName"];
              if (! environmentName) {
                return [];
              }
              const deployments = await this.getDeploymentsByEnvironmentName(environmentName);
              return deployments.map(deployment => deployment.name).filter(name => name.toLowerCase().startsWith(value.toLowerCase()));
            }
          }
        }
      ),
      {
        title: "MuleSoft Application Deployment Specifications",
        description: `Detailed deployment configuration and runtime specifications for a specific application deployment,
          including target settings, runtime versions, HTTP endpoints, resource allocation (vCores), JVM settings, and application properties`,
      },
      async (uri, { environmentName, deploymentName }) => {
        const specs = await this.getDeploymentSpecsByEnvironmentAndDeploymentName(<string>environmentName, <string>deploymentName);
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(specs, null, 2)
          }]
        }
      }
    );
  }

  // ログ検索ツールの登録
  private registerDeploymentLogTool(): void {
    this.server.registerTool(
      "search-logs",
      {
        title: "Search Application Logs",
        description: "Search and filter application logs from MuleSoft deployments with advanced filtering options including time range, log levels, and message patterns",
        inputSchema: {
          environmentName: z.string()
            .describe("Environment name - Specifies the target environment for log searching (e.g., Production, Sandbox, Design)"),
          deploymentName: z.string()
            .describe("Deployment name - Specifies the target application deployment for log searching"),
          deploymentSpecVersion: z.string().optional()
            .describe("Deployment spec version - Specifies a particular version to search logs for. If omitted, uses the latest version"),
          afterDocId: z.string().min(0).max(50).optional()
            .describe("Document ID for pagination - Start searching from log entries after this ID. Used for pagination (0-50 characters)"),
          length: z.number().min(0).max(1000).optional()
            .describe("Maximum number of log entries - Maximum number of log entries to retrieve in a single request (0-1000 entries, default value depends on API specification)"),
          startTime: z.string().datetime().optional()
            .transform(value => value ? new Date(value).getTime() : undefined)
            .describe("Start time - Start time of the search period in ISO8601 format (e.g., '2022-01-01T00:00:00Z' or '2022-01-01T09:00:00+09:00')"),
          endTime: z.string().datetime().optional()
            .transform(value => value ? new Date(value).getTime() : undefined)
            .describe("End time - End time of the search period in ISO8601 format (e.g., '2022-01-01T23:59:59Z' or '2022-01-01T23:59:59+09:00')"),
          regexp: z.string().min(0).max(240).optional()
            .describe("Regular expression for message filtering - Regular expression pattern to filter log message content (0-240 characters)"),
          descending: z.boolean().optional()
            .describe("Descending order mode - If true, displays from the latest logs. If false, displays from older logs (default: false)"),
          replicaId: z.array(z.string()).optional()
            .describe("Replica IDs filter - Specify to search logs from specific replicas (Kubernetes pods, etc.) only (maximum 10 items)"),
          logLevel: z.array(z.enum(["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"])).optional()
            .describe("Log level filter - Specifies target Log4J log levels for searching. Multiple selections allowed (maximum 10 items). Severity order: TRACE < DEBUG < INFO < WARN < ERROR < FATAL"),
        }
      },
      async ({ environmentName, deploymentName, deploymentSpecVersion, afterDocId, length, startTime, endTime, regexp, descending, replicaId, logLevel }) => {
        const logger = getLogger();
        
        logger.debug("Log search request", {
          environmentName,
          deploymentName,
          deploymentSpecVersion,
          logLevel,
          regexp,
        });

        const env = await new NameableFinder(new EnvironmentRepository(this.apiClient)).findByName(environmentName);
        if (! env) {
          logger.warn("Environment not found", { environmentName });
          throw new ResourceNotFoundError(`Environment ${environmentName} not found`);
        }

        const deployment = await new NameableFinder(new DeploymentRepository(this.apiClient, env.id)).findByName(deploymentName);
        if (! deployment) {
          logger.warn("Deployment not found", { deploymentName, environmentName });
          throw new ResourceNotFoundError(`Deployment ${deploymentName} not found`);
        }

        let deploymentSpec: DeploymentSpecResponse | undefined;
        if (deploymentSpecVersion) {
          deploymentSpec = await new VersionableFinder(new DeploymentSpecRepository(this.apiClient, env.id, deployment.id)).findByVersion(deploymentSpecVersion);
        }
        else {
          deploymentSpec = (await new DeploymentSpecRepository(this.apiClient, env.id, deployment.id).findAll())[0];
        }
        if (! deploymentSpec) {
          logger.warn("Deployment spec not found", { 
            deploymentSpecVersion, 
            deploymentName, 
            environmentName 
          });
          throw new ResourceNotFoundError(`Deployment spec ${deploymentSpecVersion} not found`);
        }

        // ログ検索条件の生成
        const logCriteria: LogCriteria = Object.fromEntries(Object.entries({afterDocId, length, startTime, endTime, regexp, descending, replicaId, logLevel})
          .filter(([_, value]) => value !== undefined && (! Array.isArray(value) || value.length > 0)));
        
        logger.debug("Executing log search", {
          environmentId: env.id,
          deploymentId: deployment.id,
          deploymentSpecVersion: deploymentSpec.version,
          criteria: logCriteria,
        });
        
        // ログ検索の実行
        const logs = await new LogRepository(this.apiClient, env.id, deployment.id, deploymentSpec.version).findAll(logCriteria);
        
        logger.info("Log search completed", {
          environmentName,
          deploymentName,
          logCount: Array.isArray(logs) ? logs.length : 0,
        });
        
        return {
          content: [{
            type: "text", 
            text: JSON.stringify(logs, null, 2)
          }]
        }
      }
    );
  }

  // ヘルパーメソッド
  private async getDeploymentsByEnvironmentName(envName: string) {
    const logger = getLogger();
    logger.debug("Getting deployments by environment name", { envName });
    
    const env = await new NameableFinder(new EnvironmentRepository(this.apiClient)).findByName(envName);
    if (! env) {
      logger.warn("Environment not found in helper method", { envName });
      throw new ResourceNotFoundError(`Environment ${envName} not found`);
    }
    
    const deployments = await new DeploymentRepository(this.apiClient, env.id).findAll();
    logger.debug("Deployments retrieved", { envName, count: deployments.length });
    return deployments;
  }

  private async getDeploymentSpecsByEnvironmentAndDeploymentName(envName: string, deploymentName: string) {
    const logger = getLogger();
    logger.debug("Getting deployment specs", { envName, deploymentName });
    
    const env = await new NameableFinder(new EnvironmentRepository(this.apiClient)).findByName(envName);
    if (! env) {
      logger.warn("Environment not found in helper method", { envName });
      throw new ResourceNotFoundError(`Environment ${envName} not found`);
    }
    
    const deployment = await new NameableFinder(new DeploymentRepository(this.apiClient, env.id)).findByName(deploymentName);
    if (! deployment) {
      logger.warn("Deployment not found in helper method", { deploymentName, envName });
      throw new ResourceNotFoundError(`Deployment ${deploymentName} not found`);
    }
    
    const specs = await new DeploymentSpecRepository(this.apiClient, env.id, deployment.id).findAll();
    logger.debug("Deployment specs retrieved", { envName, deploymentName, count: specs.length });
    return specs;
  }
}

export { MCPServer };