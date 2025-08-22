import { injectable, inject } from "tsyringe";
import { EnvironmentResponse } from "../repositories/environment-repository";
import { GetEnvironmentsUsecase } from "../usecases/get-environments-usecase";
import { MCPResourcePresenter } from "../presenter";
import { DI_TOKEN } from "../di/token";

@injectable()
export class EnvironmentController {
  constructor(
    @inject(DI_TOKEN.GetEnvironmentsUsecase) private readonly getEnvironmentsUsecase: GetEnvironmentsUsecase,
    @inject(DI_TOKEN.MCPResourcePresenter) private readonly presenter: MCPResourcePresenter<EnvironmentResponse[]>
  ) {
    // メソッドをバインドして、thisを保持する
    this.getEnvironments = this.getEnvironments.bind(this);
  }

  async getEnvironments(uri: URL) {
    const environments = await this.getEnvironmentsUsecase.execute();
    return this.presenter.format(uri, environments);
  }
}
