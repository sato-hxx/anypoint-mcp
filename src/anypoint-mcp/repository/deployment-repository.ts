import { APIClient } from "../api-client";
import { AbstractReadOnlyRepository, createJSONQueryBuilder, QueryBuilder, ResourceUnwrapper } from "../repository";

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

interface DeploymentTarget {
  provider: "MC" | "RTF" | "CH"; // MuleSoft Cloud, Runtime Fabric, CloudHub
  targetId: string;
}

interface ApplicationStatus {
  status: "RUNNING" | "STOPPED" | "STARTING" | "STOPPING" | "FAILED";
}

interface DeploymentResponse {
  id: string;
  name: string;
  creationDate: number; // Unix timestamp in milliseconds
  lastModifiedDate: number; // Unix timestamp in milliseconds
  target: DeploymentTarget;
  status: "APPLIED" | "APPLYING" | "FAILED" | "UNDEPLOYED" | "UNDEPLOYING";
  application: ApplicationStatus;
  currentRuntimeVersion: string; // Format: "4.9.7:23e-java17"
  lastSuccessfulRuntimeVersion: string;
}

class DeploymentRepository extends AbstractReadOnlyRepository<DeploymentResponse, DeploymentCriteria> {
  constructor(apiClient: APIClient, private readonly environmentId: string) {
    super(apiClient);
  }

  getResourcePath(): string {
    return `/amc/application-manager/api/v2/organizations/${this.apiClient.organizationId}/environments/${this.environmentId}/deployments`;
  }

  protected queryBuilder: QueryBuilder<DeploymentCriteria> = createJSONQueryBuilder<DeploymentCriteria>('deploymentQuery');

  protected resourceUnwrapper: ResourceUnwrapper<DeploymentResponse> = (payload: {items: DeploymentResponse[], total: number}) => payload.items;
}

export { DeploymentRepository, type DeploymentCriteria };