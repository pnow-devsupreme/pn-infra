/**
 * Authentication and Authorization Types
 */

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  avatarUrl?: string;
  githubId: string;
  role: UserRole;
  permissions: Permission[];
  createdAt: Date;
  lastLogin?: Date;
}

export type UserRole = 'admin' | 'developer' | 'viewer';

export type Permission = 
  | 'validate.cluster'
  | 'validate.platform'
  | 'validate.all'
  | 'deploy.cluster'
  | 'deploy.platform'
  | 'deploy.full'
  | 'reset.cluster'
  | 'reset.platform'
  | 'reset.full'
  | 'status.cluster'
  | 'status.platform'
  | 'status.all'
  | 'secrets.setup'
  | 'logs.view'
  | 'config.edit'
  | 'users.manage';

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  tokenType: 'Bearer';
  scope: string[];
}

export interface AuthSession {
  id: string;
  userId: string;
  token: AuthToken;
  createdAt: Date;
  expiresAt: Date;
  isValid: boolean;
  environment?: string;
}

export interface GitHubAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface AuthError extends Error {
  code: AuthErrorCode;
  details?: Record<string, unknown>;
}

export type AuthErrorCode =
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'INVALID_CREDENTIALS'
  | 'PERMISSION_DENIED'
  | 'AUTHENTICATION_REQUIRED'
  | 'AUTHORIZATION_FAILED'
  | 'GITHUB_API_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export interface PermissionCheck {
  permission: Permission;
  granted: boolean;
  reason?: string;
}

export interface RoleDefinition {
  name: UserRole;
  description: string;
  permissions: Permission[];
  isDefault?: boolean;
}

export interface AuthConfiguration {
  github: GitHubAuthConfig;
  roles: RoleDefinition[];
  tokenStorage: {
    encryptionKey: string;
    storageLocation: string;
  };
  session: {
    timeoutMinutes: number;
    refreshThresholdMinutes: number;
  };
}

export interface LoginRequest {
  code: string;
  state: string;
  codeVerifier: string;
}

export interface LoginResponse {
  user: User;
  session: AuthSession;
  isFirstLogin: boolean;
}

export interface LogoutRequest {
  sessionId: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
  sessionId: string;
}

export interface RefreshTokenResponse {
  token: AuthToken;
  session: AuthSession;
}