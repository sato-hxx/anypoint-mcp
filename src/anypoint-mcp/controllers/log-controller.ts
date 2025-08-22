import { injectable, inject } from "tsyringe";
import { Logger } from "../logger";
import { GetLogsUsecase } from "../usecases/get-logs-usecase";
import { LogCriteria, LogResponse } from "../repositories/log-repository";
import { MCPToolPresenter } from "../presenter";
import { DI_TOKEN } from "../di/token";

interface SearchLogsParams {
  environmentName: string;
  deploymentName: string;
  deploymentSpecVersion?: string | undefined;
  afterDocId?: string | undefined;
  length?: number | undefined;
  startTime?: number | undefined;
  endTime?: number | undefined;
  regexp?: string | undefined;
  descending?: boolean | undefined;
  replicaId?: string[] | undefined;
  logLevel?: Array<"TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL"> | undefined;
}

@injectable()
export class LogController {
  constructor(
    @inject(DI_TOKEN.GetLogsUsecase) private readonly getLogsUsecase: GetLogsUsecase,
    @inject(DI_TOKEN.MCPToolPresenter) private readonly presenter: MCPToolPresenter<LogResponse[]>
  ) {
    // メソッドをバインドして、thisを保持
    this.searchLogs = this.searchLogs.bind(this);
  }

  async searchLogs(params: SearchLogsParams) {
    // undefinedや空配列を除外してクライテリアを構築
    const criteria: LogCriteria = Object.fromEntries(
      Object.entries({
        afterDocId: params.afterDocId,
        length: params.length,
        startTime: params.startTime,
        endTime: params.endTime,
        regexp: params.regexp,
        descending: params.descending,
        replicaId: params.replicaId,
        logLevel: params.logLevel
      }).filter(([_, value]) => value !== undefined && (!Array.isArray(value) || value.length > 0))
    );

    const logs = await this.getLogsUsecase.execute({
      environmentName: params.environmentName,
      deploymentName: params.deploymentName,
      deploymentSpecVersion: params.deploymentSpecVersion,
      criteria
    });

    return this.presenter.format(logs);
  }
}
