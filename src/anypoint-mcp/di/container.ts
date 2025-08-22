import "reflect-metadata";
import { container } from "tsyringe";
import { DI_TOKEN } from "./token";
import { Config } from "../config";

// Infrastructure Layer
import { APIClient } from "../api-client";
import { CachedAPIClient } from "../cached-api-client";
import { ClientCredentialsAuthorizer } from "../authorizer";
import { TTLBasedCacheManager } from "../cache-manager";
import { Router } from "../router";

// Repository Layer
import { EnvironmentRepository } from "../repositories/environment-repository";
import { DeploymentRepositoryFactory } from "../repositories/deployment-repository";
import { LogRepositoryFactory } from "../repositories/log-repository";

// Application Layer
import { GetEnvironmentsUsecase } from "../usecases/get-environments-usecase";
import { GetDeploymentsUsecase } from "../usecases/get-deployments-usecase";
import { GetLogsUsecase } from "../usecases/get-logs-usecase";

// Interface Adapter Layer
import { MCPResourcePresenter, MCPToolPresenter } from "../presenter";

// Interface Adapter Layer 
import { EnvironmentController } from "../controllers/environment-controller";
import { DeploymentController } from "../controllers/deployment-controller";
import { LogController } from "../controllers/log-controller";
import { ServerFactory } from "../server";

export class DIContainer {
  static setup(config: Config): void {
    container.registerInstance(DI_TOKEN.Config, config);

    // Authorizer
    const authorizer = new ClientCredentialsAuthorizer(config.auth);
    container.registerInstance(DI_TOKEN.Authorizer, authorizer);

    if (config.enableCaching) {
      const cacheManager = new TTLBasedCacheManager(config.cache);
      container.registerInstance(DI_TOKEN.CacheManager, cacheManager);
      const apiClient = new CachedAPIClient(authorizer, config.organizationId, cacheManager, config.api);
      container.registerInstance(DI_TOKEN.APIClient, apiClient);
    }
    else {
      const apiClient = new APIClient(authorizer,config.organizationId, config.api);
      container.registerInstance(DI_TOKEN.APIClient, apiClient);
    }

    // Repository Layer - Singletons
    container.registerSingleton(DI_TOKEN.EnvironmentRepository, EnvironmentRepository);
    container.registerSingleton(DI_TOKEN.DeploymentRepositoryFactory, DeploymentRepositoryFactory);
    container.registerSingleton(DI_TOKEN.LogRepositoryFactory, LogRepositoryFactory);

    // Application Layer - Use Cases - Singletons
    container.registerSingleton(DI_TOKEN.GetEnvironmentsUsecase, GetEnvironmentsUsecase);
    container.registerSingleton(DI_TOKEN.GetDeploymentsUsecase, GetDeploymentsUsecase);
    container.registerSingleton(DI_TOKEN.GetLogsUsecase, GetLogsUsecase);

    // Interface Adapter Layer - Presenters - Transient (状態を持たないため)
    container.register(DI_TOKEN.MCPResourcePresenter, MCPResourcePresenter);
    container.register(DI_TOKEN.MCPToolPresenter, MCPToolPresenter);

    // Interface Adapter Layer - Controllers - Singletons
    container.registerSingleton(DI_TOKEN.EnvironmentController, EnvironmentController);
    container.registerSingleton(DI_TOKEN.DeploymentController, DeploymentController);
    container.registerSingleton(DI_TOKEN.LogController, LogController);

    // Infrastructure Layer - Router - Singleton
    container.registerSingleton(DI_TOKEN.MCPRouter, Router);

    // Server Layer - ServerFactory - Singleton
    container.registerSingleton(DI_TOKEN.ServerFactory, ServerFactory);
  }

  /**
   * 依存関係を解決してインスタンスを取得
   */
  static resolve<T>(token: string): T {
    return container.resolve<T>(token);
  }

  /**
   * コンテナをクリア（テスト用）
   */
  static clear(): void {
    container.clearInstances();
  }

  /**
   * 登録済みの依存関係を確認（デバッグ用）
   */
  static getRegistrations(): string[] {
    return Object.values(DI_TOKEN);
  }
}
