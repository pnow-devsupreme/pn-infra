/**
 * File Manager Utility
 * 
 * Handles file operations, workspace management, and repository cloning
 */

import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { logger } from './logger';
import { configManager } from './config-manager';

export interface FileOperationResult {
  success: boolean;
  message: string;
  path?: string;
  error?: Error;
}

export interface DirectoryInfo {
  path: string;
  exists: boolean;
  readable: boolean;
  writable: boolean;
  size?: number;
  files?: string[];
  directories?: string[];
}

export interface GitRepositoryInfo {
  url: string;
  branch: string;
  commit?: string;
  status: 'clean' | 'dirty' | 'unknown';
  lastUpdate?: Date;
}

export class FileManager {
  private readonly workspaceDir: string;
  private readonly dataDir: string;
  private readonly tempDir: string;

  constructor() {
    const config = configManager.getConfig();
    this.workspaceDir = config.app.workspaceDirectory;
    this.dataDir = config.app.dataDirectory;
    this.tempDir = config.app.tempDirectory;
  }

  /**
   * Initialize file manager and create necessary directories
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing file manager');

      await this.ensureDirectory(this.workspaceDir);
      await this.ensureDirectory(this.dataDir);
      await this.ensureDirectory(this.tempDir);

      logger.info('File manager initialized successfully', {
        workspaceDir: this.workspaceDir,
        dataDir: this.dataDir,
        tempDir: this.tempDir
      });
    } catch (error) {
      logger.error('Failed to initialize file manager', { error });
      throw error;
    }
  }

  /**
   * Ensure directory exists, create if it doesn't
   */
  async ensureDirectory(dirPath: string): Promise<FileOperationResult> {
    try {
      if (!existsSync(dirPath)) {
        await fs.mkdir(dirPath, { recursive: true });
        logger.debug('Created directory', { path: dirPath });
      }

      return {
        success: true,
        message: 'Directory ensured',
        path: dirPath
      };
    } catch (error) {
      logger.error('Failed to ensure directory', { path: dirPath, error });
      return {
        success: false,
        message: `Failed to create directory: ${error instanceof Error ? error.message : String(error)}`,
        path: dirPath,
        error: error as Error
      };
    }
  }

  /**
   * Get directory information
   */
  async getDirectoryInfo(dirPath: string): Promise<DirectoryInfo> {
    const info: DirectoryInfo = {
      path: dirPath,
      exists: existsSync(dirPath),
      readable: false,
      writable: false
    };

    if (!info.exists) {
      return info;
    }

    try {
      // Check permissions
      await fs.access(dirPath, fs.constants.R_OK);
      info.readable = true;
    } catch {
      // Not readable
    }

    try {
      await fs.access(dirPath, fs.constants.W_OK);
      info.writable = true;
    } catch {
      // Not writable
    }

    try {
      const stats = await fs.stat(dirPath);
      info.size = stats.size;

      if (stats.isDirectory()) {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        info.files = entries.filter(entry => entry.isFile()).map(entry => entry.name);
        info.directories = entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
      }
    } catch (error) {
      logger.warn('Failed to get directory stats', { path: dirPath, error });
    }

    return info;
  }

  /**
   * Clean directory (remove all contents)
   */
  async cleanDirectory(dirPath: string): Promise<FileOperationResult> {
    try {
      if (!existsSync(dirPath)) {
        return {
          success: true,
          message: 'Directory does not exist',
          path: dirPath
        };
      }

      const entries = await fs.readdir(dirPath);
      
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry);
        const stats = await fs.stat(entryPath);

        if (stats.isDirectory()) {
          await fs.rm(entryPath, { recursive: true, force: true });
        } else {
          await fs.unlink(entryPath);
        }
      }

      logger.info('Directory cleaned successfully', { path: dirPath, removedItems: entries.length });

      return {
        success: true,
        message: `Cleaned directory, removed ${entries.length} items`,
        path: dirPath
      };
    } catch (error) {
      logger.error('Failed to clean directory', { path: dirPath, error });
      return {
        success: false,
        message: `Failed to clean directory: ${error instanceof Error ? error.message : String(error)}`,
        path: dirPath,
        error: error as Error
      };
    }
  }

  /**
   * Copy file or directory
   */
  async copy(source: string, destination: string): Promise<FileOperationResult> {
    try {
      const stats = await fs.stat(source);

      if (stats.isDirectory()) {
        await fs.cp(source, destination, { recursive: true });
      } else {
        await fs.copyFile(source, destination);
      }

      logger.debug('Copy operation completed', { source, destination });

      return {
        success: true,
        message: 'Copy operation completed',
        path: destination
      };
    } catch (error) {
      logger.error('Copy operation failed', { source, destination, error });
      return {
        success: false,
        message: `Copy failed: ${error instanceof Error ? error.message : String(error)}`,
        error: error as Error
      };
    }
  }

  /**
   * Move file or directory
   */
  async move(source: string, destination: string): Promise<FileOperationResult> {
    try {
      await fs.rename(source, destination);

      logger.debug('Move operation completed', { source, destination });

      return {
        success: true,
        message: 'Move operation completed',
        path: destination
      };
    } catch (error) {
      logger.error('Move operation failed', { source, destination, error });
      return {
        success: false,
        message: `Move failed: ${error instanceof Error ? error.message : String(error)}`,
        error: error as Error
      };
    }
  }

  /**
   * Delete file or directory
   */
  async delete(targetPath: string): Promise<FileOperationResult> {
    try {
      if (!existsSync(targetPath)) {
        return {
          success: true,
          message: 'Target does not exist',
          path: targetPath
        };
      }

      const stats = await fs.stat(targetPath);

      if (stats.isDirectory()) {
        await fs.rm(targetPath, { recursive: true, force: true });
      } else {
        await fs.unlink(targetPath);
      }

      logger.debug('Delete operation completed', { path: targetPath });

      return {
        success: true,
        message: 'Delete operation completed',
        path: targetPath
      };
    } catch (error) {
      logger.error('Delete operation failed', { path: targetPath, error });
      return {
        success: false,
        message: `Delete failed: ${error instanceof Error ? error.message : String(error)}`,
        path: targetPath,
        error: error as Error
      };
    }
  }

  /**
   * Read file content
   */
  async readFile(filePath: string): Promise<string | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      logger.error('Failed to read file', { path: filePath, error });
      return null;
    }
  }

  /**
   * Write file content
   */
  async writeFile(filePath: string, content: string): Promise<FileOperationResult> {
    try {
      const dirPath = path.dirname(filePath);
      await this.ensureDirectory(dirPath);
      
      await fs.writeFile(filePath, content, 'utf-8');

      logger.debug('File written successfully', { path: filePath });

      return {
        success: true,
        message: 'File written successfully',
        path: filePath
      };
    } catch (error) {
      logger.error('Failed to write file', { path: filePath, error });
      return {
        success: false,
        message: `Write failed: ${error instanceof Error ? error.message : String(error)}`,
        path: filePath,
        error: error as Error
      };
    }
  }

  /**
   * Clone Git repository
   */
  async cloneRepository(repoUrl: string, targetDir?: string, branch?: string): Promise<FileOperationResult> {
    try {
      const config = configManager.getConfig();
      const cloneDir = targetDir || path.join(this.workspaceDir, 'repository');
      const targetBranch = branch || config.app.defaultBranch;

      logger.info('Cloning repository', { repoUrl, targetDir: cloneDir, branch: targetBranch });

      // Ensure target directory doesn't exist or is empty
      if (existsSync(cloneDir)) {
        const dirInfo = await this.getDirectoryInfo(cloneDir);
        if (dirInfo.files && dirInfo.files.length > 0) {
          await this.cleanDirectory(cloneDir);
        }
      }

      // Build git clone command
      const cloneCmd = `git clone --branch ${targetBranch} --single-branch ${repoUrl} "${cloneDir}"`;
      
      execSync(cloneCmd, { 
        stdio: 'inherit',
        cwd: path.dirname(cloneDir)
      });

      logger.info('Repository cloned successfully', { repoUrl, targetDir: cloneDir });

      return {
        success: true,
        message: 'Repository cloned successfully',
        path: cloneDir
      };
    } catch (error) {
      logger.error('Failed to clone repository', { repoUrl, error });
      return {
        success: false,
        message: `Clone failed: ${error instanceof Error ? error.message : String(error)}`,
        error: error as Error
      };
    }
  }

  /**
   * Update Git repository
   */
  async updateRepository(repoDir: string, branch?: string): Promise<FileOperationResult> {
    try {
      if (!existsSync(path.join(repoDir, '.git'))) {
        return {
          success: false,
          message: 'Not a git repository',
          path: repoDir
        };
      }

      logger.info('Updating repository', { repoDir, branch });

      // Fetch latest changes
      execSync('git fetch origin', { cwd: repoDir, stdio: 'inherit' });

      // Checkout branch if specified
      if (branch) {
        execSync(`git checkout ${branch}`, { cwd: repoDir, stdio: 'inherit' });
      }

      // Pull latest changes
      execSync('git pull', { cwd: repoDir, stdio: 'inherit' });

      logger.info('Repository updated successfully', { repoDir });

      return {
        success: true,
        message: 'Repository updated successfully',
        path: repoDir
      };
    } catch (error) {
      logger.error('Failed to update repository', { repoDir, error });
      return {
        success: false,
        message: `Update failed: ${error instanceof Error ? error.message : String(error)}`,
        path: repoDir,
        error: error as Error
      };
    }
  }

  /**
   * Get Git repository information
   */
  async getRepositoryInfo(repoDir: string): Promise<GitRepositoryInfo | null> {
    try {
      if (!existsSync(path.join(repoDir, '.git'))) {
        return null;
      }

      // Get remote URL
      const remoteUrl = execSync('git config --get remote.origin.url', { 
        cwd: repoDir, 
        encoding: 'utf-8' 
      }).trim();

      // Get current branch
      const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: repoDir,
        encoding: 'utf-8'
      }).trim();

      // Get current commit
      const currentCommit = execSync('git rev-parse HEAD', {
        cwd: repoDir,
        encoding: 'utf-8'
      }).trim();

      // Check if repository is clean
      const statusOutput = execSync('git status --porcelain', {
        cwd: repoDir,
        encoding: 'utf-8'
      }).trim();

      const status = statusOutput.length === 0 ? 'clean' : 'dirty';

      return {
        url: remoteUrl,
        branch: currentBranch,
        commit: currentCommit,
        status,
        lastUpdate: new Date()
      };
    } catch (error) {
      logger.error('Failed to get repository info', { repoDir, error });
      return null;
    }
  }

  /**
   * Find files matching pattern
   */
  async findFiles(directory: string, pattern: RegExp, recursive = true): Promise<string[]> {
    const results: string[] = [];

    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isFile() && pattern.test(entry.name)) {
          results.push(fullPath);
        } else if (entry.isDirectory() && recursive) {
          const subResults = await this.findFiles(fullPath, pattern, recursive);
          results.push(...subResults);
        }
      }
    } catch (error) {
      logger.warn('Failed to search directory', { directory, error });
    }

    return results;
  }

  /**
   * Get workspace directory
   */
  getWorkspaceDirectory(): string {
    return this.workspaceDir;
  }

  /**
   * Get data directory
   */
  getDataDirectory(): string {
    return this.dataDir;
  }

  /**
   * Get temp directory
   */
  getTempDirectory(): string {
    return this.tempDir;
  }

  /**
   * Get repository directory
   */
  getRepositoryDirectory(): string {
    return path.join(this.workspaceDir, 'repository');
  }
}

// Export singleton instance
export const fileManager = new FileManager();