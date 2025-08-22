import { Authorizable } from "./authorizer";
import { Logger } from "./logger";

class HTTPError extends Error {
  constructor(message: string, public readonly status: number, public readonly statusText: string) {
    super(message);
    this.name = "HTTPError";
  }
}

interface APIClientConfig {
  baseUri?: string;
  timeout?: number;
  retryAttempts?: number;
}

class APIClient {
  public readonly baseUri: string;
  public readonly timeout: number;
  public readonly retryAttempts: number;

  constructor(private readonly authorizer: Authorizable,  public readonly organizationId: string, config: APIClientConfig = {}) {
    this.baseUri       = config.baseUri       || "https://anypoint.mulesoft.com";
    this.timeout       = config.timeout       || 30000;
    this.retryAttempts = config.retryAttempts || 3;
  }

  get<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('GET', path, undefined, headers);
  }

  post<T>(path: string, body: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('POST', path, body, headers);
  }

  put<T>(path: string, body: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('PUT', path, body, headers);
  }

  patch<T>(path: string, body: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('PATCH', path, body, headers);
  }

  remove(path: string, headers?: Record<string, string>): Promise<void> {
    return this.request<void>('DELETE', path, undefined, headers);
  }

  private async request<T>(method: string, path: string, body?: any, headers?: Record<string, string>, retryCount: number = 0): Promise<T> {
    const accessToken = await this.authorizer.authorize();
    
    const url = new URL(path, this.baseUri).toString();

    let init: RequestInit = {
      method: method,
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken.accessToken}`,
        ...headers,
      },
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      init.headers = {
        'Content-Type': 'application/json',
        ...init.headers
      };
      init.body = JSON.stringify(body);
    }

    Logger.getInstance().debug("Sending request", { method, path, body, headers });
    const response = await fetch(url, init);

    if (response.status === 204) {
      return null as T;
    }
    else if (response.status >= 200 && response.status <= 299) {
      const body = await response.json();
      Logger.getInstance().debug("Received response", { method, path, status: response.status, body });
      return body;
    }
    else if (response.status === 401 && retryCount === 0) {
      // 401エラーの場合、トークンを無効化して再試行
      Logger.getInstance().warn("Received 401 error, resetting token and retrying", { method, path, status: response.status, retryCount });
      this.resetToken();
      return this.request<T>(method, path, body, headers, retryCount + 1);
    }
    else {
      Logger.getInstance().error("HTTP request failed", { method, path, status: response.status, retryCount });
      throw new HTTPError(`failed to send request: ${response.status} ${response.statusText}`, response.status, response.statusText);
    }
  }

  private resetToken(): void {
    // Authorizerがトークン無効化メソッドを持っている場合、それを呼び出す
    this.authorizer.resetToken?.();
  }
}

export { APIClient, HTTPError, type APIClientConfig };