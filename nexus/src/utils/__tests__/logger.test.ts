import { logger } from '../logger';

describe('Logger', () => {
  test('should create logger instance', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  test('should have required methods', () => {
    expect(typeof logger.time).toBe('function');
    expect(typeof logger.audit).toBe('function');
    expect(typeof logger.metrics).toBe('function');
  });

  test('should accept context in log methods', () => {
    const testMessage = 'Test message with context';
    const context = { userId: '123', operation: 'test' };
    
    // Test that methods accept parameters without throwing
    expect(() => {
      logger.info(testMessage, context);
      logger.error(testMessage, context);
      logger.warn(testMessage, context);
      logger.debug(testMessage, context);
    }).not.toThrow();
  });
});