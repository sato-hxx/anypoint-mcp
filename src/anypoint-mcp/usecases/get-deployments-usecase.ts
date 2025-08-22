import { injectable, inject } from "tsyringe";
import { DeploymentRepositoryFactory, DeploymentResponse } from "../repositories/deployment-repository";
import { EnvironmentRepository } from "../repositories/environment-repository";
import { DI_TOKEN } from "../di/token";

interface GetDeploymentsUsecaseInput {
  environmentName: string;
}

@injectable()
class GetDeploymentsUsecase {
  constructor(
    @inject(DI_TOKEN.EnvironmentRepository) private readonly environmentRepository: EnvironmentRepository, 
    @inject(DI_TOKEN.DeploymentRepositoryFactory) private readonly deploymentRepositoryFactory: DeploymentRepositoryFactory
  ) {}

  async execute(input: GetDeploymentsUsecaseInput): Promise<DeploymentResponse[]> {
    const environmentId = (await this.environmentRepository.findAll()).find(environment => environment.name === input.environmentName)?.id;
    if (! environmentId) {
      throw new Error(`Environment ${input.environmentName} not found`);
    }
    return await this.deploymentRepositoryFactory.create(environmentId).findAllWithSpecs();
  }
}

export { GetDeploymentsUsecase };  