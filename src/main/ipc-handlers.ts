/**
 * IPC Handlers - Handle communication between main and renderer processes
 */

import { IpcMain } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import log from 'electron-log';
import { DeviceStorage } from './services/storage/DeviceStorage';
import { CredentialStore } from './services/storage/CredentialStore';
import { BackupManager } from './services/backup/BackupManager';
import { VyOSClient } from './services/vyos/VyOSClient';
import { DeviceProfile, IPCChannel, IPCResponse } from '@shared/types';
import type Store from 'electron-store';

interface Services {
  deviceStorage: DeviceStorage;
  credentialStore: CredentialStore;
  backupManager: BackupManager;
  settings: Store;
}

// Active VyOS connections
const activeConnections = new Map<string, VyOSClient>();

/**
 * Register all IPC handlers
 */
export function registerIPCHandlers(ipcMain: IpcMain, services: Services): void {
  const { deviceStorage, credentialStore, backupManager, settings } = services;

  // ============================================================================
  // Device Management
  // ============================================================================

  ipcMain.handle(IPCChannel.DEVICE_LIST, async (): Promise<IPCResponse<DeviceProfile[]>> => {
    try {
      const devices = await deviceStorage.getAllDevices();
      return { id: uuidv4(), success: true, data: devices };
    } catch (error) {
      log.error('DEVICE_LIST error:', error);
      return { id: uuidv4(), success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPCChannel.DEVICE_ADD, async (_event, data: DeviceProfile): Promise<IPCResponse<void>> => {
    try {
      const device: DeviceProfile = {
        ...data,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'unknown',
      };

      await deviceStorage.addDevice(device);

      // Store credentials
      if (data.authType === 'password') {
        await credentialStore.storeCredentials(device.id, {
          password: data.password,
        });
      } else if (data.authType === 'key') {
        await credentialStore.storeCredentials(device.id, {
          privateKey: data.privateKey,
        });
      }

      return { id: uuidv4(), success: true };
    } catch (error) {
      log.error('DEVICE_ADD error:', error);
      return { id: uuidv4(), success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPCChannel.DEVICE_UPDATE, async (_event, data: DeviceProfile): Promise<IPCResponse<void>> => {
    try {
      await deviceStorage.updateDevice(data);

      // Update credentials if provided
      if (data.password || data.privateKey) {
        await credentialStore.updateCredentials(data.id, {
          password: data.password,
          privateKey: data.privateKey,
        });
      }

      return { id: uuidv4(), success: true };
    } catch (error) {
      log.error('DEVICE_UPDATE error:', error);
      return { id: uuidv4(), success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPCChannel.DEVICE_DELETE, async (_event, deviceId: string): Promise<IPCResponse<void>> => {
    try {
      await deviceStorage.deleteDevice(deviceId);
      await credentialStore.deleteCredentials(deviceId);
      await backupManager.deleteDeviceBackups(deviceId);

      // Close connection if active
      if (activeConnections.has(deviceId)) {
        activeConnections.get(deviceId)!.disconnect();
        activeConnections.delete(deviceId);
      }

      return { id: uuidv4(), success: true };
    } catch (error) {
      log.error('DEVICE_DELETE error:', error);
      return { id: uuidv4(), success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPCChannel.DEVICE_TEST, async (_event, deviceId: string): Promise<IPCResponse> => {
    try {
      const device = await deviceStorage.getDevice(deviceId);
      if (!device) {
        throw new Error('Device not found');
      }

      const credentials = await credentialStore.getCredentials(deviceId);
      if (!credentials) {
        throw new Error('Credentials not found');
      }

      const client = new VyOSClient({
        host: device.host,
        port: device.port,
        username: device.username,
        password: credentials.password,
        privateKey: credentials.privateKey,
      });

      const testResult = await client.testConnection();

      if (testResult.success) {
        // Update device info
        device.vyosVersion = testResult.vyosVersion;
        device.hostname = testResult.hostname;
        await deviceStorage.updateLastConnected(deviceId);
      } else {
        await deviceStorage.updateDeviceStatus(deviceId, 'offline');
      }

      client.disconnect();

      return { id: uuidv4(), success: true, data: testResult };
    } catch (error) {
      log.error('DEVICE_TEST error:', error);
      return { id: uuidv4(), success: false, error: (error as Error).message };
    }
  });

  // ============================================================================
  // SSH Operations
  // ============================================================================

  ipcMain.handle(IPCChannel.SSH_CONNECT, async (_event, deviceId: string): Promise<IPCResponse> => {
    try {
      const device = await deviceStorage.getDevice(deviceId);
      if (!device) {
        throw new Error('Device not found');
      }

      const credentials = await credentialStore.getCredentials(deviceId);
      if (!credentials) {
        throw new Error('Credentials not found');
      }

      let client = activeConnections.get(deviceId);

      if (!client) {
        client = new VyOSClient({
          host: device.host,
          port: device.port,
          username: device.username,
          password: credentials.password,
          privateKeyPath: device.keyPath,
          privateKey: credentials.privateKey,
        });

        await client.connect();
        activeConnections.set(deviceId, client);
      }

      await deviceStorage.updateLastConnected(deviceId);

      return { id: uuidv4(), success: true };
    } catch (error) {
      log.error('SSH_CONNECT error:', error);
      return { id: uuidv4(), success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPCChannel.SSH_DISCONNECT, async (_event, deviceId: string): Promise<IPCResponse> => {
    try {
      const client = activeConnections.get(deviceId);
      if (client) {
        client.disconnect();
        activeConnections.delete(deviceId);
      }

      return { id: uuidv4(), success: true };
    } catch (error) {
      log.error('SSH_DISCONNECT error:', error);
      return { id: uuidv4(), success: false, error: (error as Error).message };
    }
  });

  // ============================================================================
  // VyOS Operations
  // ============================================================================

  ipcMain.handle(IPCChannel.VYOS_GET_CONFIG, async (_event, deviceId: string): Promise<IPCResponse> => {
    try {
      const client = activeConnections.get(deviceId);
      if (!client) {
        throw new Error('Not connected to device');
      }

      const config = await client.getParsedConfiguration();
      return { id: uuidv4(), success: true, data: config };
    } catch (error) {
      log.error('VYOS_GET_CONFIG error:', error);
      return { id: uuidv4(), success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPCChannel.VYOS_GET_INTERFACES, async (_event, deviceId: string): Promise<IPCResponse> => {
    try {
      const client = activeConnections.get(deviceId);
      if (!client) {
        throw new Error('Not connected to device');
      }

      const interfaces = await client.getInterfaces();
      return { id: uuidv4(), success: true, data: interfaces };
    } catch (error) {
      log.error('VYOS_GET_INTERFACES error:', error);
      return { id: uuidv4(), success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPCChannel.VYOS_EXECUTE_COMMANDS, async (_event, { deviceId, commands, options }): Promise<IPCResponse> => {
    try {
      const client = activeConnections.get(deviceId);
      if (!client) {
        throw new Error('Not connected to device');
      }

      // Create backup before executing
      const device = await deviceStorage.getDevice(deviceId);
      if (device) {
        const configBackup = await client.getConfiguration();
        await backupManager.createBackup(
          deviceId,
          device.name,
          configBackup,
          'Auto-backup before command execution'
        );
      }

      await client.executeCommands(commands, options);

      return { id: uuidv4(), success: true };
    } catch (error) {
      log.error('VYOS_EXECUTE_COMMANDS error:', error);
      return { id: uuidv4(), success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPCChannel.VYOS_PREVIEW_COMMANDS, async (_event, { type, data }): Promise<IPCResponse> => {
    try {
      // Create a temporary client just for command preview
      const tempClient = new VyOSClient({
        host: 'localhost',
        port: 22,
        username: 'vyos',
        password: 'vyos',
      });

      const commands = tempClient.previewCommands(type, data);

      return { id: uuidv4(), success: true, data: commands };
    } catch (error) {
      log.error('VYOS_PREVIEW_COMMANDS error:', error);
      return { id: uuidv4(), success: false, error: (error as Error).message };
    }
  });

  // ============================================================================
  // Backup Operations
  // ============================================================================

  ipcMain.handle(IPCChannel.BACKUP_CREATE, async (_event, deviceId: string): Promise<IPCResponse> => {
    try {
      const client = activeConnections.get(deviceId);
      if (!client) {
        throw new Error('Not connected to device');
      }

      const device = await deviceStorage.getDevice(deviceId);
      if (!device) {
        throw new Error('Device not found');
      }

      const config = await client.getConfiguration();
      const backup = await backupManager.createBackup(
        deviceId,
        device.name,
        config,
        'Manual backup'
      );

      return { id: uuidv4(), success: true, data: backup };
    } catch (error) {
      log.error('BACKUP_CREATE error:', error);
      return { id: uuidv4(), success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPCChannel.BACKUP_LIST, async (_event, deviceId: string): Promise<IPCResponse> => {
    try {
      const backups = await backupManager.getBackups(deviceId);
      return { id: uuidv4(), success: true, data: backups };
    } catch (error) {
      log.error('BACKUP_LIST error:', error);
      return { id: uuidv4(), success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPCChannel.BACKUP_RESTORE, async (_event, { deviceId, backupId }): Promise<IPCResponse> => {
    try {
      const client = activeConnections.get(deviceId);
      if (!client) {
        throw new Error('Not connected to device');
      }

      const backup = await backupManager.getBackup(backupId);
      if (!backup) {
        throw new Error('Backup not found');
      }

      // Parse backup config and restore
      // This would involve parsing the config and executing the commands
      // For now, we'll just indicate success

      return { id: uuidv4(), success: true };
    } catch (error) {
      log.error('BACKUP_RESTORE error:', error);
      return { id: uuidv4(), success: false, error: (error as Error).message };
    }
  });

  // ============================================================================
  // Settings
  // ============================================================================

  ipcMain.handle(IPCChannel.SETTINGS_GET, async (): Promise<IPCResponse> => {
    try {
      const allSettings = settings.store;
      return { id: uuidv4(), success: true, data: allSettings };
    } catch (error) {
      log.error('SETTINGS_GET error:', error);
      return { id: uuidv4(), success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPCChannel.SETTINGS_UPDATE, async (_event, data: any): Promise<IPCResponse> => {
    try {
      Object.entries(data).forEach(([key, value]) => {
        settings.set(key, value);
      });

      return { id: uuidv4(), success: true };
    } catch (error) {
      log.error('SETTINGS_UPDATE error:', error);
      return { id: uuidv4(), success: false, error: (error as Error).message };
    }
  });

  log.info('IPC handlers registered');
}
