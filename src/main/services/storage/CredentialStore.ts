/**
 * Credential Store - Secure storage using Windows Credential Manager
 */

import * as keytar from 'keytar';
import { CREDENTIAL_SERVICE, CREDENTIAL_PREFIX } from '@shared/constants';
import log from 'electron-log';

export interface StoredCredential {
  deviceId: string;
  password?: string;
  privateKey?: string;
}

export class CredentialStore {
  private serviceName: string;

  constructor(serviceName: string = CREDENTIAL_SERVICE) {
    this.serviceName = serviceName;
  }

  /**
   * Store device credentials
   */
  async storeCredentials(deviceId: string, credential: { password?: string; privateKey?: string }): Promise<void> {
    try {
      const accountName = this.getAccountName(deviceId);
      const credentialData = JSON.stringify(credential);

      await keytar.setPassword(this.serviceName, accountName, credentialData);
      log.info(`Credentials stored for device: ${deviceId}`);
    } catch (error) {
      log.error('Failed to store credentials:', error);
      throw new Error(`Failed to store credentials: ${error.message}`);
    }
  }

  /**
   * Retrieve device credentials
   */
  async getCredentials(deviceId: string): Promise<StoredCredential | null> {
    try {
      const accountName = this.getAccountName(deviceId);
      const credentialData = await keytar.getPassword(this.serviceName, accountName);

      if (!credentialData) {
        return null;
      }

      const credential = JSON.parse(credentialData);
      return {
        deviceId,
        ...credential,
      };
    } catch (error) {
      log.error('Failed to retrieve credentials:', error);
      return null;
    }
  }

  /**
   * Delete device credentials
   */
  async deleteCredentials(deviceId: string): Promise<boolean> {
    try {
      const accountName = this.getAccountName(deviceId);
      const deleted = await keytar.deletePassword(this.serviceName, accountName);

      if (deleted) {
        log.info(`Credentials deleted for device: ${deviceId}`);
      }

      return deleted;
    } catch (error) {
      log.error('Failed to delete credentials:', error);
      return false;
    }
  }

  /**
   * List all stored credentials
   */
  async listCredentials(): Promise<string[]> {
    try {
      const credentials = await keytar.findCredentials(this.serviceName);
      return credentials.map((cred) => this.extractDeviceId(cred.account));
    } catch (error) {
      log.error('Failed to list credentials:', error);
      return [];
    }
  }

  /**
   * Check if credentials exist for device
   */
  async hasCredentials(deviceId: string): Promise<boolean> {
    const credentials = await this.getCredentials(deviceId);
    return credentials !== null;
  }

  /**
   * Update device credentials
   */
  async updateCredentials(deviceId: string, credential: { password?: string; privateKey?: string }): Promise<void> {
    // Same as store - keytar will overwrite existing credentials
    await this.storeCredentials(deviceId, credential);
  }

  /**
   * Clear all credentials (use with caution)
   */
  async clearAll(): Promise<void> {
    try {
      const deviceIds = await this.listCredentials();

      for (const deviceId of deviceIds) {
        await this.deleteCredentials(deviceId);
      }

      log.warn('All credentials cleared');
    } catch (error) {
      log.error('Failed to clear all credentials:', error);
      throw new Error(`Failed to clear credentials: ${error.message}`);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Generate account name for Windows Credential Manager
   */
  private getAccountName(deviceId: string): string {
    return `${CREDENTIAL_PREFIX}:${deviceId}`;
  }

  /**
   * Extract device ID from account name
   */
  private extractDeviceId(accountName: string): string {
    return accountName.replace(`${CREDENTIAL_PREFIX}:`, '');
  }

  /**
   * Test credential storage availability
   */
  async testAvailability(): Promise<boolean> {
    try {
      const testId = '__test__';
      const testData = { password: 'test' };

      await this.storeCredentials(testId, testData);
      const retrieved = await this.getCredentials(testId);
      await this.deleteCredentials(testId);

      return retrieved !== null && retrieved.password === testData.password;
    } catch (error) {
      log.error('Credential storage not available:', error);
      return false;
    }
  }
}
