import { injectable, inject } from "tsyringe";
import { APIClient } from "../api-client";
import { AbstractReadOnlyRepository } from "../repository";
import { DI_TOKEN } from "../di/token";

/**
 * デプロイメント検索のクライテリア
 * AMC Application Manager APIの実際の仕様に基づく
 */
interface DeploymentCriteria {
  /** デプロイメントがデプロイされているターゲットのプロバイダー */
  provider?: "MC" | "RTF" | "CH";
  
  /** デプロイメントがデプロイされているターゲットのID（0-255文字） */
  targetId?: string;
  
  /** 結果取得用のオフセット */
  offset?: number;
  
  /** 取得する最大レコード数 */
  limit?: number;
}

// ------------------------------------------------------------
// デプロイメントのレスポンス
// ------------------------------------------------------------

interface DeploymentTarget {
  /** デプロイメントがデプロイされているターゲットのプロバイダー */ 
  provider: "MC" | "RTF" | "CH";

  /** デプロイメントがデプロイされているターゲットのID（0-255文字） */
  targetId: string;
}

interface ApplicationStatus {
  /** アプリケーションステータス */
  status: "RUNNING" | "STOPPED" | "STARTING" | "STOPPING" | "FAILED";
}

/**
 * デプロイメントレスポンス
 * AMC Application Manager APIの実際の仕様に基づく
 */
interface DeploymentResponse {
  /** デプロイメントID */
  id: string;

  /** デプロイメント名 */
  name: string;

  /** 作成日時（Unix timestamp in milliseconds） */
  creationDate: number; // Unix timestamp in milliseconds

  /** 最終更新日時（Unix timestamp in milliseconds） */
  lastModifiedDate: number; // Unix timestamp in milliseconds

  /** デプロイメントターゲット */
  target: DeploymentTarget;

  /** デプロイメントステータス */
  status: "APPLIED" | "APPLYING" | "FAILED" | "UNDEPLOYED" | "UNDEPLOYING";

  /** アプリケーションステータス */
  application: ApplicationStatus;

  /** 現在のランタイムバージョン */
  currentRuntimeVersion: string; // Format: "4.9.7:23e-java17"

  /** 最後に成功したランタイムバージョン */
  lastSuccessfulRuntimeVersion: string;

  /** デプロイメントスペック */
  specs?: DeploymentSpecResponse[]
}

// ------------------------------------------------------------
// デプロイメントのスペックのレスポンス
// ------------------------------------------------------------ 

interface HttpInbound {
  /** パブリックURL */
  publicUrl: string;

  /** 最終マイルセキュリティ */
  lastMileSecurity: boolean;

  /** 転送SSLセッション */
  forwardSslSession: boolean;

  /** 内部URL */
  internalUrl: string;
}

interface ResourceLimit {
  /** リソース制限 */
  limit: string;

  /** 予約済みリソース */
  reserved: string;
}

interface SidecarResources {
  cpu: ResourceLimit;
  memory: ResourceLimit;
}

interface Sidecar {
  /** イメージ */
  image: string;

  /** リソース */
  resources: SidecarResources;
}

interface DeploymentSettings {
  /** クラスタリング */
  clustered: boolean;

  /** ノード間でのデプロイの複製を強制 */
  enforceDeployingReplicasAcrossNodes: boolean;

  /** HTTP */
  http: {
    /** インバウンド */
    inbound: HttpInbound;
  };

  /** アウトバウンド */
  outbound: Record<string, any>;

  /** JVM */
  jvm: Record<string, any>;

  /** ランタイムバージョン */
  runtimeVersion: string;

  /** 更新戦略 */
  updateStrategy: string;

  /** ログ転送を無効にする */
  disableAmLogForwarding: boolean;

  /** 永続オブジェクトストア */
  persistentObjectStore: boolean;

  /** 監視スコープ */
  anypointMonitoringScope: string;

  /** サイドカー */
  sidecars: {
    [key: string]: Sidecar;
  };

  /** デフォルトのパブリックURLを生成 */
  generateDefaultPublicUrl: boolean;
}

interface Target {
  /** デプロイメント設定 */
  deploymentSettings: DeploymentSettings;

  /** レプリカ数 */
  replicas: number;
}

interface ApplicationRef {
  /** グループID */
  groupId: string;

  /** アーティファクトID */
  artifactId: string;

  /** バージョン */
  version: string;

  /** パッケージング */
  packaging: string;
}

interface LoggingService {
  /** アーティファクト名 */
  artifactName: string;

  /** スコープロギング設定 */
  scopeLoggingConfigurations: any[];
}

interface ApplicationPropertiesService {
  /** アプリケーション名 */
  applicationName: string;

  /** プロパティ */
  properties: {
    [key: string]: string;
  };
}

interface ApplicationConfiguration {
  /** アプリケーションプロパティサービス */
  "mule.agent.application.properties.service": ApplicationPropertiesService;

  /** ロギングサービス */
  "mule.agent.logging.service": LoggingService;
}

interface Application {
  /** ステータス */
  status: string | null;

  /** 希望する状態 */
  desiredState: "STARTED" | "STOPPED";

  /** アプリケーション参照 */
  ref: ApplicationRef;

  configuration: ApplicationConfiguration;
  vCores: number;
}

/**
 * デプロイメントスペックレスポンス
 * AMC Application Manager APIの実際の仕様に基づく
 */
interface DeploymentSpecResponse {
  /** バージョン */
  version: string;

  /** 作成日時（Unix timestamp in milliseconds） */
  createdAt: number; // Unix timestamp in milliseconds

  /** ターゲット */
  target: Target;

  /** アプリケーション */
  application: Application;
}

class DeploymentRepository extends AbstractReadOnlyRepository<DeploymentResponse, DeploymentCriteria> {
  constructor(protected readonly apiClient: APIClient, protected readonly environmentId: string) {
    super(apiClient);
  }

  // override
  getResourcePath(): string {
    return `/amc/application-manager/api/v2/organizations/${this.apiClient.organizationId}/environments/${this.environmentId}/deployments`;
  }

  // override
  protected buildQuery(criteria: DeploymentCriteria): string {
    const obj = Object.fromEntries(Object.entries(criteria).filter(([_, v]) => v !== undefined));
    return Object.keys(obj).length ? new URLSearchParams({ deploymentQuery: JSON.stringify(obj) }).toString() : '';
  }

  // override
  protected unwrapResource(payload: {items: DeploymentResponse[], total: number}): DeploymentResponse[] {
    return payload.items;
  }

  // eager loading
  async findByIdWithSpecs(id: string): Promise<DeploymentResponse | undefined> {
    const deployment = await this.findById(id);
    return deployment ? { ...deployment, specs: await this.apiClient.get<DeploymentSpecResponse[]>(`${this.getResourcePath()}/${deployment.id}/specs`) } : undefined;
  }

  // eager loading
  async findAllWithSpecs(criteria?: DeploymentCriteria): Promise<DeploymentResponse[]> {
    const deployments = await this.findAll(criteria);
    return Promise.all(deployments.map(async deployment => ({...deployment, specs: await this.apiClient.get<DeploymentSpecResponse[]>(`${this.getResourcePath()}/${deployment.id}/specs`)})));
  }
}

@injectable()
class DeploymentRepositoryFactory {
  constructor(@inject(DI_TOKEN.APIClient) protected readonly apiClient: APIClient) {}

  create(environmentId: string): DeploymentRepository {
    return new DeploymentRepository(this.apiClient, environmentId);
  }
}

export { DeploymentRepositoryFactory, DeploymentRepository, type DeploymentCriteria, type DeploymentResponse };