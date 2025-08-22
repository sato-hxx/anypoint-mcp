interface Authorizable {
  authorize(): Promise<AccessToken>;
  resetToken?(): void;
}

class AccessToken {
  constructor(public readonly accessToken: string, public readonly expiresIn: number, public readonly tokenType: string) {}
}

class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

interface AuthConfig {
  clientId: string;
  clientSecret: string;
}

class ClientCredentialsAuthorizer implements Authorizable {
  private cachedToken: AccessToken | null = null;
  private tokenPromise: Promise<AccessToken> | null = null;

  constructor(private readonly config: AuthConfig) {}

  resetToken(): void {
    this.cachedToken = null;
  }

  async authorize(): Promise<AccessToken> {
    if (this.cachedToken) {
      return this.cachedToken;
    }

    // 既に認証処理が進行中の場合は、その結果を待つ
    if (this.tokenPromise) {
      return this.tokenPromise;
    }

    // 新しい認証処理を開始
    this.tokenPromise = this.fetchToken();

    try {
      this.cachedToken = await this.tokenPromise;
      return this.cachedToken;
    }
    finally {
      // 認証処理完了後にPromiseをクリア
      this.tokenPromise = null;
    }
  }

  private async fetchToken(): Promise<AccessToken> {
    const response = await fetch(`https://anypoint.mulesoft.com/accounts/api/v2/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        grant_type: "client_credentials",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      }),
    });

    if (response.ok) {
      const payload = await response.json();
      return new AccessToken(payload.access_token, payload.expires_in, payload.token_type);
    } else {
      throw new AuthorizationError("failed to authorize");
    }
  }
}

export { type Authorizable, AccessToken, AuthorizationError, ClientCredentialsAuthorizer };