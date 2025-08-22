const DI_TOKEN = {
  // Configuration
  Config: "Config",
  
  // Infrastructure Layer
  APIClient: "APIClient",
  CachedAPIClient: "CachedAPIClient",
  Authorizer: "Authorizer",
  CacheManager: "CacheManager",
  MCPRouter: "MCPRouter",
  
  // Repository Layer
  EnvironmentRepository: "EnvironmentRepository",
  DeploymentRepositoryFactory: "DeploymentRepositoryFactory", 
  LogRepositoryFactory: "LogRepositoryFactory",
  
  // Application Layer
  GetEnvironmentsUsecase: "GetEnvironmentsUsecase",
  GetDeploymentsUsecase: "GetDeploymentsUsecase",
  GetLogsUsecase: "GetLogsUsecase",
  
  // Interface Adapter Layer
  MCPResourcePresenter: "MCPResourcePresenter",
  MCPToolPresenter: "MCPToolPresenter",
  
  // Interface Adapter Layer 
  EnvironmentController: "EnvironmentController",
  DeploymentController: "DeploymentController", 
  LogController: "LogController",

  // Server Layer
  ServerFactory: "ServerFactory",
};

// 型定義
type DIToken = typeof DI_TOKEN[keyof typeof DI_TOKEN];

export { DI_TOKEN, type DIToken };