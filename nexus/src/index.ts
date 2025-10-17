#!/usr/bin/env node

/**
 * Nexus - ProficientNowTech Infrastructure Command Center
 * 
 * Main entry point for the Nexus TUI application.
 * Provides unified interface for infrastructure orchestration.
 */

import { render } from 'ink';
import React from 'react';
import { App } from './App';
import { logger } from '@/utils/logger';
import { configManager } from '@/utils/config-manager';

async function main(): Promise<void> {
  try {
    // Initialize configuration
    await configManager.initialize();
    
    // Initialize logger
    logger.info('Starting Nexus Infrastructure Command Center');
    
    // Render the main application
    render(React.createElement(App));
    
  } catch (error) {
    logger.error('Failed to start Nexus application', { error });
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

// Start the application
main().catch((error) => {
  logger.error('Application startup failed', { error });
  process.exit(1);
});