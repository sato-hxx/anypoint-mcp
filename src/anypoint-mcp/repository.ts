import { APIClient, HTTPError } from "./api-client";

class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotImplementedError";
  }
}

type ResourceUnwrapper<R> = (payload: any) => R[];

type QueryBuilder<CRITERIA extends {}> = (criteria: CRITERIA) => string;

const createStringQueryBuilder = <T extends {}>() => 
  (criteria: T): string => {
    return Object.entries(criteria)
      .filter(([_, v]) => v !== undefined)
      .reduce((p, [k, v]) => {
        p.append(k, Array.isArray(v) ? v.join(',') : `${v}`);
        return p;
      }, new URLSearchParams())
      .toString();
  };

const createJSONQueryBuilder = <T extends {}>(paramName: string) => 
  (criteria: T): string => {
    const obj = Object.fromEntries(Object.entries(criteria).filter(([_, v]) => v !== undefined));
    return Object.keys(obj).length ? new URLSearchParams({ [paramName]: JSON.stringify(obj) }).toString() : '';
  };

abstract class AbstractRepository<C, U, R, CRITERIA extends {}> {
  constructor(protected readonly apiClient: APIClient) {}

  protected resourceUnwrapper?: ResourceUnwrapper<R>;

  protected queryBuilder?: QueryBuilder<CRITERIA>;

  public abstract getResourcePath(): string;

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
    if (this.queryBuilder) {
      if (criteria) {
        const query = this.queryBuilder(criteria);
        if (query) {
          url += `?${query}`;
        }
      }
    }
    const resource = await this.apiClient.get<R[]>(url);
    if (!this.resourceUnwrapper) {
      return resource;
    }
    return this.resourceUnwrapper(resource);
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

export { AbstractRepository, NotImplementedError, AbstractReadOnlyRepository, type ResourceUnwrapper, type QueryBuilder, createJSONQueryBuilder, createStringQueryBuilder };