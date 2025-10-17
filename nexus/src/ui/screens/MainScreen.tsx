import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Banner } from '@/components/Banner';
import { StatusBar } from '@/components/StatusBar';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { logger } from '@/utils/logger';
import { configManager } from '@/utils/config-manager';

interface MainScreenProps {
  onLogout: () => void;
}

type MainMenuItem = {
  key: string;
  label: string;
  description: string;
  action: () => void;
  enabled: boolean;
  icon: string;
};

type MainView = 'menu' | 'validate' | 'deploy' | 'status' | 'logs' | 'settings';

export const MainScreen: React.FC<MainScreenProps> = ({ onLogout }) => {
  const [currentView, setCurrentView] = useState<MainView>('menu');
  const [selectedMenuItem, setSelectedMenuItem] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  const config = configManager.getConfig();

  const menuItems: MainMenuItem[] = [
    {
      key: 'validate',
      label: 'Validate Infrastructure',
      description: 'Run validation checks on clusters and platforms',
      icon: '🔍',
      enabled: true,
      action: () => {
        logger.info('User selected validation');
        setCurrentView('validate');
      }
    },
    {
      key: 'deploy',
      label: 'Deploy Platform',
      description: 'Deploy or update platform components',
      icon: '🚀',
      enabled: true,
      action: () => {
        logger.info('User selected deployment');
        setCurrentView('deploy');
      }
    },
    {
      key: 'status',
      label: 'System Status',
      description: 'View cluster and platform health status',
      icon: '📊',
      enabled: true,
      action: () => {
        logger.info('User selected status view');
        setCurrentView('status');
      }
    },
    {
      key: 'logs',
      label: 'View Logs',
      description: 'Access application and system logs',
      icon: '📋',
      enabled: true,
      action: () => {
        logger.info('User selected logs view');
        setCurrentView('logs');
      }
    },
    {
      key: 'settings',
      label: 'Settings',
      description: 'Configure application and infrastructure settings',
      icon: '⚙️',
      enabled: true,
      action: () => {
        logger.info('User selected settings');
        setCurrentView('settings');
      }
    },
    {
      key: 'logout',
      label: 'Logout',
      description: 'Sign out and return to welcome screen',
      icon: '🚪',
      enabled: true,
      action: () => {
        logger.info('User initiated logout');
        onLogout();
      }
    }
  ];

  useInput((input, key) => {
    if (isLoading) return;

    if (currentView === 'menu') {
      if (key.upArrow) {
        setSelectedMenuItem(prev => prev > 0 ? prev - 1 : menuItems.length - 1);
      } else if (key.downArrow) {
        setSelectedMenuItem(prev => prev < menuItems.length - 1 ? prev + 1 : 0);
      } else if (key.return) {
        const selectedItem = menuItems[selectedMenuItem];
        if (selectedItem.enabled) {
          selectedItem.action();
        }
      }
    }

    // Global shortcuts
    if (key.escape || input === 'b') {
      if (currentView !== 'menu') {
        setCurrentView('menu');
      }
    } else if (input === 'q') {
      process.exit(0);
    } else if (input === 'l') {
      onLogout();
    }

    // Quick navigation shortcuts
    switch (input) {
      case '1':
      case 'v':
        if (currentView === 'menu') menuItems[0].action();
        break;
      case '2':
      case 'd':
        if (currentView === 'menu') menuItems[1].action();
        break;
      case '3':
      case 's':
        if (currentView === 'menu') menuItems[2].action();
        break;
      case '4':
        if (currentView === 'menu') menuItems[3].action();
        break;
      case '5':
        if (currentView === 'menu') menuItems[4].action();
        break;
    }
  });

  const renderMainMenu = () => (
    <Box flexDirection="column" alignItems="center">
      <Text color="cyan" bold marginBottom={2}>
        Infrastructure Command Center
      </Text>
      
      <Box flexDirection="column" alignItems="center" width={70}>
        {menuItems.map((item, index) => (
          <Box key={item.key} marginBottom={1} width="100%">
            <Box
              paddingX={3}
              paddingY={1}
              borderStyle={selectedMenuItem === index ? 'round' : undefined}
              borderColor={selectedMenuItem === index ? 'cyan' : undefined}
              width="100%"
            >
              <Box flexDirection="row" alignItems="center" width="100%">
                <Text color={selectedMenuItem === index ? 'cyan' : 'white'}>
                  {selectedMenuItem === index ? '▶ ' : '  '}
                  {item.icon} {item.label}
                </Text>
                <Box flexGrow={1} />
                <Text color={item.enabled ? 'green' : 'red'}>
                  {item.enabled ? '●' : '○'}
                </Text>
              </Box>
              <Box marginLeft={selectedMenuItem === index ? 4 : 6}>
                <Text color="gray">{item.description}</Text>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>

      <Box flexDirection="column" alignItems="center" marginTop={3}>
        <Text color="yellow">Quick Actions:</Text>
        <Box flexDirection="row" marginTop={1}>
          <Text color="gray">Press </Text>
          <Text color="cyan" bold>1-5</Text>
          <Text color="gray"> for quick access • </Text>
          <Text color="cyan" bold>V</Text>
          <Text color="gray"> validate • </Text>
          <Text color="cyan" bold>D</Text>
          <Text color="gray"> deploy • </Text>
          <Text color="cyan" bold>L</Text>
          <Text color="gray"> logout</Text>
        </Box>
      </Box>
    </Box>
  );

  const renderPlaceholderView = (title: string, description: string) => (
    <Box flexDirection="column" alignItems="center">
      <Text color="cyan" bold marginBottom={2}>
        {title}
      </Text>
      
      <Box 
        flexDirection="column" 
        alignItems="center" 
        paddingX={4} 
        paddingY={3}
        borderStyle="round"
        borderColor="yellow"
        marginBottom={3}
      >
        <Text color="yellow" bold marginBottom={1}>
          🚧 Under Development
        </Text>
        <Text color="white" textAlign="center">
          {description}
        </Text>
        <Text color="gray" marginTop={1}>
          This feature will be available in a future release.
        </Text>
      </Box>

      <Box 
        paddingX={3} 
        paddingY={1} 
        borderStyle="round" 
        borderColor="cyan"
      >
        <Text color="cyan">Press ESC or B to go back to main menu</Text>
      </Box>
    </Box>
  );

  const renderCurrentView = () => {
    switch (currentView) {
      case 'menu':
        return renderMainMenu();
      case 'validate':
        return renderPlaceholderView(
          'Infrastructure Validation',
          'Run comprehensive validation checks on your Kubernetes clusters and platform components.'
        );
      case 'deploy':
        return renderPlaceholderView(
          'Platform Deployment',
          'Deploy and manage platform components across your infrastructure environments.'
        );
      case 'status':
        return renderPlaceholderView(
          'System Status Dashboard',
          'Monitor the health and status of your clusters, applications, and services.'
        );
      case 'logs':
        return renderPlaceholderView(
          'Log Viewer',
          'Access and search through application logs, audit trails, and system events.'
        );
      case 'settings':
        return renderPlaceholderView(
          'Configuration Settings',
          'Manage application settings, infrastructure configurations, and user preferences.'
        );
      default:
        return renderMainMenu();
    }
  };

  const getCurrentOperation = () => {
    switch (currentView) {
      case 'validate':
        return 'Infrastructure Validation';
      case 'deploy':
        return 'Platform Deployment';
      case 'status':
        return 'System Status';
      case 'logs':
        return 'Log Viewer';
      case 'settings':
        return 'Settings';
      default:
        return 'Main Menu';
    }
  };

  if (isLoading) {
    return (
      <Box flexDirection="column" height="100%" justifyContent="center">
        <Banner variant="compact" />
        <Box flexDirection="column" alignItems="center" marginTop={2}>
          <LoadingSpinner text={loadingText} />
        </Box>
        <Box flexGrow={1} />
        <StatusBar status="Loading" operation={getCurrentOperation()} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Banner variant="minimal" />
      
      {/* Main content */}
      <Box flexDirection="column" flexGrow={1} paddingX={2} paddingY={1}>
        {renderCurrentView()}
      </Box>

      {/* Footer */}
      <StatusBar 
        status="Ready" 
        user="authenticated-user"
        environment={config.app.environment}
        operation={getCurrentOperation()}
        showHelp={true}
      />
    </Box>
  );
};