import { APIClient } from "../api-client";
import { injectable, inject } from "tsyringe";
import { AbstractReadOnlyRepository } from "../repository";
import { DI_TOKEN } from "../di/token";  

/**
 * 環境検索のクライテリア
 * Account API（Environment API）の仕様に基づく
 */
interface EnvironmentCriteria {
  /** ルート組織内でアクセス可能なすべての環境を返す。trueの場合、orgIdは有効なrootOrgIdである必要がある */
  expandAll?: string;
  
  /** 環境のタイプ（production, sandbox, design） */
  type?: string;
  
  /** 本番環境のみまたは非本番環境のみを返すかどうか */
  isProduction?: boolean;
  
  /** 環境名の大文字小文字を区別した完全一致 */
  name?: string;
  
  /** レスポンスから除外するレコード数（デフォルト: 0） */
  offset?: number;
  
  /** リクエストごとに取得する最大レコード数（デフォルト: 25、最大: 500） */
  limit?: number;
  
  /** 環境名の大文字小文字を区別しない部分一致検索文字列 */
  search?: string;
}

/**
 * 環境レスポンス
 * Account API（Environment API）の仕様に基づく
 */
interface EnvironmentResponse {
  /** 環境ID */
  id: string;

  /** 環境名 */
  name: string;

  /** 組織ID */
  organizationId: string;

  /** 本番環境かどうか */
  isProduction: boolean;

  /** 環境タイプ */
  type: string;

  /** クライアントID */
  clientId: string;

  /** アーク名前空間 */
  arcNamespace: string | null;
}

@injectable()
class EnvironmentRepository extends AbstractReadOnlyRepository<EnvironmentResponse, EnvironmentCriteria> {
  constructor(@inject(DI_TOKEN.APIClient) apiClient: APIClient) {
    super(apiClient);
  }
  getResourcePath(): string {
    return `/accounts/api/organizations/${this.apiClient.organizationId}/environments`;
  }

  protected unwrapResource(payload: {data: EnvironmentResponse[], total: number}): EnvironmentResponse[] {
    return payload.data;
  }
}

export { EnvironmentRepository, type EnvironmentCriteria, type EnvironmentResponse };