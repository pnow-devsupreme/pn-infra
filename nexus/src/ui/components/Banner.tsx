import React from 'react';
import { Box, Text } from 'ink';
import { configManager } from '@/utils/config-manager';

interface BannerProps {
  variant?: 'full' | 'compact' | 'minimal';
  showVersion?: boolean;
  animated?: boolean;
}

export const Banner: React.FC<BannerProps> = ({ 
  variant = 'full', 
  showVersion = true,
  animated = false 
}) => {
  const config = configManager.getConfig();
  const logoConfig = config.ui.ascii.logo;
  
  const actualVariant = variant === 'full' && logoConfig.variant ? logoConfig.variant : variant;
  const useColors = logoConfig.colors;
  const appVersion = config.app.version;

  const renderFullLogo = () => (
    <Box flexDirection="column" alignItems="center">
      <Text color={useColors ? "cyan" : undefined} bold>
        ╔═══════════════════════════════════════════════════════════════╗
      </Text>
      <Text color={useColors ? "cyan" : undefined} bold>
        ║                                                               ║
      </Text>
      <Text color={useColors ? "cyan" : undefined} bold>
        ║  ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗                 ║
      </Text>
      <Text color={useColors ? "cyan" : undefined} bold>
        ║  ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝                 ║
      </Text>
      <Text color={useColors ? "cyan" : undefined} bold>
        ║  ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗                 ║
      </Text>
      <Text color={useColors ? "cyan" : undefined} bold>
        ║  ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║                 ║
      </Text>
      <Text color={useColors ? "cyan" : undefined} bold>
        ║  ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║                 ║
      </Text>
      <Text color={useColors ? "cyan" : undefined} bold>
        ║  ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝                 ║
      </Text>
      <Text color={useColors ? "cyan" : undefined} bold>
        ║                                                               ║
      </Text>
      <Text color={useColors ? "blue" : undefined}>
        ║           ProficientNowTech Infrastructure Center             ║
      </Text>
      <Text color={useColors ? "cyan" : undefined} bold>
        ║                                                               ║
      </Text>
      <Text color={useColors ? "cyan" : undefined} bold>
        ╚═══════════════════════════════════════════════════════════════╝
      </Text>
      {showVersion && (
        <Box marginTop={1}>
          <Text color={useColors ? "gray" : undefined}>
            Version {appVersion} • Infrastructure Command Center
          </Text>
        </Box>
      )}
    </Box>
  );

  const renderCompactLogo = () => (
    <Box flexDirection="column" alignItems="center">
      <Text color={useColors ? "cyan" : undefined} bold>
        ┌─────────────────────────────────────────┐
      </Text>
      <Text color={useColors ? "cyan" : undefined} bold>
        │  ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███╗│
      </Text>
      <Text color={useColors ? "cyan" : undefined} bold>
        │  ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔╝│
      </Text>
      <Text color={useColors ? "cyan" : undefined} bold>
        │  ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███╗│
      </Text>
      <Text color={useColors ? "cyan" : undefined} bold>
        │  ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚══╝│
      </Text>
      <Text color={useColors ? "cyan" : undefined} bold>
        │  ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███╗│
      </Text>
      <Text color={useColors ? "blue" : undefined}>
        │        Infrastructure Command Center    │
      </Text>
      <Text color={useColors ? "cyan" : undefined} bold>
        └─────────────────────────────────────────┘
      </Text>
      {showVersion && (
        <Box marginTop={1}>
          <Text color={useColors ? "gray" : undefined}>v{appVersion}</Text>
        </Box>
      )}
    </Box>
  );

  const renderMinimalLogo = () => (
    <Box flexDirection="column" alignItems="center">
      <Text color={useColors ? "cyan" : undefined} bold>
        NEXUS
      </Text>
      <Text color={useColors ? "blue" : undefined}>
        Infrastructure Center
      </Text>
      {showVersion && (
        <Text color={useColors ? "gray" : undefined}>v{appVersion}</Text>
      )}
    </Box>
  );

  const renderLogo = () => {
    switch (actualVariant) {
      case 'full':
        return renderFullLogo();
      case 'compact':
        return renderCompactLogo();
      case 'minimal':
        return renderMinimalLogo();
      default:
        return renderCompactLogo();
    }
  };

  return (
    <Box flexDirection="column">
      {renderLogo()}
    </Box>
  );
};