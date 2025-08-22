import { injectable, inject } from "tsyringe";
import { LogCriteria, LogRepositoryFactory, LogResponse } from "../repositories/log-repository";
import { EnvironmentRepository } from "../repositories/environment-repository";
import { DeploymentRepositoryFactory } from "../repositories/deployment-repository";
import { DI_TOKEN } from "../di/token";

type LogLevel = "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

interface GetLogsUsecaseInput {
  environmentName: string;

  deploymentName: string;

  deploymentSpecVersion?: string | undefined;

  criteria?: LogCriteria | undefined;
}

@injectable()
class GetLogsUsecase {
  constructor(
    @inject(DI_TOKEN.EnvironmentRepository) private readonly environmentRepository: EnvironmentRepository, 
    @inject(DI_TOKEN.DeploymentRepositoryFactory) private readonly deploymentRepositoryFactory: DeploymentRepositoryFactory, 
    @inject(DI_TOKEN.LogRepositoryFactory) private readonly logRepositoryFactory: LogRepositoryFactory
  ) {}

  async execute(input: GetLogsUsecaseInput): Promise<LogResponse[]> {
    const env = (await this.environmentRepository.findAll()).find(env => env.name.toLowerCase() === input.environmentName.toLowerCase());
    if (! env) {
      throw new Error(`Environment ${input.environmentName} not found`);
    }

    const deploy = (await this.deploymentRepositoryFactory.create(env.id).findAllWithSpecs()).find(deploy => deploy.name.toLowerCase() === input.deploymentName.toLowerCase());
    if (! deploy) {
      throw new Error(`Deployment ${input.deploymentName} not found`);
    }
    // Supress warning
    if (! deploy.specs) {
      throw new Error(`Deployment ${input.deploymentName} has no specs`);
    }

    const spec = input.deploymentSpecVersion ? deploy.specs.find(spec => spec.version.toLowerCase() === input.deploymentSpecVersion!.toLowerCase()) : deploy.specs[0];
    if (! spec) {
      throw new Error(`Deployment spec ${input.deploymentSpecVersion} not found`);
    }

    return await this.logRepositoryFactory.create(env.id, deploy.id, spec.version).findAll(input.criteria);
  }
}

export { GetLogsUsecase };