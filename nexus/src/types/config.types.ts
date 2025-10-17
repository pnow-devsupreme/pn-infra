/**
 * Configuration Types and Interfaces
 * 
 * Defines all configuration schemas for the Nexus application
 */

import { UserRole, Permission } from './auth.types';

export interface NexusConfig {
  app: AppConfig;
  auth: AuthConfig;
  infrastructure: InfrastructureConfig;
  ui: UIConfig;
  logging: LoggingConfig;
  deployment: DeploymentConfig;
}

export interface AppConfig {
  name: string;
  version: string;
  environment: Environment;
  debug: boolean;
  dataDirectory: string;
  workspaceDirectory: string;
  tempDirectory: string;
  repositoryUrl?: string;
  autoClone: boolean;
  defaultBranch: string;
}

export type Environment = 'development' | 'staging' | 'production';

export interface AuthConfig {
  github: GitHubConfig;
  session: SessionConfig;
  roles: RoleConfig[];
  security: SecurityConfig;
}

export interface GitHubConfig {
  clientId: string;
  clientSecret: string;
  appId?: string;
  privateKey?: string;
  redirectUri: string;
  scopes: string[];
  apiBaseUrl: string;
  allowedOrganizations?: string[];
  requiredTeams?: string[];
}

export interface SessionConfig {
  timeoutMinutes: number;
  refreshThresholdMinutes: number;
  maxConcurrentSessions: number;
  storageLocation: string;
  encryptionKey: string;
}

export interface RoleConfig {
  name: UserRole;
  description: string;
  permissions: Permission[];
  isDefault: boolean;
  conditions?: RoleCondition[];
}

export interface RoleCondition {
  type: 'organization' | 'team' | 'repository';
  values: string[];
  required: boolean;
}

export interface SecurityConfig {
  requireMFA: boolean;
  tokenRotationMinutes: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  allowedNetworks?: string[];
  requireSSL: boolean;
}

export interface InfrastructureConfig {
  clusters: ClusterConfig[];
  platforms: PlatformConfig[];
  environments: EnvironmentConfig[];
  validation: ValidationConfig;
  deployment: DeploymentStrategyConfig;
}

export interface ClusterConfig {
  name: string;
  type: 'k3s' | 'k8s' | 'eks' | 'gke' | 'aks';
  kubeconfig?: string;
  context?: string;
  namespace?: string;
  region?: string;
  provider?: 'aws' | 'gcp' | 'azure' | 'local';
  endpoints: {
    api: string;
    dashboard?: string;
    monitoring?: string;
  };
  credentials?: {
    tokenPath?: string;
    certPath?: string;
    keyPath?: string;
  };
  features: {
    monitoring: boolean;
    logging: boolean;
    backup: boolean;
    autoscaling: boolean;
  };
}

export interface PlatformConfig {
  name: string;
  description: string;
  components: ComponentConfig[];
  dependencies: string[];
  healthChecks: HealthCheckConfig[];
  rollback: RollbackConfig;
}

export interface ComponentConfig {
  name: string;
  type: 'helm' | 'kubectl' | 'kustomize' | 'terraform';
  path: string;
  namespace?: string;
  values?: Record<string, unknown>;
  dependencies: string[];
  enabled: boolean;
  critical: boolean;
}

export interface EnvironmentConfig {
  name: string;
  cluster: string;
  platform: string;
  variables: Record<string, string>;
  secrets: Record<string, string>;
  overrides: Record<string, unknown>;
}

export interface ValidationConfig {
  enabled: boolean;
  timeout: number;
  parallel: boolean;
  failFast: boolean;
  rules: ValidationRule[];
}

export interface ValidationRule {
  name: string;
  type: 'yaml' | 'helm' | 'k8s' | 'security' | 'policy';
  patterns: string[];
  enabled: boolean;
  severity: 'error' | 'warning' | 'info';
}

export interface DeploymentStrategyConfig {
  strategy: 'rolling' | 'blue-green' | 'canary' | 'recreate';
  timeout: number;
  progressDeadline: number;
  rollback: {
    enabled: boolean;
    automatic: boolean;
    threshold: number;
  };
  healthChecks: {
    enabled: boolean;
    interval: number;
    timeout: number;
    retries: number;
  };
}

export interface HealthCheckConfig {
  name: string;
  type: 'http' | 'tcp' | 'command' | 'k8s';
  target: string;
  interval: number;
  timeout: number;
  retries: number;
  successThreshold: number;
  failureThreshold: number;
}

export interface RollbackConfig {
  enabled: boolean;
  automatic: boolean;
  retainReleases: number;
  timeout: number;
  verifyRollback: boolean;
}

export interface UIConfig {
  theme: ThemeConfig;
  layout: LayoutConfig;
  interactive: InteractiveConfig;
  ascii: AsciiConfig;
}

export interface ThemeConfig {
  name: string;
  colors: ColorScheme;
  typography: TypographyConfig;
  spacing: SpacingConfig;
  borders: BorderConfig;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  background: string;
  surface: string;
  text: {
    primary: string;
    secondary: string;
    disabled: string;
  };
}

export interface TypographyConfig {
  fontFamily: string;
  fontSize: {
    small: number;
    medium: number;
    large: number;
    xlarge: number;
  };
  fontWeight: {
    normal: number;
    bold: number;
  };
}

export interface SpacingConfig {
  unit: number;
  small: number;
  medium: number;
  large: number;
  xlarge: number;
}

export interface BorderConfig {
  style: 'single' | 'double' | 'round' | 'bold' | 'singleDouble';
  width: number;
}

export interface LayoutConfig {
  header: {
    enabled: boolean;
    height: number;
    showLogo: boolean;
    showStatus: boolean;
  };
  sidebar: {
    enabled: boolean;
    width: number;
    position: 'left' | 'right';
  };
  footer: {
    enabled: boolean;
    height: number;
    showHelp: boolean;
    showStats: boolean;
  };
  content: {
    padding: number;
    maxWidth?: number;
  };
}

export interface InteractiveConfig {
  mode: 'interactive' | 'non-interactive' | 'auto';
  confirmations: {
    destructive: boolean;
    deployment: boolean;
    reset: boolean;
  };
  shortcuts: Record<string, string>;
  navigation: {
    vim: boolean;
    mouse: boolean;
    keyboard: boolean;
  };
}

export interface AsciiConfig {
  logo: {
    enabled: boolean;
    variant: 'full' | 'compact' | 'minimal';
    colors: boolean;
    animation: boolean;
  };
  banners: {
    welcome: boolean;
    success: boolean;
    error: boolean;
    warning: boolean;
  };
  progress: {
    style: 'bar' | 'dots' | 'spinner' | 'minimal';
    colors: boolean;
    speed: number;
  };
}

export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  format: 'json' | 'text' | 'structured';
  outputs: LogOutputConfig[];
  rotation: LogRotationConfig;
  correlation: {
    enabled: boolean;
    headerName: string;
  };
  audit: {
    enabled: boolean;
    events: string[];
  };
}

export interface LogOutputConfig {
  type: 'console' | 'file' | 'remote';
  level?: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface LogRotationConfig {
  enabled: boolean;
  maxSize: string;
  maxFiles: number;
  maxAge: string;
  compress: boolean;
}

export interface DeploymentConfig {
  packaging: PackagingConfig;
  distribution: DistributionConfig;
  updates: UpdateConfig;
}

export interface PackagingConfig {
  binary: {
    enabled: boolean;
    targets: string[];
    compression: boolean;
    minify: boolean;
  };
  npm: {
    enabled: boolean;
    registry: string;
    scope: string;
    access: 'public' | 'restricted';
  };
  docker: {
    enabled: boolean;
    registry: string;
    namespace: string;
    tags: string[];
  };
}

export interface DistributionConfig {
  channels: DistributionChannel[];
  signing: {
    enabled: boolean;
    keyPath: string;
    algorithm: string;
  };
  verification: {
    enabled: boolean;
    checksums: boolean;
    signatures: boolean;
  };
}

export interface DistributionChannel {
  name: string;
  type: 'github' | 'npm' | 'docker' | 'custom';
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface UpdateConfig {
  enabled: boolean;
  channel: 'stable' | 'beta' | 'alpha';
  checkInterval: number;
  automatic: boolean;
  notifications: boolean;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationWarning[];
}

export interface ConfigValidationError {
  path: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface ConfigValidationWarning {
  path: string;
  message: string;
  code: string;
  suggestion?: string;
}

export interface ConfigSource {
  type: 'file' | 'environment' | 'cli' | 'default';
  path?: string;
  priority: number;
}

export interface ConfigMergeOptions {
  mergeArrays: boolean;
  replaceArrays: boolean;
  allowUndefined: boolean;
  validateTypes: boolean;
}