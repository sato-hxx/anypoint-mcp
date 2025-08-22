import { injectable, inject } from "tsyringe";
import { EnvironmentRepository, EnvironmentResponse } from "../repositories/environment-repository";
import { DI_TOKEN } from "../di/token";

type Environment = EnvironmentResponse;

@injectable()
class GetEnvironmentsUsecase {
  constructor(@inject(DI_TOKEN.EnvironmentRepository) private readonly environmentRepository: EnvironmentRepository) {}

  async execute(): Promise<Environment[]> {
    return this.environmentRepository.findAll();
  }
}

export { GetEnvironmentsUsecase, type Environment };  