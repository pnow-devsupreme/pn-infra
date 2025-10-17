import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Banner } from '@/components/Banner';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBar } from '@/components/StatusBar';
import { configManager } from '@/utils/config-manager';
import { logger } from '@/utils/logger';

interface WelcomeScreenProps {
  onStartAuth: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStartAuth }) => {
  const [selectedOption, setSelectedOption] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const config = configManager.getConfig();

  const options = [
    {
      key: 'auth',
      label: 'Authenticate with GitHub',
      description: 'Sign in to access infrastructure management',
      action: () => {
        logger.info('User selected GitHub authentication');
        setIsLoading(true);
        setTimeout(() => {
          onStartAuth();
        }, 500);
      }
    },
    {
      key: 'help',
      label: 'View Help & Documentation',
      description: 'Learn how to use Nexus effectively',
      action: () => {
        logger.info('User requested help documentation');
        // TODO: Implement help screen
      }
    },
    {
      key: 'config',
      label: 'Configuration Settings',
      description: 'Configure Nexus for your environment',
      action: () => {
        logger.info('User requested configuration settings');
        // TODO: Implement config screen
      }
    },
    {
      key: 'quit',
      label: 'Exit Application',
      description: 'Close Nexus',
      action: () => {
        logger.info('User requested exit');
        process.exit(0);
      }
    }
  ];

  useInput((input, key) => {
    if (isLoading) return;

    if (key.upArrow) {
      setSelectedOption(prev => prev > 0 ? prev - 1 : options.length - 1);
    } else if (key.downArrow) {
      setSelectedOption(prev => prev < options.length - 1 ? prev + 1 : 0);
    } else if (key.return) {
      options[selectedOption].action();
    } else if (input === 'q') {
      process.exit(0);
    } else if (input === 'h') {
      // Quick help
      options.find(opt => opt.key === 'help')?.action();
    } else if (input === '1' || input === 'a') {
      options[0].action();
    }
  });

  const renderWelcomeMessage = () => (
    <Box flexDirection="column" alignItems="center" marginBottom={2}>
      <Text color="cyan">Welcome to your Infrastructure Command Center</Text>
      <Text color="gray">
        Unified orchestration for Kubernetes clusters and platform deployments
      </Text>
    </Box>
  );

  const renderOptions = () => (
    <Box flexDirection="column" alignItems="center">
      <Text color="cyan" bold marginBottom={1}>
        Please select an option:
      </Text>
      
      {options.map((option, index) => (
        <Box key={option.key} marginBottom={1} width={60}>
          <Box
            paddingX={2}
            paddingY={1}
            borderStyle={selectedOption === index ? 'round' : undefined}
            borderColor={selectedOption === index ? 'cyan' : undefined}
            width="100%"
          >
            <Box flexDirection="column" width="100%">
              <Box flexDirection="row" alignItems="center">
                <Text color={selectedOption === index ? 'cyan' : 'white'} bold>
                  {selectedOption === index ? '▶ ' : '  '}
                  {option.label}
                </Text>
              </Box>
              <Box marginLeft={selectedOption === index ? 2 : 4}>
                <Text color="gray">{option.description}</Text>
              </Box>
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );

  const renderQuickStart = () => (
    <Box flexDirection="column" alignItems="center" marginTop={2}>
      <Text color="yellow">Quick Actions:</Text>
      <Box flexDirection="row" marginTop={1}>
        <Text color="gray">Press </Text>
        <Text color="cyan" bold>1 or A</Text>
        <Text color="gray"> to authenticate • </Text>
        <Text color="cyan" bold>H</Text>
        <Text color="gray"> for help • </Text>
        <Text color="cyan" bold>Q</Text>
        <Text color="gray"> to quit</Text>
      </Box>
    </Box>
  );

  const renderSystemInfo = () => (
    <Box flexDirection="column" alignItems="center" marginTop={2} paddingX={2}>
      <Box 
        paddingX={2} 
        paddingY={1} 
        borderStyle="round" 
        borderColor="gray"
        width={50}
      >
        <Box flexDirection="column" alignItems="center">
          <Text color="gray" bold>System Information</Text>
          <Box flexDirection="row" marginTop={1} justifyContent="space-between" width="100%">
            <Text color="gray">Environment:</Text>
            <Text color="yellow">{config.app.environment}</Text>
          </Box>
          <Box flexDirection="row" justifyContent="space-between" width="100%">
            <Text color="gray">Version:</Text>
            <Text color="cyan">{config.app.version}</Text>
          </Box>
          <Box flexDirection="row" justifyContent="space-between" width="100%">
            <Text color="gray">Debug Mode:</Text>
            <Text color={config.app.debug ? 'green' : 'red'}>
              {config.app.debug ? 'Enabled' : 'Disabled'}
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  if (isLoading) {
    return (
      <Box flexDirection="column" height="100%" justifyContent="center">
        <Banner variant="compact" />
        <Box flexDirection="column" alignItems="center" marginTop={2}>
          <LoadingSpinner text="Preparing authentication..." />
        </Box>
        <Box flexGrow={1} />
        <StatusBar status="Loading" operation="GitHub Authentication" />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Banner />
      
      {/* Main content */}
      <Box flexDirection="column" flexGrow={1} paddingX={2}>
        {renderWelcomeMessage()}
        {renderOptions()}
        {renderQuickStart()}
        {renderSystemInfo()}
      </Box>

      {/* Footer */}
      <StatusBar 
        status="Ready" 
        environment={config.app.environment}
        showHelp={true}
      />
    </Box>
  );
};