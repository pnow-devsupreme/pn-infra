/**
 * Session Manager (Temporary Stub for Testing)
 * 
 * This is a temporary implementation for testing the TUI.
 * Will be replaced with full better-auth implementation.
 */

import { logger } from '@/utils/logger';

export class AuthManager {
  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    // For testing, always return false so we see the welcome screen
    logger.debug('Checking authentication status (stub)');
    return false;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    logger.info('User logged out (stub)');
    // For testing, just log the action
  }
}

// Export singleton instance
export const authManager = new AuthManager();