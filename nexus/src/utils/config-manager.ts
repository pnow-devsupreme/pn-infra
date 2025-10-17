/**
 * Configuration Manager
 * 
 * Handles hierarchical configuration loading, validation, and management
 */

import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { homedir } from 'os';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { 
  NexusConfig, 
  ConfigValidationResult, 
  ConfigValidationError,
  ConfigSource,
  ConfigMergeOptions,
  Environment 
} from '@/types/config.types';
import { logger } from './logger';

export class ConfigManager {
  private config: NexusConfig | null = null;
  private sources: ConfigSource[] = [];
  private readonly ajv: Ajv;
  private readonly configPaths: string[];

  constructor() {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
    
    this.configPaths = [
      path.join(process.cwd(), 'nexus.config.js'),
      path.join(process.cwd(), 'nexus.config.json'),
      path.join(process.cwd(), '.nexus', 'config.json'),
      path.join(homedir(), '.nexus', 'config.json'),
      path.join(homedir(), '.config', 'nexus', 'config.json'),
      '/etc/nexus/config.json',
    ];
  }

  /**
   * Initialize configuration manager
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing configuration manager');
      
      await this.loadConfiguration();
      await this.validateConfiguration();
      
      logger.info('Configuration manager initialized successfully', {
        sources: this.sources.length,
        environment: this.config?.app?.environment || 'unknown'
      });
    } catch (error) {
      logger.error('Failed to initialize configuration manager', { error });
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): NexusConfig {
    if (!this.config) {
      throw new Error('Configuration not initialized. Call initialize() first.');
    }
    return this.config;
  }

  /**
   * Get configuration value by path
   */
  get<T = unknown>(path: string, defaultValue?: T): T {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }

    const keys = path.split('.');
    let current: any = this.config;

    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return defaultValue as T;
      }
      current = current[key];
    }

    return current !== undefined ? current : (defaultValue as T);
  }

  /**
   * Set configuration value by path
   */
  set(path: string, value: unknown): void {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }

    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current: any = this.config;

    for (const key of keys) {
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
  }

  /**
   * Reload configuration from all sources
   */
  async reload(): Promise<void> {
    logger.info('Reloading configuration');
    this.config = null;
    this.sources = [];
    await this.initialize();
  }

  /**
   * Save current configuration to primary config file
   */
  async save(): Promise<void> {
    if (!this.config) {
      throw new Error('No configuration to save');
    }

    const primaryConfigPath = this.configPaths[0];
    const configDir = path.dirname(primaryConfigPath);

    try {
      // Ensure config directory exists
      await fs.mkdir(configDir, { recursive: true });

      // Write configuration
      await fs.writeFile(
        primaryConfigPath,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      );

      logger.info('Configuration saved successfully', { path: primaryConfigPath });
    } catch (error) {
      logger.error('Failed to save configuration', { error, path: primaryConfigPath });
      throw error;
    }
  }

  /**
   * Load configuration from all sources
   */
  private async loadConfiguration(): Promise<void> {
    const configs: Array<{ config: Partial<NexusConfig>; source: ConfigSource }> = [];

    // Load default configuration
    configs.push({
      config: this.getDefaultConfig(),
      source: { type: 'default', priority: 0 }
    });

    // Load from files
    for (const [index, configPath] of this.configPaths.entries()) {
      try {
        if (existsSync(configPath)) {
          const fileConfig = await this.loadFromFile(configPath);
          configs.push({
            config: fileConfig,
            source: { 
              type: 'file', 
              path: configPath, 
              priority: index + 1 
            }
          });
        }
      } catch (error) {
        logger.warn('Failed to load config file', { path: configPath, error });
      }
    }

    // Load from environment variables
    const envConfig = this.loadFromEnvironment();
    if (Object.keys(envConfig).length > 0) {
      configs.push({
        config: envConfig,
        source: { type: 'environment', priority: 1000 }
      });
    }

    // Load from CLI arguments
    const cliConfig = this.loadFromCLI();
    if (Object.keys(cliConfig).length > 0) {
      configs.push({
        config: cliConfig,
        source: { type: 'cli', priority: 2000 }
      });
    }

    // Sort by priority and merge
    configs.sort((a, b) => a.source.priority - b.source.priority);
    
    this.config = this.mergeConfigs(
      configs.map(c => c.config),
      { mergeArrays: true, replaceArrays: false, allowUndefined: false, validateTypes: true }
    );

    this.sources = configs.map(c => c.source);

    logger.debug('Configuration loaded from sources', {
      sources: this.sources.length,
      paths: this.sources.filter(s => s.path).map(s => s.path)
    });
  }

  /**
   * Load configuration from file
   */
  private async loadFromFile(filePath: string): Promise<Partial<NexusConfig>> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      if (filePath.endsWith('.js')) {
        // For .js files, we would need to use dynamic import
        // For now, treating as JSON
        return JSON.parse(content);
      } else {
        return JSON.parse(content);
      }
    } catch (error) {
      logger.error('Failed to parse config file', { path: filePath, error });
      throw new Error(`Invalid configuration file: ${filePath}`);
    }
  }

  /**
   * Load configuration from environment variables
   */
  private loadFromEnvironment(): Partial<NexusConfig> {
    const config: any = {};

    // Environment mapping
    const envMappings = {
      'NEXUS_ENV': 'app.environment',
      'NEXUS_DEBUG': 'app.debug',
      'NEXUS_DATA_DIR': 'app.dataDirectory',
      'NEXUS_WORKSPACE_DIR': 'app.workspaceDirectory',
      'NEXUS_REPO_URL': 'app.repositoryUrl',
      'NEXUS_AUTO_CLONE': 'app.autoClone',
      'GITHUB_CLIENT_ID': 'auth.github.clientId',
      'GITHUB_CLIENT_SECRET': 'auth.github.clientSecret',
      'GITHUB_REDIRECT_URI': 'auth.github.redirectUri',
      'NEXUS_LOG_LEVEL': 'logging.level',
      'NEXUS_SESSION_TIMEOUT': 'auth.session.timeoutMinutes',
    };

    for (const [envVar, configPath] of Object.entries(envMappings)) {
      const value = process.env[envVar];
      if (value !== undefined) {
        this.setConfigValue(config, configPath, this.parseEnvValue(value));
      }
    }

    return config;
  }

  /**
   * Load configuration from CLI arguments
   */
  private loadFromCLI(): Partial<NexusConfig> {
    const config: any = {};
    const args = process.argv.slice(2);

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg.startsWith('--config-')) {
        const key = arg.replace('--config-', '').replace(/-/g, '.');
        const value = args[i + 1];
        if (value && !value.startsWith('--')) {
          this.setConfigValue(config, key, this.parseEnvValue(value));
          i++; // Skip next argument
        }
      }
    }

    return config;
  }

  /**
   * Set nested configuration value
   */
  private setConfigValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current = obj;

    for (const key of keys) {
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
  }

  /**
   * Parse environment variable value
   */
  private parseEnvValue(value: string): any {
    // Try to parse as JSON first
    try {
      return JSON.parse(value);
    } catch {
      // Try to parse as boolean
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
      
      // Try to parse as number
      const num = Number(value);
      if (!isNaN(num) && isFinite(num)) return num;
      
      // Return as string
      return value;
    }
  }

  /**
   * Merge multiple configurations
   */
  private mergeConfigs(configs: Partial<NexusConfig>[], options: ConfigMergeOptions): NexusConfig {
    let result: any = {};

    for (const config of configs) {
      result = this.deepMerge(result, config, options);
    }

    return result as NexusConfig;
  }

  /**
   * Deep merge objects
   */
  private deepMerge(target: any, source: any, options: ConfigMergeOptions): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] === undefined && !options.allowUndefined) {
        continue;
      }

      if (Array.isArray(source[key])) {
        if (options.replaceArrays) {
          result[key] = source[key];
        } else if (options.mergeArrays && Array.isArray(target[key])) {
          result[key] = [...target[key], ...source[key]];
        } else {
          result[key] = source[key];
        }
      } else if (source[key] !== null && typeof source[key] === 'object') {
        result[key] = this.deepMerge(target[key] || {}, source[key], options);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Validate configuration
   */
  private async validateConfiguration(): Promise<void> {
    if (!this.config) {
      throw new Error('No configuration to validate');
    }

    const result = this.validateConfig(this.config);
    
    if (!result.valid) {
      const errors = result.errors.filter(e => e.severity === 'error');
      if (errors.length > 0) {
        logger.error('Configuration validation failed', { errors });
        throw new Error(`Configuration validation failed: ${errors[0].message}`);
      }
    }

    const warnings = result.errors.filter(e => e.severity === 'warning');
    if (warnings.length > 0) {
      logger.warn('Configuration validation warnings', { warnings });
    }
  }

  /**
   * Validate configuration against schema
   */
  validateConfig(config: NexusConfig): ConfigValidationResult {
    const errors: ConfigValidationError[] = [];

    // Basic validation
    try {
      this.validateBasicStructure(config, errors);
      this.validateAuthConfig(config.auth, errors);
      this.validateInfrastructureConfig(config.infrastructure, errors);
      this.validateUIConfig(config.ui, errors);
      this.validateLoggingConfig(config.logging, errors);
    } catch (error) {
      errors.push({
        path: 'root',
        message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
        code: 'VALIDATION_ERROR',
        severity: 'error'
      });
    }

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings: errors.filter(e => e.severity === 'warning')
    };
  }

  /**
   * Validate basic configuration structure
   */
  private validateBasicStructure(config: NexusConfig, errors: ConfigValidationError[]): void {
    if (!config.app?.name) {
      errors.push({
        path: 'app.name',
        message: 'App name is required',
        code: 'REQUIRED_FIELD',
        severity: 'error'
      });
    }

    if (!config.app?.version) {
      errors.push({
        path: 'app.version',
        message: 'App version is required',
        code: 'REQUIRED_FIELD',
        severity: 'error'
      });
    }

    const validEnvironments: Environment[] = ['development', 'staging', 'production'];
    if (!validEnvironments.includes(config.app?.environment)) {
      errors.push({
        path: 'app.environment',
        message: `Invalid environment. Must be one of: ${validEnvironments.join(', ')}`,
        code: 'INVALID_VALUE',
        severity: 'error'
      });
    }
  }

  /**
   * Validate authentication configuration
   */
  private validateAuthConfig(auth: any, errors: ConfigValidationError[]): void {
    if (!auth?.github?.clientId) {
      errors.push({
        path: 'auth.github.clientId',
        message: 'GitHub client ID is required',
        code: 'REQUIRED_FIELD',
        severity: 'error'
      });
    }

    if (!auth?.github?.clientSecret) {
      errors.push({
        path: 'auth.github.clientSecret',
        message: 'GitHub client secret is required',
        code: 'REQUIRED_FIELD',
        severity: 'error'
      });
    }

    if (auth?.session?.timeoutMinutes < 1) {
      errors.push({
        path: 'auth.session.timeoutMinutes',
        message: 'Session timeout must be at least 1 minute',
        code: 'INVALID_VALUE',
        severity: 'error'
      });
    }
  }

  /**
   * Validate infrastructure configuration
   */
  private validateInfrastructureConfig(infrastructure: any, errors: ConfigValidationError[]): void {
    if (!Array.isArray(infrastructure?.clusters)) {
      errors.push({
        path: 'infrastructure.clusters',
        message: 'Clusters must be an array',
        code: 'INVALID_TYPE',
        severity: 'error'
      });
    }

    if (!Array.isArray(infrastructure?.platforms)) {
      errors.push({
        path: 'infrastructure.platforms',
        message: 'Platforms must be an array',
        code: 'INVALID_TYPE',
        severity: 'error'
      });
    }
  }

  /**
   * Validate UI configuration
   */
  private validateUIConfig(ui: any, errors: ConfigValidationError[]): void {
    if (ui?.theme?.name && typeof ui.theme.name !== 'string') {
      errors.push({
        path: 'ui.theme.name',
        message: 'Theme name must be a string',
        code: 'INVALID_TYPE',
        severity: 'warning'
      });
    }
  }

  /**
   * Validate logging configuration
   */
  private validateLoggingConfig(logging: any, errors: ConfigValidationError[]): void {
    const validLevels = ['error', 'warn', 'info', 'debug', 'trace'];
    if (!validLevels.includes(logging?.level)) {
      errors.push({
        path: 'logging.level',
        message: `Invalid log level. Must be one of: ${validLevels.join(', ')}`,
        code: 'INVALID_VALUE',
        severity: 'error'
      });
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): NexusConfig {
    return {
      app: {
        name: 'Nexus',
        version: '1.0.0',
        environment: 'development',
        debug: false,
        dataDirectory: path.join(homedir(), '.nexus', 'data'),
        workspaceDirectory: path.join(homedir(), '.nexus', 'workspace'),
        tempDirectory: path.join(homedir(), '.nexus', 'tmp'),
        autoClone: true,
        defaultBranch: 'main'
      },
      auth: {
        github: {
          clientId: '',
          clientSecret: '',
          redirectUri: 'http://localhost:8080/auth/callback',
          scopes: ['read:user', 'read:org'],
          apiBaseUrl: 'https://api.github.com'
        },
        session: {
          timeoutMinutes: 480,
          refreshThresholdMinutes: 60,
          maxConcurrentSessions: 3,
          storageLocation: path.join(homedir(), '.nexus', 'sessions'),
          encryptionKey: ''
        },
        roles: [
          {
            name: 'admin',
            description: 'Full system access',
            permissions: [
              'validate.all', 'deploy.full', 'reset.full', 'status.all',
              'secrets.setup', 'logs.view', 'config.edit', 'users.manage'
            ],
            isDefault: false
          },
          {
            name: 'developer',
            description: 'Development and deployment access',
            permissions: [
              'validate.platform', 'deploy.platform', 'reset.platform',
              'status.all', 'logs.view'
            ],
            isDefault: true
          },
          {
            name: 'viewer',
            description: 'Read-only access',
            permissions: ['status.all', 'logs.view'],
            isDefault: false
          }
        ],
        security: {
          requireMFA: false,
          tokenRotationMinutes: 60,
          maxLoginAttempts: 5,
          lockoutDurationMinutes: 15,
          requireSSL: true
        }
      },
      infrastructure: {
        clusters: [],
        platforms: [],
        environments: [],
        validation: {
          enabled: true,
          timeout: 300,
          parallel: true,
          failFast: false,
          rules: []
        },
        deployment: {
          strategy: 'rolling',
          timeout: 600,
          progressDeadline: 600,
          rollback: {
            enabled: true,
            automatic: false,
            threshold: 3
          },
          healthChecks: {
            enabled: true,
            interval: 30,
            timeout: 10,
            retries: 3
          }
        }
      },
      ui: {
        theme: {
          name: 'default',
          colors: {
            primary: '#0070f3',
            secondary: '#666666',
            accent: '#7928ca',
            success: '#0070f3',
            warning: '#f5a623',
            error: '#e00',
            info: '#0070f3',
            background: '#000000',
            surface: '#111111',
            text: {
              primary: '#ffffff',
              secondary: '#888888',
              disabled: '#444444'
            }
          },
          typography: {
            fontFamily: 'monospace',
            fontSize: {
              small: 12,
              medium: 14,
              large: 16,
              xlarge: 18
            },
            fontWeight: {
              normal: 400,
              bold: 700
            }
          },
          spacing: {
            unit: 4,
            small: 8,
            medium: 16,
            large: 24,
            xlarge: 32
          },
          borders: {
            style: 'round',
            width: 1
          }
        },
        layout: {
          header: {
            enabled: true,
            height: 3,
            showLogo: true,
            showStatus: true
          },
          sidebar: {
            enabled: false,
            width: 20,
            position: 'left'
          },
          footer: {
            enabled: true,
            height: 2,
            showHelp: true,
            showStats: false
          },
          content: {
            padding: 1
          }
        },
        interactive: {
          mode: 'auto',
          confirmations: {
            destructive: true,
            deployment: true,
            reset: true
          },
          shortcuts: {
            'q': 'quit',
            'h': 'help',
            'r': 'refresh',
            'ctrl+c': 'quit'
          },
          navigation: {
            vim: true,
            mouse: false,
            keyboard: true
          }
        },
        ascii: {
          logo: {
            enabled: true,
            variant: 'full',
            colors: true,
            animation: false
          },
          banners: {
            welcome: true,
            success: true,
            error: true,
            warning: true
          },
          progress: {
            style: 'bar',
            colors: true,
            speed: 100
          }
        }
      },
      logging: {
        level: 'info',
        format: 'structured',
        outputs: [
          {
            type: 'console',
            enabled: true,
            config: {}
          },
          {
            type: 'file',
            enabled: true,
            config: {
              filename: 'nexus.log'
            }
          }
        ],
        rotation: {
          enabled: true,
          maxSize: '10MB',
          maxFiles: 5,
          maxAge: '30d',
          compress: true
        },
        correlation: {
          enabled: true,
          headerName: 'x-correlation-id'
        },
        audit: {
          enabled: true,
          events: ['auth', 'deploy', 'reset', 'config']
        }
      },
      deployment: {
        packaging: {
          binary: {
            enabled: true,
            targets: ['linux-x64', 'darwin-x64', 'win32-x64'],
            compression: true,
            minify: true
          },
          npm: {
            enabled: true,
            registry: 'https://registry.npmjs.org',
            scope: '@proficientnowtech',
            access: 'public'
          },
          docker: {
            enabled: false,
            registry: 'ghcr.io',
            namespace: 'proficientnowtech',
            tags: ['latest']
          }
        },
        distribution: {
          channels: [
            {
              name: 'github',
              type: 'github',
              enabled: true,
              config: {}
            }
          ],
          signing: {
            enabled: false,
            keyPath: '',
            algorithm: 'RSA-SHA256'
          },
          verification: {
            enabled: true,
            checksums: true,
            signatures: false
          }
        },
        updates: {
          enabled: true,
          channel: 'stable',
          checkInterval: 86400,
          automatic: false,
          notifications: true
        }
      }
    };
  }
}

// Export singleton instance
export const configManager = new ConfigManager();