import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Banner } from '@/components/Banner';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBar } from '@/components/StatusBar';
import { logger } from '@/utils/logger';

interface AuthScreenProps {
  onAuthSuccess: () => void;
  onAuthError: (error: string) => void;
  onBack: () => void;
}

type AuthState = 'initial' | 'starting' | 'waiting' | 'processing' | 'success' | 'error';

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthSuccess,
  onAuthError,
  onBack
}) => {
  const [authState, setAuthState] = useState<AuthState>('initial');
  const [authUrl, setAuthUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [deviceCode, setDeviceCode] = useState<string>('');

  useInput((input, key) => {
    if (key.escape || (input === 'q' && authState !== 'waiting')) {
      logger.info('User cancelled authentication');
      onBack();
    } else if (key.return && authState === 'initial') {
      startAuthFlow();
    } else if (input === 'r' && authState === 'error') {
      setAuthState('initial');
      setErrorMessage('');
    }
  });

  const startAuthFlow = async () => {
    try {
      setAuthState('starting');
      logger.info('Starting GitHub authentication flow');

      // Simulate device flow - in real implementation, this would call GitHub's device flow API
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock device code response
      const mockDeviceCode = 'ABCD-EFGH';
      const mockAuthUrl = `https://github.com/login/device`;
      
      setDeviceCode(mockDeviceCode);
      setAuthUrl(mockAuthUrl);
      setAuthState('waiting');

      // Start polling for completion (mock)
      setTimeout(() => {
        setAuthState('processing');
        setTimeout(() => {
          // Mock successful authentication
          logger.info('Authentication completed successfully');
          setAuthState('success');
          setTimeout(() => {
            onAuthSuccess();
          }, 1500);
        }, 2000);
      }, 5000);

    } catch (error) {
      logger.error('Authentication flow failed', { error });
      setErrorMessage(error instanceof Error ? error.message : 'Authentication failed');
      setAuthState('error');
    }
  };

  const renderInitialState = () => (
    <Box flexDirection="column" alignItems="center">
      <Text color="cyan" bold marginBottom={2}>
        GitHub Authentication Required
      </Text>
      
      <Box 
        flexDirection="column" 
        alignItems="center" 
        paddingX={4} 
        paddingY={2}
        borderStyle="round"
        borderColor="cyan"
        marginBottom={2}
      >
        <Text color="white" bold marginBottom={1}>
          🔐 Secure Authentication
        </Text>
        <Text color="gray" textAlign="center">
          Nexus uses GitHub OAuth 2.0 device flow for secure authentication.
        </Text>
        <Text color="gray" textAlign="center">
          Your credentials are never stored locally.
        </Text>
      </Box>

      <Box flexDirection="column" alignItems="center" marginBottom={2}>
        <Text color="yellow">What you'll need:</Text>
        <Text color="white">• A GitHub account</Text>
        <Text color="white">• Access to github.com in your browser</Text>
        <Text color="white">• Appropriate repository permissions</Text>
      </Box>

      <Box 
        paddingX={3} 
        paddingY={1} 
        borderStyle="round" 
        borderColor="green"
        marginBottom={2}
      >
        <Text color="green" bold>Press Enter to continue</Text>
      </Box>

      <Text color="gray">Press ESC to go back</Text>
    </Box>
  );

  const renderWaitingState = () => (
    <Box flexDirection="column" alignItems="center">
      <Text color="cyan" bold marginBottom={2}>
        Complete Authentication in Browser
      </Text>

      <Box 
        flexDirection="column" 
        alignItems="center" 
        paddingX={4} 
        paddingY={2}
        borderStyle="double"
        borderColor="yellow"
        marginBottom={2}
      >
        <Text color="yellow" bold marginBottom={1}>
          Step 1: Visit GitHub
        </Text>
        <Text color="white">Open this URL in your browser:</Text>
        <Text color="cyan" bold>{authUrl}</Text>
      </Box>

      <Box 
        flexDirection="column" 
        alignItems="center" 
        paddingX={4} 
        paddingY={2}
        borderStyle="double"
        borderColor="yellow"
        marginBottom={2}
      >
        <Text color="yellow" bold marginBottom={1}>
          Step 2: Enter Device Code
        </Text>
        <Text color="white">Enter this code when prompted:</Text>
        <Text color="green" bold fontSize={18}>{deviceCode}</Text>
      </Box>

      <Box flexDirection="column" alignItems="center" marginBottom={2}>
        <LoadingSpinner text="Waiting for authorization..." variant="dots" />
        <Text color="gray" marginTop={1}>
          Complete the authorization in your browser...
        </Text>
      </Box>

      <Text color="gray">Press ESC to cancel</Text>
    </Box>
  );

  const renderProcessingState = () => (
    <Box flexDirection="column" alignItems="center">
      <Text color="cyan" bold marginBottom={2}>
        Processing Authentication
      </Text>

      <Box flexDirection="column" alignItems="center" marginBottom={2}>
        <LoadingSpinner text="Verifying credentials..." />
        <Text color="gray" marginTop={1}>
          Setting up your session...
        </Text>
      </Box>

      <Box 
        paddingX={3} 
        paddingY={1} 
        borderStyle="round" 
        borderColor="blue"
      >
        <Text color="blue">✓ Authorization received</Text>
      </Box>
    </Box>
  );

  const renderSuccessState = () => (
    <Box flexDirection="column" alignItems="center">
      <Text color="green" bold marginBottom={2}>
        🎉 Authentication Successful!
      </Text>

      <Box 
        flexDirection="column" 
        alignItems="center" 
        paddingX={4} 
        paddingY={2}
        borderStyle="round"
        borderColor="green"
        marginBottom={2}
      >
        <Text color="green" bold>✓ Successfully authenticated</Text>
        <Text color="white">✓ Session established</Text>
        <Text color="white">✓ Permissions verified</Text>
      </Box>

      <LoadingSpinner text="Redirecting to main interface..." color="green" />
    </Box>
  );

  const renderErrorState = () => (
    <Box flexDirection="column" alignItems="center">
      <Text color="red" bold marginBottom={2}>
        ❌ Authentication Failed
      </Text>

      <Box 
        flexDirection="column" 
        alignItems="center" 
        paddingX={4} 
        paddingY={2}
        borderStyle="round"
        borderColor="red"
        marginBottom={2}
      >
        <Text color="red">{errorMessage}</Text>
      </Box>

      <Box flexDirection="column" alignItems="center" marginBottom={2}>
        <Text color="yellow">Possible solutions:</Text>
        <Text color="white">• Check your internet connection</Text>
        <Text color="white">• Verify GitHub is accessible</Text>
        <Text color="white">• Ensure you have the required permissions</Text>
        <Text color="white">• Try the authentication process again</Text>
      </Box>

      <Box flexDirection="row">
        <Box 
          paddingX={2} 
          paddingY={1} 
          borderStyle="round" 
          borderColor="yellow"
          marginRight={2}
        >
          <Text color="yellow">Press R to retry</Text>
        </Box>
        <Box 
          paddingX={2} 
          paddingY={1} 
          borderStyle="round" 
          borderColor="gray"
        >
          <Text color="gray">Press ESC to go back</Text>
        </Box>
      </Box>
    </Box>
  );

  const renderContent = () => {
    switch (authState) {
      case 'initial':
        return renderInitialState();
      case 'starting':
        return (
          <Box flexDirection="column" alignItems="center">
            <LoadingSpinner text="Initializing authentication..." />
          </Box>
        );
      case 'waiting':
        return renderWaitingState();
      case 'processing':
        return renderProcessingState();
      case 'success':
        return renderSuccessState();
      case 'error':
        return renderErrorState();
      default:
        return renderInitialState();
    }
  };

  const getStatusText = () => {
    switch (authState) {
      case 'starting':
        return 'Initializing';
      case 'waiting':
        return 'Waiting for authorization';
      case 'processing':
        return 'Processing';
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      default:
        return 'Ready';
    }
  };

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Banner variant="compact" />
      
      {/* Main content */}
      <Box flexDirection="column" flexGrow={1} justifyContent="center" paddingX={2}>
        {renderContent()}
      </Box>

      {/* Footer */}
      <StatusBar 
        status={getStatusText()} 
        operation="GitHub Authentication"
        showHelp={false}
      />
    </Box>
  );
};