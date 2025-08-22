import { APIClient } from "../api-client";
import { AbstractReadOnlyRepository, createStringQueryBuilder, QueryBuilder, ResourceUnwrapper } from "../repository";

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

interface EnvironmentResponse {
  id: string;
  name: string;
  organizationId: string;
  isProduction: boolean;
  type: string;
  clientId: string;
  arcNamespace: string | null;
}

class EnvironmentRepository extends AbstractReadOnlyRepository<EnvironmentResponse, EnvironmentCriteria> {
  getResourcePath(): string {
    return `/accounts/api/organizations/${this.apiClient.organizationId}/environments`;
  }

  protected resourceUnwrapper: ResourceUnwrapper<EnvironmentResponse> = 
    (payload: {data: EnvironmentResponse[], total: number}) => payload.data;

  protected queryBuilder: QueryBuilder<EnvironmentCriteria> = createStringQueryBuilder<EnvironmentCriteria>();
}

export { EnvironmentRepository, type EnvironmentCriteria };