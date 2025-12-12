export interface User {
     userId: string;
     username: string;
     email: string;
     firstName: string;
     lastName: string;
     organizationId: string;
     roles: string[];
     mustChangePassword: boolean;
     lastLogin: string;
}

export interface LoginRequest {
     username: string;
     password: string;
     rememberMe?: boolean;
}

export interface LoginResponse {
     success: boolean;
     message: string;
     data: {
          accessToken: string;
          refreshToken: string;
          tokenType: string;
          expiresIn: number;
          refreshExpiresIn: number;
          userInfo: User;
     };
     timestamp: string;
}

export interface TokenPayload {
     exp: number;
     iat: number;
     jti: string;
     iss: string;
     aud: string;
     sub: string;
     typ: string;
     azp: string;
     sid: string;
     acr: string;
     allowed_origins: string[];
     realm_access: {
          roles: string[];
     };
     resource_access: {
          [key: string]: {
               roles: string[];
          };
     };
     scope: string;
     email_verified: boolean;
     name: string;
     preferred_username: string;
     given_name: string;
     family_name: string;
     email: string;
}

export interface AuthState {
     isAuthenticated: boolean;
     user: User | null;
     accessToken: string | null;
     refreshToken: string | null;
     loading: boolean;
     error: string | null;
}
