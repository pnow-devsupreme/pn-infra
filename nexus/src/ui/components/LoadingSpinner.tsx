import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { configManager } from '@/utils/config-manager';

interface LoadingSpinnerProps {
  text?: string;
  variant?: 'spinner' | 'dots' | 'bar' | 'minimal';
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  text = 'Loading...', 
  variant,
  color = 'cyan'
}) => {
  const [frame, setFrame] = useState(0);
  const config = configManager.getConfig();
  
  const actualVariant = variant || config.ui.ascii.progress.style;
  const useColors = config.ui.ascii.progress.colors;
  const speed = config.ui.ascii.progress.speed;
  const actualColor = useColors ? color : undefined;

  const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const dotsFrames = ['   ', '.  ', '.. ', '...', ' ..', '  .'];
  const barFrames = [
    '[    ]',
    '[=   ]',
    '[==  ]',
    '[=== ]',
    '[====]',
    '[ ===]',
    '[  ==]',
    '[   =]'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(prevFrame => {
        switch (actualVariant) {
          case 'spinner':
            return (prevFrame + 1) % spinnerFrames.length;
          case 'dots':
            return (prevFrame + 1) % dotsFrames.length;
          case 'bar':
            return (prevFrame + 1) % barFrames.length;
          default:
            return (prevFrame + 1) % spinnerFrames.length;
        }
      });
    }, speed);

    return () => clearInterval(interval);
  }, [actualVariant, speed]);

  const renderSpinner = () => {
    switch (actualVariant) {
      case 'spinner':
        return (
          <Box>
            <Text color={actualColor}>{spinnerFrames[frame]}</Text>
            <Text> {text}</Text>
          </Box>
        );
      
      case 'dots':
        return (
          <Box>
            <Text>{text}</Text>
            <Text color={actualColor}>{dotsFrames[frame]}</Text>
          </Box>
        );
      
      case 'bar':
        return (
          <Box flexDirection="column" alignItems="center">
            <Text>{text}</Text>
            <Text color={actualColor}>{barFrames[frame]}</Text>
          </Box>
        );
      
      case 'minimal':
        return (
          <Box>
            <Text color={actualColor}>•</Text>
            <Text> {text}</Text>
          </Box>
        );
      
      default:
        return (
          <Box>
            <Text color={actualColor}>{spinnerFrames[frame]}</Text>
            <Text> {text}</Text>
          </Box>
        );
    }
  };

  return renderSpinner();
};