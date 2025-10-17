import React from 'react';
import { Box, Text } from 'ink';
import { configManager } from '@/utils/config-manager';

interface StatusBarProps {
  status?: string;
  user?: string;
  environment?: string;
  operation?: string;
  showHelp?: boolean;
  showStats?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  status = 'Ready',
  user,
  environment,
  operation,
  showHelp = true,
  showStats = false
}) => {
  const config = configManager.getConfig();
  const footerConfig = config.ui.layout.footer;
  const useColors = config.ui.theme.colors;

  if (!footerConfig.enabled) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ready':
        return useColors.success;
      case 'loading':
      case 'processing':
        return useColors.info;
      case 'error':
      case 'failed':
        return useColors.error;
      case 'warning':
        return useColors.warning;
      default:
        return useColors.text.primary;
    }
  };

  return (
    <Box 
      flexDirection="row" 
      justifyContent="space-between" 
      paddingX={1}
      borderStyle="single"
      borderColor={useColors.text.secondary}
    >
      {/* Left side - Status and current operation */}
      <Box flexDirection="row">
        <Text color={getStatusColor(status)}>● {status}</Text>
        {operation && (
          <>
            <Text color={useColors.text.secondary}> | </Text>
            <Text color={useColors.text.primary}>{operation}</Text>
          </>
        )}
        {user && (
          <>
            <Text color={useColors.text.secondary}> | </Text>
            <Text color={useColors.primary}>@{user}</Text>
          </>
        )}
        {environment && (
          <>
            <Text color={useColors.text.secondary}> | </Text>
            <Text color={useColors.accent}>{environment}</Text>
          </>
        )}
      </Box>

      {/* Right side - Help and stats */}
      <Box flexDirection="row">
        {showStats && (
          <>
            <Text color={useColors.text.secondary}>
              Memory: 45MB | CPU: 2%
            </Text>
            <Text color={useColors.text.secondary}> | </Text>
          </>
        )}
        {showHelp && (
          <Text color={useColors.text.secondary}>
            Press 'h' for help, 'q' to quit
          </Text>
        )}
      </Box>
    </Box>
  );
};