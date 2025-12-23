/**
 * SSH Client - Handles SSH connections to VyOS devices
 */

import { Client, ClientChannel, ConnectConfig } from 'ssh2';
import { readFileSync } from 'fs';
import { SSHConnectionError, VyOSCommandResult } from '@shared/types';
import {
  SSH_CONNECTION_TIMEOUT,
  SSH_KEEPALIVE_INTERVAL,
  SSH_MAX_RETRIES,
  VYOS_COMMAND_TIMEOUT,
} from '@shared/constants';
import log from 'electron-log';

export interface SSHConnectionOptions {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  privateKeyPath?: string;
  timeout?: number;
  keepaliveInterval?: number;
}

export interface SSHCommandOptions {
  timeout?: number;
  pty?: boolean;
}

export class SSHClient {
  private client: Client | null = null;
  private connected: boolean = false;
  private connectionOptions: SSHConnectionOptions;

  constructor(options: SSHConnectionOptions) {
    this.connectionOptions = {
      ...options,
      timeout: options.timeout || SSH_CONNECTION_TIMEOUT,
      keepaliveInterval: options.keepaliveInterval || SSH_KEEPALIVE_INTERVAL,
    };
  }

  /**
   * Connect to the SSH server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client = new Client();

      const config: ConnectConfig = {
        host: this.connectionOptions.host,
        port: this.connectionOptions.port,
        username: this.connectionOptions.username,
        readyTimeout: this.connectionOptions.timeout,
        keepaliveInterval: this.connectionOptions.keepaliveInterval,
      };

      // Handle authentication
      if (this.connectionOptions.password) {
        config.password = this.connectionOptions.password;
      } else if (this.connectionOptions.privateKeyPath) {
        try {
          config.privateKey = readFileSync(this.connectionOptions.privateKeyPath);
        } catch (error) {
          reject(new SSHConnectionError(`Failed to read private key: ${(error as Error).message}`));
          return;
        }
      } else if (this.connectionOptions.privateKey) {
        config.privateKey = Buffer.from(this.connectionOptions.privateKey);
      } else {
        reject(new SSHConnectionError('No authentication method provided'));
        return;
      }

      this.client
        .on('ready', () => {
          log.info(`SSH connection established to ${this.connectionOptions.host}`);
          this.connected = true;
          resolve();
        })
        .on('error', (err) => {
          log.error('SSH connection error:', err);
          this.connected = false;

          let errorMessage = 'SSH connection failed';
          if (err.message.includes('ENOTFOUND')) {
            errorMessage = 'Host not found';
          } else if (err.message.includes('ECONNREFUSED')) {
            errorMessage = 'Connection refused';
          } else if (err.message.includes('ETIMEDOUT')) {
            errorMessage = 'Connection timeout';
          } else if (err.level === 'client-authentication') {
            errorMessage = 'Authentication failed';
          }

          reject(new SSHConnectionError(errorMessage, err));
        })
        .on('close', () => {
          log.info('SSH connection closed');
          this.connected = false;
        })
        .on('end', () => {
          log.info('SSH connection ended');
          this.connected = false;
        })
        .connect(config);
    });
  }

  /**
   * Disconnect from SSH server
   */
  disconnect(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.connected = false;
      log.info('SSH client disconnected');
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.client !== null;
  }

  /**
   * Execute a single command
   */
  async exec(command: string, options?: SSHCommandOptions): Promise<VyOSCommandResult> {
    if (!this.isConnected()) {
      throw new SSHConnectionError('Not connected to SSH server');
    }

    return new Promise((resolve, reject) => {
      const timeout = options?.timeout || VYOS_COMMAND_TIMEOUT;
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        reject(new SSHConnectionError(`Command timeout after ${timeout}ms: ${command}`));
      }, timeout);

      this.client!.exec(command, { pty: options?.pty || false }, (err, channel: ClientChannel) => {
        if (err) {
          clearTimeout(timeoutHandle);
          reject(new SSHConnectionError(`Failed to execute command: ${err.message}`, err));
          return;
        }

        channel
          .on('data', (data: Buffer) => {
            stdout += data.toString('utf8');
          })
          .on('extended data', (data: Buffer) => {
            stderr += data.toString('utf8');
          })
          .on('close', (code: number) => {
            if (timedOut) return;

            clearTimeout(timeoutHandle);

            const result: VyOSCommandResult = {
              success: code === 0 && stderr.length === 0,
              output: stdout.trim(),
              error: stderr.trim(),
              exitCode: code,
            };

            log.debug(`Command executed: ${command} (exit code: ${code})`);

            if (result.success) {
              resolve(result);
            } else {
              reject(new SSHConnectionError(`Command failed with exit code ${code}`, result));
            }
          });
      });
    });
  }

  /**
   * Execute multiple commands sequentially
   */
  async execMultiple(commands: string[], options?: SSHCommandOptions): Promise<VyOSCommandResult[]> {
    const results: VyOSCommandResult[] = [];

    for (const command of commands) {
      try {
        const result = await this.exec(command, options);
        results.push(result);
      } catch (error) {
        throw error;
      }
    }

    return results;
  }

  /**
   * Execute commands in an interactive shell
   * Useful for VyOS configure mode
   */
  async shell(commands: string[], timeout: number = VYOS_COMMAND_TIMEOUT): Promise<string> {
    if (!this.isConnected()) {
      throw new SSHConnectionError('Not connected to SSH server');
    }

    return new Promise((resolve, reject) => {
      let output = '';
      let commandIndex = 0;
      let shellReady = false;

      this.client!.shell((err, stream: ClientChannel) => {
        if (err) {
          reject(new SSHConnectionError(`Failed to start shell: ${err.message}`, err));
          return;
        }

        const timeoutHandle = setTimeout(() => {
          stream.end();
          reject(new SSHConnectionError(`Shell timeout after ${timeout}ms`));
        }, timeout);

        stream
          .on('data', (data: Buffer) => {
            const text = data.toString('utf8');
            output += text;

            // Wait for shell prompt before sending commands
            if (!shellReady && (text.includes('$') || text.includes('#'))) {
              shellReady = true;
            }

            // Send next command when we see a prompt
            if (shellReady && commandIndex < commands.length) {
              if (text.includes('$') || text.includes('#') || text.includes('[edit]')) {
                const command = commands[commandIndex];
                stream.write(command + '\n');
                commandIndex++;
              }
            }

            // All commands sent and we got final prompt
            if (commandIndex >= commands.length && (text.includes('$') || text.includes('#'))) {
              clearTimeout(timeoutHandle);
              stream.end();
            }
          })
          .on('close', () => {
            clearTimeout(timeoutHandle);
            resolve(output);
          })
          .on('error', (err: Error) => {
            clearTimeout(timeoutHandle);
            reject(new SSHConnectionError(`Shell error: ${err.message}`, err));
          });
      });
    });
  }

  /**
   * Test connection with retry logic
   */
  async testConnection(): Promise<{ success: boolean; latency: number; error?: string }> {
    const startTime = Date.now();

    for (let attempt = 0; attempt < SSH_MAX_RETRIES; attempt++) {
      try {
        await this.connect();
        const latency = Date.now() - startTime;
        return { success: true, latency };
      } catch (error) {
        if (attempt === SSH_MAX_RETRIES - 1) {
          return {
            success: false,
            latency: Date.now() - startTime,
            error: (error as Error).message,
          };
        }

        // Wait before retry with exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    return { success: false, latency: Date.now() - startTime, error: 'Max retries reached' };
  }

  /**
   * Get connection info
   */
  getConnectionInfo(): {
    host: string;
    port: number;
    username: string;
    connected: boolean;
  } {
    return {
      host: this.connectionOptions.host,
      port: this.connectionOptions.port,
      username: this.connectionOptions.username,
      connected: this.connected,
    };
  }
}
