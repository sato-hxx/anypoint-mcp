import { APIClient } from "../api-client";
import { AbstractReadOnlyRepository, createJSONQueryBuilder, NotImplementedError, QueryBuilder, ResourceUnwrapper } from "../repository";

/**
 * Log4Jのログレベル
 */
type LogLevel = "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

/**
 * ログ検索のクライテリア
 * AMC Application Manager APIの実際の仕様に基づく
 */
interface LogCriteria {
  /** 読み込み開始位置のログエントリID（0-50文字） */
  afterDocId?: string;
  
  /** 取得する最大エントリ数（0-1000） */
  length?: number;
  
  /** 開始日時（エポック時間、ミリ秒） */
  startTime?: number;
  
  /** 終了日時（エポック時間、ミリ秒） */
  endTime?: number;
  
  /** メッセージ内容をフィルタする正規表現（0-240文字） */
  regexp?: string;
  
  /** 降順モード（trueの場合、古いエントリから表示） */
  descending?: boolean;
  
  /** フィルタするレプリカIDのリスト（最大10個） */
  replicaId?: string[];
  
  /** フィルタするログレベルのリスト（最大10個） */
  logLevel?: LogLevel[];
}

/**
 * ログエントリのレスポンス構造
 * 実際のAMC Application Manager APIのレスポンスに基づく
 */
interface LogResponse {
  /** ドキュメントID（ログエントリの一意識別子） */
  docId: string;
  
  /** ログが記録された日時（エポック時間、ミリ秒） */
  timestamp: number;
  
  /** ログメッセージの内容 */
  message: string;
  
  /** レプリカID（Kubernetesポッド名など） */
  replicaId: string;
  
  /** ログレベル（Log4Jの標準レベル） */
  logLevel: LogLevel;
  
  /** ログのコンテキスト情報 */
  context?: {
    /** ロガー名 */
    logger?: string;
    /** クラス名 */
    class?: string;
    /** その他のコンテキスト情報 */
    [key: string]: any;
  };
}

class LogRepository extends AbstractReadOnlyRepository<LogResponse, LogCriteria> {
  constructor(apiClient: APIClient, private readonly environmentId: string, private readonly deploymentId: string, private readonly deploymentSpecId: string) {
    super(apiClient);
  }

  getResourcePath(): string {
    return `/amc/application-manager/api/v2/organizations/${this.apiClient.organizationId}/environments/${this.environmentId}/deployments/${this.deploymentId}/specs/${this.deploymentSpecId}/logs`;
  }

  protected queryBuilder: QueryBuilder<LogCriteria> = createJSONQueryBuilder<LogCriteria>('search');

  async findById(id: string): Promise<LogResponse | undefined> {
    throw new NotImplementedError("Log entries are typically searched, not accessed by ID");
  }
}

export { LogRepository, type LogCriteria };