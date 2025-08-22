import { APIClient, HTTPError } from "./api-client";

class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotImplementedError";
  }
}

abstract class AbstractRepository<C, U, R, CRITERIA extends {}> {
  constructor(protected readonly apiClient: APIClient) {}

  public abstract getResourcePath(): string;

  protected buildQuery(criteria: CRITERIA): string {
    return Object.entries(criteria)
      .filter(([_, v]) => v !== undefined)
      .reduce((p, [k, v]) => { p.append(k, Array.isArray(v) ? v.join(',') : `${v}`); return p; }, new URLSearchParams())
      .toString();
  }

  protected unwrapResource(payload: any): R[] {
    return payload;
  }

  async create(request: C): Promise<R> {
    return this.apiClient.post<R>(this.getResourcePath(), request);
  }
  
  async findById(id: string): Promise<R | undefined> {
    try {
      return this.apiClient.get<R>(`${this.getResourcePath()}/${id}`);
    } catch (error) {
      if ((error instanceof HTTPError) && error.status === 404) {
        return undefined;
      }
      throw error;
    }
  }

  async findAll(criteria?: CRITERIA): Promise<R[]> {
    let url = this.getResourcePath();
    if (criteria) {
      url += `?${this.buildQuery(criteria)}`;
    }
    const resource = await this.apiClient.get<any>(url);
    return this.unwrapResource(resource);
  }

  async update(id: string, request: U): Promise<R> {
    return this.apiClient.put<R>(`${this.getResourcePath()}/${id}`, request);
  }

  async remove(id: string): Promise<void> {
    return this.apiClient.remove(`${this.getResourcePath()}/${id}`);
  }
}

abstract class AbstractReadOnlyRepository<R, CRITERIA extends {} = {}> extends AbstractRepository<undefined, undefined, R, CRITERIA> {
  async create(request: undefined): Promise<R> {
    throw new NotImplementedError("create is not implemented");
  }

  async update(id: string, request: undefined): Promise<R> {
    throw new NotImplementedError("update is not implemented");
  }

  async remove(id: string): Promise<void> {
    throw new NotImplementedError("remove is not implemented");
  }
}

export { AbstractRepository, AbstractReadOnlyRepository, NotImplementedError };