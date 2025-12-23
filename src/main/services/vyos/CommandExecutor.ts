/**
 * Command Executor - Executes VyOS commands with rollback support
 */

import { SSHClient } from '../ssh/SSHClient';
import { VyOSCommandError, VyOSCommitError } from '@shared/types';
import { VYOS_COMMANDS, VYOS_COMMIT_TIMEOUT } from '@shared/constants';
import log from 'electron-log';

export interface ExecutionOptions {
  commit?: boolean;
  save?: boolean;
  timeout?: number;
}

export class CommandExecutor {
  constructor(private sshClient: SSHClient) {}

  /**
   * Execute commands with automatic rollback on error
   */
  async executeWithRollback(
    commands: string[],
    options: ExecutionOptions = {}
  ): Promise<void> {
    const { commit = true, save = true, timeout = VYOS_COMMIT_TIMEOUT } = options;

    const fullCommands: string[] = [
      VYOS_COMMANDS.ENTER_CONFIG,
      ...commands,
    ];

    if (commit) {
      fullCommands.push(VYOS_COMMANDS.COMMIT);
    }

    if (save) {
      fullCommands.push(VYOS_COMMANDS.SAVE);
    }

    fullCommands.push(VYOS_COMMANDS.EXIT_CONFIG);

    try {
      log.info('Executing commands with rollback protection');
      log.debug('Commands:', fullCommands);

      const output = await this.sshClient.shell(fullCommands, timeout);

      // Check for errors in output
      const errors = this.parseErrors(output);
      if (errors.length > 0) {
        log.error('Command execution failed:', errors);
        throw new VyOSCommandError(
          `Command execution failed: ${errors.join(', ')}`,
          commands.join('\n'),
          output
        );
      }

      // Check for commit failures
      if (commit && this.hasCommitFailed(output)) {
        log.error('Commit failed');
        throw new VyOSCommitError('Commit failed', output);
      }

      log.info('Commands executed successfully');
    } catch (error) {
      log.error('Execution error, attempting rollback:', (error as Error).message);

      // Attempt rollback
      try {
        await this.rollback(0);
        log.info('Rollback completed successfully');
      } catch (rollbackError) {
        log.error('Rollback failed:', (rollbackError as Error).message);
        throw new VyOSCommandError(
          `Command execution failed and rollback also failed: ${(rollbackError as Error).message}`,
          commands.join('\n'),
          (error as Error).message
        );
      }

      throw error;
    }
  }

  /**
   * Execute a single command in configure mode
   */
  async executeConfigCommand(command: string): Promise<string> {
    const commands = [
      VYOS_COMMANDS.ENTER_CONFIG,
      command,
      VYOS_COMMANDS.EXIT_CONFIG,
    ];

    const output = await this.sshClient.shell(commands);
    return output;
  }

  /**
   * Commit configuration changes
   */
  async commit(): Promise<void> {
    log.info('Committing configuration');

    try {
      const result = await this.sshClient.exec(VYOS_COMMANDS.COMMIT, {
        timeout: VYOS_COMMIT_TIMEOUT,
      });

      if (this.hasCommitFailed(result.output)) {
        throw new VyOSCommitError('Commit failed', result.output);
      }

      log.info('Configuration committed successfully');
    } catch (error) {
      log.error('Commit failed:', error);
      throw error;
    }
  }

  /**
   * Commit with automatic confirmation (rollback if not confirmed)
   */
  async commitConfirm(minutes: number = 10): Promise<void> {
    log.info(`Committing with ${minutes} minute confirmation window`);

    const command = `${VYOS_COMMANDS.COMMIT_CONFIRM} ${minutes}`;

    try {
      const result = await this.sshClient.exec(command, {
        timeout: VYOS_COMMIT_TIMEOUT,
      });

      if (this.hasCommitFailed(result.output)) {
        throw new VyOSCommitError('Commit-confirm failed', result.output);
      }

      log.info('Configuration committed with confirmation window');
    } catch (error) {
      log.error('Commit-confirm failed:', error);
      throw error;
    }
  }

  /**
   * Confirm a pending commit
   */
  async confirmCommit(): Promise<void> {
    log.info('Confirming pending commit');

    try {
      const result = await this.sshClient.exec('confirm');

      if (result.output.includes('No commit confirmation pending')) {
        throw new VyOSCommandError('No pending commit to confirm', 'confirm', result.output);
      }

      log.info('Commit confirmed successfully');
    } catch (error) {
      log.error('Confirm failed:', error);
      throw error;
    }
  }

  /**
   * Save configuration to startup config
   */
  async save(): Promise<void> {
    log.info('Saving configuration');

    try {
      await this.sshClient.exec(VYOS_COMMANDS.SAVE);
      log.info('Configuration saved successfully');
    } catch (error) {
      log.error('Save failed:', error);
      throw error;
    }
  }

  /**
   * Discard uncommitted changes
   */
  async discard(): Promise<void> {
    log.info('Discarding uncommitted changes');

    try {
      const commands = [
        VYOS_COMMANDS.ENTER_CONFIG,
        VYOS_COMMANDS.DISCARD,
        VYOS_COMMANDS.EXIT_CONFIG,
      ];

      await this.sshClient.shell(commands);
      log.info('Changes discarded successfully');
    } catch (error) {
      log.error('Discard failed:', error);
      throw error;
    }
  }

  /**
   * Rollback to previous configuration
   */
  async rollback(revision: number = 0): Promise<void> {
    log.info(`Rolling back to revision ${revision}`);

    try {
      const commands = [
        VYOS_COMMANDS.ENTER_CONFIG,
        `${VYOS_COMMANDS.ROLLBACK} ${revision}`,
        VYOS_COMMANDS.COMMIT,
        VYOS_COMMANDS.SAVE,
        VYOS_COMMANDS.EXIT_CONFIG,
      ];

      const output = await this.sshClient.shell(commands);

      if (this.hasCommitFailed(output)) {
        throw new VyOSCommitError('Rollback commit failed', output);
      }

      log.info('Rollback completed successfully');
    } catch (error) {
      log.error('Rollback failed:', error);
      throw error;
    }
  }

  /**
   * Compare current configuration with saved
   */
  async compare(): Promise<string> {
    log.info('Comparing configuration');

    try {
      const commands = [
        VYOS_COMMANDS.ENTER_CONFIG,
        VYOS_COMMANDS.COMPARE,
        VYOS_COMMANDS.EXIT_CONFIG,
      ];

      const output = await this.sshClient.shell(commands);
      return this.extractCompareOutput(output);
    } catch (error) {
      log.error('Compare failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Parse errors from command output
   */
  private parseErrors(output: string): string[] {
    const errors: string[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // VyOS error patterns
      if (
        trimmed.includes('Error:') ||
        trimmed.includes('Invalid') ||
        trimmed.includes('Failed') ||
        trimmed.includes('Configuration path:') ||
        trimmed.match(/\[.*\]\s*ERROR/)
      ) {
        errors.push(trimmed);
      }
    }

    return errors;
  }

  /**
   * Check if commit failed from output
   */
  private hasCommitFailed(output: string): boolean {
    const failurePatterns = [
      'Commit failed',
      'Configuration commit aborted',
      'Pre-commit check failed',
      'Error: Configuration path',
      'Validation failed',
    ];

    return failurePatterns.some((pattern) => output.includes(pattern));
  }

  /**
   * Extract compare output from full shell output
   */
  private extractCompareOutput(output: string): string {
    const lines = output.split('\n');
    const compareLines: string[] = [];
    let capturing = false;

    for (const line of lines) {
      // Start capturing after the compare command
      if (line.includes('compare')) {
        capturing = true;
        continue;
      }

      // Stop capturing at the next prompt
      if (capturing && (line.includes('[edit]') || line.includes('$') || line.includes('#'))) {
        break;
      }

      if (capturing && line.trim().length > 0) {
        compareLines.push(line);
      }
    }

    return compareLines.join('\n').trim();
  }

  /**
   * Validate command syntax (basic check)
   */
  validateCommand(command: string): { valid: boolean; error?: string } {
    if (!command || command.trim().length === 0) {
      return { valid: false, error: 'Command cannot be empty' };
    }

    // Check for dangerous commands
    const dangerousPatterns = [
      /rm\s+-rf/,
      /mkfs/,
      /dd\s+if=/,
      /shutdown/,
      /reboot/,
      /poweroff/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return { valid: false, error: 'Dangerous command detected' };
      }
    }

    // Basic VyOS command structure check
    if (!command.startsWith('set') &&
        !command.startsWith('delete') &&
        !command.startsWith('show') &&
        !command.startsWith('commit') &&
        !command.startsWith('save') &&
        !command.startsWith('rollback') &&
        !command.startsWith('configure') &&
        !command.startsWith('exit') &&
        !command.startsWith('compare')) {
      return { valid: false, error: 'Unknown VyOS command' };
    }

    return { valid: true };
  }

  /**
   * Execute commands with progress callback
   */
  async executeWithProgress(
    commands: string[],
    onProgress?: (current: number, total: number, command: string) => void
  ): Promise<void> {
    const total = commands.length;

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];

      if (onProgress) {
        onProgress(i + 1, total, command);
      }

      await this.executeConfigCommand(command);
    }
  }
}
