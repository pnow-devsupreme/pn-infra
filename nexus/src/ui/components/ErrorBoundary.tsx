import React, { Component, ReactNode } from 'react';
import { Box, Text } from 'ink';
import { logger } from '@/utils/logger';
import { errorHandler } from '@/utils/error-handler';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: string) => void;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const errorMessage = errorInfo.componentStack || 'Unknown component stack';
    
    this.setState({
      errorInfo: errorMessage
    });

    // Log the error
    logger.error('React Error Boundary caught an error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    }, error);

    // Handle the error using our error handler
    errorHandler.handleError(error).catch((handlingError) => {
      logger.error('Failed to handle React error', { handlingError });
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorMessage);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Box flexDirection="column" padding={2}>
          <Box marginBottom={1}>
            <Text color="red" bold>
              ⚠️  Application Error
            </Text>
          </Box>
          
          <Box marginBottom={1} padding={1} borderStyle="round" borderColor="red">
            <Box flexDirection="column">
              <Text color="red">
                Something went wrong in the application.
              </Text>
              {this.state.error && (
                <Text color="gray">
                  Error: {this.state.error.message}
                </Text>
              )}
            </Box>
          </Box>

          <Box flexDirection="column" marginBottom={1}>
            <Text color="yellow">Suggestions:</Text>
            <Text color="white">• Check the logs for more details</Text>
            <Text color="white">• Try restarting the application</Text>
            <Text color="white">• Report this issue if it persists</Text>
          </Box>

          <Box>
            <Text color="gray">
              Press Ctrl+C to exit
            </Text>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}