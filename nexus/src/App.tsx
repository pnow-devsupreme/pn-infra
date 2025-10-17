import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Banner } from '@/components/Banner';
import { WelcomeScreen } from '@/screens/WelcomeScreen';
import { AuthScreen } from '@/screens/AuthScreen';
import { MainScreen } from '@/screens/MainScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { authManager } from '@/auth/session-manager';
import { logger } from '@/utils/logger';

type AppState = 'loading' | 'welcome' | 'auth' | 'main' | 'error';

interface AppProps {}

export const App: React.FC<AppProps> = () => {
  const [state, setState] = useState<AppState>('loading');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        logger.info('Initializing Nexus application');
        
        // Check if user is already authenticated
        const authenticated = await authManager.isAuthenticated();
        setIsAuthenticated(authenticated);
        
        if (authenticated) {
          setState('main');
        } else {
          setState('welcome');
        }
        
        logger.info('Application initialized successfully', { authenticated });
      } catch (err) {
        logger.error('Failed to initialize application', { error: err });
        setError(err instanceof Error ? err.message : 'Unknown error');
        setState('error');
      }
    };

    initializeApp();
  }, []);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setState('main');
    logger.info('User authentication successful');
  };

  const handleAuthError = (errorMessage: string) => {
    setError(errorMessage);
    setState('error');
    logger.error('Authentication failed', { error: errorMessage });
  };

  const handleStartAuth = () => {
    setState('auth');
  };

  const handleLogout = async () => {
    try {
      await authManager.logout();
      setIsAuthenticated(false);
      setState('welcome');
      logger.info('User logged out successfully');
    } catch (err) {
      logger.error('Logout failed', { error: err });
      setError(err instanceof Error ? err.message : 'Logout failed');
      setState('error');
    }
  };

  const renderContent = () => {
    switch (state) {
      case 'loading':
        return (
          <Box flexDirection='column' alignItems='center' justifyContent='center' height={20}>
            <Banner />
            <Box marginTop={2}>
              <Text color='cyan'>Loading Nexus...</Text>
            </Box>
          </Box>
        );
        
      case 'welcome':
        return <WelcomeScreen onStartAuth={handleStartAuth} />;
        
      case 'auth':
        return (
          <AuthScreen
            onAuthSuccess={handleAuthSuccess}
            onAuthError={handleAuthError}
            onBack={() => setState('welcome')}
          />
        );
        
      case 'main':
        return <MainScreen onLogout={handleLogout} />;
        
      case 'error':
        return (
          <Box flexDirection='column' alignItems='center' justifyContent='center' height={20}>
            <Banner />
            <Box marginTop={2} padding={1} borderStyle='round' borderColor='red'>
              <Text color='red'>Error: {error}</Text>
            </Box>
            <Box marginTop={1}>
              <Text color='gray'>Press Ctrl+C to exit</Text>
            </Box>
          </Box>
        );
        
      default:
        return (
          <Box flexDirection='column' alignItems='center' justifyContent='center' height={20}>
            <Text color='red'>Unknown application state</Text>
          </Box>
        );
    }
  };

  return (
    <ErrorBoundary>
      <Box flexDirection='column' width='100%' height='100%'>
        {renderContent()}
      </Box>
    </ErrorBoundary>
  );
};