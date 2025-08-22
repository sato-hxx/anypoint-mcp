import { injectable, inject } from "tsyringe";
import { GetDeploymentsUsecase } from "../usecases/get-deployments-usecase";
import { GetEnvironmentsUsecase } from "../usecases/get-environments-usecase";
import { MCPResourcePresenter } from "../presenter";
import { DeploymentResponse } from "../repositories/deployment-repository";
import { DI_TOKEN } from "../di/token";

interface GetDeploymentsParams {
  environmentName?: string;
}

@injectable()
export class DeploymentController {
  constructor(
    @inject(DI_TOKEN.GetDeploymentsUsecase) private readonly getDeploymentsUsecase: GetDeploymentsUsecase,
    @inject(DI_TOKEN.GetEnvironmentsUsecase) private readonly getEnvironmentsUsecase: GetEnvironmentsUsecase,
    @inject(DI_TOKEN.MCPResourcePresenter) private readonly presenter: MCPResourcePresenter<DeploymentResponse[]>
  ) {
    // メソッドをバインドして、thisを保持
    this.getDeployments = this.getDeployments.bind(this);
    this.getEnvironmentNameCompletions = this.getEnvironmentNameCompletions.bind(this);
  }

  async getDeployments(uri: URL, params: GetDeploymentsParams) {
    const deployments = await this.getDeploymentsUsecase.execute({ environmentName: params.environmentName! });
    return this.presenter.format(uri, deployments);
  }

  async getEnvironmentNameCompletions(value: string): Promise<string[]> {
    const environments = await this.getEnvironmentsUsecase.execute();
    return environments.map(env => env.name).filter(name => name.toLowerCase().startsWith(value.toLowerCase()));
  }
}
