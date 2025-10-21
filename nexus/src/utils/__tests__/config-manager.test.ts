import { ConfigManager } from '../config-manager';

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    configManager = new ConfigManager();
  });

  test('should create ConfigManager instance', () => {
    expect(configManager).toBeDefined();
    expect(configManager).toBeInstanceOf(ConfigManager);
  });

  test('should have required methods', () => {
    expect(typeof configManager.initialize).toBe('function');
    expect(typeof configManager.getConfig).toBe('function');
    expect(typeof configManager.validateConfig).toBe('function');
  });

  test('should throw error when config not initialized', () => {
    // Test that getConfig throws when not initialized
    expect(() => {
      configManager.getConfig();
    }).toThrow('Configuration not initialized. Call initialize() first.');
  });

  test('should have validateConfig method', () => {
    // Test that validateConfig method exists and is callable
    expect(typeof configManager.validateConfig).toBe('function');
  });
});