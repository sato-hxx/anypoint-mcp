import { injectable } from "tsyringe";

interface Presentable<T, U> {
  format(uri: URL, resource: T): U;
}

interface MCPResourceResponse {
  [x: string]: unknown;
  contents: {
    [x: string]: unknown;
    uri: string;
    text: string;
    mimeType?: string;
  }[];
}

@injectable()
class MCPResourcePresenter<T> implements Presentable<T, MCPResourceResponse> {
  format(uri: URL, resource: T): MCPResourceResponse {
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(resource, null, 2)
        }
      ]
    }
  }
}

interface MCPToolResponse {
  [x: string]: unknown;
  content: {
    [x: string]: unknown;
    type: "text";
    text: string;
  }[];
}

@injectable()
class MCPToolPresenter<T> {
  format(resource: T): MCPToolResponse {
    return {
      content: [{
        type: "text",
        text: JSON.stringify(resource, null, 2)
      }]
    };
  }
}

export { MCPResourcePresenter, MCPToolPresenter, type MCPResourceResponse, type MCPToolResponse };