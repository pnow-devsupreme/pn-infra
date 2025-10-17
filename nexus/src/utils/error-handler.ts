/**
 * Error Handler Utility
 * 
 * Provides centralized error handling, categorization, and recovery mechanisms
 */

import { logger } from './logger';

export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  CONFIGURATION = 'configuration',
  NETWORK = 'network',
  FILE_SYSTEM = 'file_system',
  INFRASTRUCTURE = 'infrastructure',
  VALIDATION = 'validation',
  USER_INPUT = 'user_input',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  category: ErrorCategory;
  severity: ErrorSeverity;
  recoverable: boolean;
  userFriendly: boolean;
  correlationId?: string;
  operation?: string;
  component?: string;
  metadata?: Record<string, unknown>;
}

export interface NexusError extends Error {
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  recoverable: boolean;
  userMessage: string;
  technicalMessage: string;
  context: ErrorContext;
  originalError?: Error;
  timestamp: Date;
  stack?: string;
}

export interface ErrorHandlingResult {
  handled: boolean;
  recovered: boolean;
  userMessage: string;
  shouldExit: boolean;
  retryPossible: boolean;
  suggestedActions: string[];
}

export interface RecoveryStrategy {
  name: string;
  applicable: (error: NexusError) => boolean;
  execute: (error: NexusError) => Promise<boolean>;
  maxAttempts: number;
  delayMs: number;
}

export class ErrorHandler {
  private recoveryStrategies: RecoveryStrategy[] = [];
  private errorCounts: Map<string, number> = new Map();
  private lastErrors: Map<string, Date> = new Map();

  constructor() {
    this.initializeRecoveryStrategies();
  }

  /**
   * Create a Nexus error
   */
  createError(
    message: string,
    code: string,
    context: Partial<ErrorContext>,
    originalError?: Error
  ): NexusError {
    const fullContext: ErrorContext = {
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      recoverable: false,
      userFriendly: true,
      ...context
    };

    const error = new Error(message) as NexusError;
    error.code = code;
    error.category = fullContext.category;
    error.severity = fullContext.severity;
    error.recoverable = fullContext.recoverable;
    error.userMessage = this.generateUserMessage(message, fullContext);
    error.technicalMessage = message;
    error.context = fullContext;
    error.originalError = originalError;
    error.timestamp = new Date();

    if (originalError?.stack) {
      error.stack = originalError.stack;
    }

    return error;
  }

  /**
   * Handle an error with appropriate recovery strategies
   */
  async handleError(error: Error | NexusError): Promise<ErrorHandlingResult> {
    const nexusError = this.ensureNexusError(error);
    
    // Log the error
    this.logError(nexusError);

    // Track error frequency
    this.trackError(nexusError);

    // Attempt recovery if applicable
    const recovered = nexusError.recoverable ? await this.attemptRecovery(nexusError) : false;

    // Generate handling result
    const result: ErrorHandlingResult = {
      handled: true,
      recovered,
      userMessage: nexusError.userMessage,
      shouldExit: this.shouldExit(nexusError),
      retryPossible: nexusError.recoverable && !recovered,
      suggestedActions: this.generateSuggestedActions(nexusError)
    };

    return result;
  }

  /**
   * Add a recovery strategy
   */
  addRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    for (const [code, count] of this.errorCounts.entries()) {
      stats[code] = count;
    }

    return stats;
  }

  /**
   * Clear error statistics
   */
  clearErrorStatistics(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }

  /**
   * Ensure error is a NexusError
   */
  private ensureNexusError(error: Error | NexusError): NexusError {
    if ('category' in error && 'severity' in error) {
      return error as NexusError;
    }

    // Convert regular error to NexusError
    return this.createError(
      error.message,
      'UNKNOWN_ERROR',
      {
        category: this.categorizeError(error),
        severity: ErrorSeverity.MEDIUM,
        recoverable: false,
        userFriendly: true
      },
      error
    );
  }

  /**
   * Categorize an error based on its properties
   */
  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (message.includes('auth') || message.includes('token') || message.includes('login')) {
      return ErrorCategory.AUTHENTICATION;
    }

    if (message.includes('permission') || message.includes('forbidden') || message.includes('unauthorized')) {
      return ErrorCategory.AUTHORIZATION;
    }

    if (message.includes('config') || message.includes('setting')) {
      return ErrorCategory.CONFIGURATION;
    }

    if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
      return ErrorCategory.NETWORK;
    }

    if (message.includes('file') || message.includes('directory') || message.includes('path')) {
      return ErrorCategory.FILE_SYSTEM;
    }

    if (message.includes('cluster') || message.includes('kubernetes') || message.includes('helm')) {
      return ErrorCategory.INFRASTRUCTURE;
    }

    if (message.includes('validation') || message.includes('invalid') || message.includes('schema')) {
      return ErrorCategory.VALIDATION;
    }

    if (name.includes('syntaxerror') || name.includes('typeerror')) {
      return ErrorCategory.USER_INPUT;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Generate user-friendly error message
   */
  private generateUserMessage(message: string, context: ErrorContext): string {
    if (!context.userFriendly) {
      return message;
    }

    const baseMessage = this.simplifyTechnicalMessage(message);
    const suggestions = this.getContextualSuggestions(context);

    if (suggestions.length > 0) {
      return `${baseMessage}\n\nSuggestions:\n${suggestions.map(s => `• ${s}`).join('\n')}`;
    }

    return baseMessage;
  }

  /**
   * Simplify technical error messages for users
   */
  private simplifyTechnicalMessage(message: string): string {
    const simplifications: Record<string, string> = {
      'ENOENT': 'File or directory not found',
      'EACCES': 'Permission denied',
      'EADDRINUSE': 'Port already in use',
      'ECONNREFUSED': 'Connection refused',
      'ETIMEDOUT': 'Operation timed out',
      'ENOTFOUND': 'Host not found',
      'UNAUTHORIZED': 'Authentication required',
      'FORBIDDEN': 'Access denied',
      'VALIDATION_ERROR': 'Invalid input provided',
      'CONFIG_ERROR': 'Configuration error'
    };

    for (const [code, simplified] of Object.entries(simplifications)) {
      if (message.includes(code)) {
        return simplified;
      }
    }

    return message;
  }

  /**
   * Get contextual suggestions based on error category
   */
  private getContextualSuggestions(context: ErrorContext): string[] {
    const suggestions: string[] = [];

    switch (context.category) {
      case ErrorCategory.AUTHENTICATION:
        suggestions.push('Check your GitHub credentials');
        suggestions.push('Verify your access token is valid');
        suggestions.push('Try logging out and logging back in');
        break;

      case ErrorCategory.AUTHORIZATION:
        suggestions.push('Verify you have the required permissions');
        suggestions.push('Contact your administrator for access');
        break;

      case ErrorCategory.CONFIGURATION:
        suggestions.push('Check your configuration file');
        suggestions.push('Verify environment variables are set');
        suggestions.push('Run with --config-debug for more details');
        break;

      case ErrorCategory.NETWORK:
        suggestions.push('Check your internet connection');
        suggestions.push('Verify firewall settings');
        suggestions.push('Try again in a few moments');
        break;

      case ErrorCategory.FILE_SYSTEM:
        suggestions.push('Check file permissions');
        suggestions.push('Verify the path exists');
        suggestions.push('Ensure sufficient disk space');
        break;

      case ErrorCategory.INFRASTRUCTURE:
        suggestions.push('Check cluster connectivity');
        suggestions.push('Verify kubeconfig is valid');
        suggestions.push('Check cluster status');
        break;

      case ErrorCategory.VALIDATION:
        suggestions.push('Check input format');
        suggestions.push('Verify required fields are provided');
        suggestions.push('Use --help for usage information');
        break;
    }

    return suggestions;
  }

  /**
   * Log error with appropriate level
   */
  private logError(error: NexusError): void {
    const logContext = {
      code: error.code,
      category: error.category,
      severity: error.severity,
      recoverable: error.recoverable,
      operation: error.context.operation,
      component: error.context.component,
      ...error.context.metadata
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error(`CRITICAL ERROR: ${error.technicalMessage}`, logContext, error.originalError);
        break;
      case ErrorSeverity.HIGH:
        logger.error(`HIGH SEVERITY: ${error.technicalMessage}`, logContext, error.originalError);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn(`MEDIUM SEVERITY: ${error.technicalMessage}`, logContext);
        break;
      case ErrorSeverity.LOW:
        logger.info(`LOW SEVERITY: ${error.technicalMessage}`, logContext);
        break;
    }
  }

  /**
   * Track error frequency
   */
  private trackError(error: NexusError): void {
    const count = this.errorCounts.get(error.code) || 0;
    this.errorCounts.set(error.code, count + 1);
    this.lastErrors.set(error.code, error.timestamp);
  }

  /**
   * Determine if application should exit
   */
  private shouldExit(error: NexusError): boolean {
    // Exit for critical errors
    if (error.severity === ErrorSeverity.CRITICAL) {
      return true;
    }

    // Exit if too many errors of the same type
    const errorCount = this.errorCounts.get(error.code) || 0;
    if (errorCount > 5) {
      return true;
    }

    // Exit for specific unrecoverable errors
    const fatalCodes = [
      'INVALID_CONFIG',
      'MISSING_DEPENDENCIES',
      'INITIALIZATION_FAILED'
    ];

    return fatalCodes.includes(error.code);
  }

  /**
   * Generate suggested actions
   */
  private generateSuggestedActions(error: NexusError): string[] {
    const actions: string[] = [];

    if (error.recoverable) {
      actions.push('Retry the operation');
    }

    if (error.category === ErrorCategory.CONFIGURATION) {
      actions.push('Check configuration file');
      actions.push('Run with --debug for more information');
    }

    if (error.category === ErrorCategory.NETWORK) {
      actions.push('Check network connectivity');
      actions.push('Verify proxy settings');
    }

    if (error.category === ErrorCategory.AUTHENTICATION) {
      actions.push('Re-authenticate with GitHub');
      actions.push('Check access token permissions');
    }

    actions.push('Check logs for more details');
    actions.push('Contact support if issue persists');

    return actions;
  }

  /**
   * Attempt recovery using available strategies
   */
  private async attemptRecovery(error: NexusError): Promise<boolean> {
    for (const strategy of this.recoveryStrategies) {
      if (strategy.applicable(error)) {
        logger.info(`Attempting recovery with strategy: ${strategy.name}`, {
          errorCode: error.code,
          strategy: strategy.name
        });

        for (let attempt = 1; attempt <= strategy.maxAttempts; attempt++) {
          try {
            const success = await strategy.execute(error);
            if (success) {
              logger.info(`Recovery successful with strategy: ${strategy.name}`, {
                errorCode: error.code,
                attempt
              });
              return true;
            }
          } catch (recoveryError) {
            logger.warn(`Recovery attempt failed`, {
              errorCode: error.code,
              strategy: strategy.name,
              attempt,
              recoveryError
            });
          }

          if (attempt < strategy.maxAttempts) {
            await this.delay(strategy.delayMs);
          }
        }
      }
    }

    return false;
  }

  /**
   * Initialize recovery strategies
   */
  private initializeRecoveryStrategies(): void {
    // Network retry strategy
    this.addRecoveryStrategy({
      name: 'network-retry',
      applicable: (error) => error.category === ErrorCategory.NETWORK,
      execute: async () => {
        await this.delay(1000);
        return true; // Simplified - would actually retry the operation
      },
      maxAttempts: 3,
      delayMs: 1000
    });

    // File system retry strategy
    this.addRecoveryStrategy({
      name: 'filesystem-retry',
      applicable: (error) => error.category === ErrorCategory.FILE_SYSTEM && error.code === 'ENOENT',
      execute: async () => {
        await this.delay(500);
        return true; // Simplified - would actually retry after ensuring directory exists
      },
      maxAttempts: 2,
      delayMs: 500
    });

    // Authentication refresh strategy
    this.addRecoveryStrategy({
      name: 'auth-refresh',
      applicable: (error) => error.category === ErrorCategory.AUTHENTICATION && error.code === 'TOKEN_EXPIRED',
      execute: async () => {
        // Would trigger token refresh
        return true;
      },
      maxAttempts: 1,
      delayMs: 0
    });
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

// Export error creation utilities
export const createAuthError = (message: string, code: string, originalError?: Error): NexusError =>
  errorHandler.createError(message, code, {
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.HIGH,
    recoverable: true,
    userFriendly: true
  }, originalError);

export const createConfigError = (message: string, code: string, originalError?: Error): NexusError =>
  errorHandler.createError(message, code, {
    category: ErrorCategory.CONFIGURATION,
    severity: ErrorSeverity.HIGH,
    recoverable: false,
    userFriendly: true
  }, originalError);

export const createNetworkError = (message: string, code: string, originalError?: Error): NexusError =>
  errorHandler.createError(message, code, {
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    recoverable: true,
    userFriendly: true
  }, originalError);

export const createInfrastructureError = (message: string, code: string, originalError?: Error): NexusError =>
  errorHandler.createError(message, code, {
    category: ErrorCategory.INFRASTRUCTURE,
    severity: ErrorSeverity.HIGH,
    recoverable: true,
    userFriendly: true
  }, originalError);