/**
 * Backup Manager - Manages VyOS configuration backups
 */

import { app } from 'electron';
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';
import { VyOSConfigBackup } from '@shared/types';
import { MAX_BACKUPS_PER_DEVICE, BACKUP_RETENTION_DAYS } from '@shared/constants';
import log from 'electron-log';

export class BackupManager {
  private backupDir: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.backupDir = join(userDataPath, 'backups');

    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create a new backup
   */
  async createBackup(
    deviceId: string,
    deviceName: string,
    config: string,
    description?: string
  ): Promise<VyOSConfigBackup> {
    try {
      const backup: VyOSConfigBackup = {
        id: this.generateBackupId(),
        deviceId,
        deviceName,
        timestamp: new Date(),
        config,
        size: Buffer.from(config).length,
        description,
      };

      const filename = this.getBackupFilename(backup);
      const filepath = join(this.backupDir, filename);

      // Save backup file
      writeFileSync(filepath, JSON.stringify(backup, null, 2));

      log.info(`Backup created: ${filename}`);

      // Cleanup old backups
      await this.cleanupOldBackups(deviceId);

      return backup;
    } catch (error) {
      log.error('Failed to create backup:', error);
      throw new Error(`Failed to create backup: ${(error as Error).message}`);
    }
  }

  /**
   * Get all backups for a device
   */
  async getBackups(deviceId: string): Promise<VyOSConfigBackup[]> {
    try {
      const files = readdirSync(this.backupDir);
      const backups: VyOSConfigBackup[] = [];

      for (const file of files) {
        if (file.startsWith(`${deviceId}_`) && file.endsWith('.json')) {
          const filepath = join(this.backupDir, file);
          const data = readFileSync(filepath, 'utf8');
          const backup = JSON.parse(data) as VyOSConfigBackup;

          // Convert timestamp string back to Date
          backup.timestamp = new Date(backup.timestamp);

          backups.push(backup);
        }
      }

      // Sort by timestamp descending (newest first)
      backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return backups;
    } catch (error) {
      log.error('Failed to get backups:', error);
      return [];
    }
  }

  /**
   * Get a specific backup
   */
  async getBackup(backupId: string): Promise<VyOSConfigBackup | null> {
    try {
      const files = readdirSync(this.backupDir);

      for (const file of files) {
        if (file.includes(`_${backupId}_`) && file.endsWith('.json')) {
          const filepath = join(this.backupDir, file);
          const data = readFileSync(filepath, 'utf8');
          const backup = JSON.parse(data) as VyOSConfigBackup;

          backup.timestamp = new Date(backup.timestamp);
          return backup;
        }
      }

      return null;
    } catch (error) {
      log.error('Failed to get backup:', error);
      return null;
    }
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupId: string): Promise<boolean> {
    try {
      const files = readdirSync(this.backupDir);

      for (const file of files) {
        if (file.includes(`_${backupId}_`) && file.endsWith('.json')) {
          const filepath = join(this.backupDir, file);
          unlinkSync(filepath);
          log.info(`Backup deleted: ${file}`);
          return true;
        }
      }

      return false;
    } catch (error) {
      log.error('Failed to delete backup:', error);
      return false;
    }
  }

  /**
   * Delete all backups for a device
   */
  async deleteDeviceBackups(deviceId: string): Promise<number> {
    try {
      const files = readdirSync(this.backupDir);
      let deleted = 0;

      for (const file of files) {
        if (file.startsWith(`${deviceId}_`) && file.endsWith('.json')) {
          const filepath = join(this.backupDir, file);
          unlinkSync(filepath);
          deleted++;
        }
      }

      log.info(`Deleted ${deleted} backups for device ${deviceId}`);
      return deleted;
    } catch (error) {
      log.error('Failed to delete device backups:', error);
      return 0;
    }
  }

  /**
   * Export backup to file
   */
  async exportBackup(backupId: string, destinationPath: string): Promise<void> {
    try {
      const backup = await this.getBackup(backupId);

      if (!backup) {
        throw new Error('Backup not found');
      }

      // Export just the configuration
      writeFileSync(destinationPath, backup.config);
      log.info(`Backup exported to: ${destinationPath}`);
    } catch (error) {
      log.error('Failed to export backup:', error);
      throw new Error(`Failed to export backup: ${(error as Error).message}`);
    }
  }

  /**
   * Import backup from file
   */
  async importBackup(
    deviceId: string,
    deviceName: string,
    filepath: string,
    description?: string
  ): Promise<VyOSConfigBackup> {
    try {
      const config = readFileSync(filepath, 'utf8');
      return await this.createBackup(deviceId, deviceName, config, description || 'Imported backup');
    } catch (error) {
      log.error('Failed to import backup:', error);
      throw new Error(`Failed to import backup: ${(error as Error).message}`);
    }
  }

  /**
   * Get backup statistics
   */
  async getBackupStats(deviceId?: string): Promise<{
    totalBackups: number;
    totalSize: number;
    oldestBackup?: Date;
    newestBackup?: Date;
  }> {
    try {
      const files = readdirSync(this.backupDir);
      let totalBackups = 0;
      let totalSize = 0;
      let oldestDate: Date | undefined;
      let newestDate: Date | undefined;

      for (const file of files) {
        if (file.endsWith('.json')) {
          if (deviceId && !file.startsWith(`${deviceId}_`)) {
            continue;
          }

          const filepath = join(this.backupDir, file);
          const stats = statSync(filepath);
          totalSize += stats.size;
          totalBackups++;

          const data = readFileSync(filepath, 'utf8');
          const backup = JSON.parse(data) as VyOSConfigBackup;
          const backupDate = new Date(backup.timestamp);

          if (!oldestDate || backupDate < oldestDate) {
            oldestDate = backupDate;
          }

          if (!newestDate || backupDate > newestDate) {
            newestDate = backupDate;
          }
        }
      }

      return {
        totalBackups,
        totalSize,
        oldestBackup: oldestDate,
        newestBackup: newestDate,
      };
    } catch (error) {
      log.error('Failed to get backup stats:', error);
      return { totalBackups: 0, totalSize: 0 };
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Generate unique backup ID
   */
  private generateBackupId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get backup filename
   */
  private getBackupFilename(backup: VyOSConfigBackup): string {
    const timestamp = backup.timestamp.toISOString().replace(/[:.]/g, '-');
    return `${backup.deviceId}_${backup.id}_${timestamp}.json`;
  }

  /**
   * Cleanup old backups
   */
  private async cleanupOldBackups(deviceId: string): Promise<void> {
    try {
      const backups = await this.getBackups(deviceId);

      // Remove backups exceeding max count
      if (backups.length > MAX_BACKUPS_PER_DEVICE) {
        const toDelete = backups.slice(MAX_BACKUPS_PER_DEVICE);

        for (const backup of toDelete) {
          await this.deleteBackup(backup.id);
        }

        log.info(`Cleaned up ${toDelete.length} old backups for device ${deviceId}`);
      }

      // Remove backups older than retention period
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - BACKUP_RETENTION_DAYS);

      for (const backup of backups) {
        if (backup.timestamp < cutoffDate) {
          await this.deleteBackup(backup.id);
          log.info(`Removed expired backup: ${backup.id}`);
        }
      }
    } catch (error) {
      log.error('Failed to cleanup old backups:', error);
    }
  }

  /**
   * Get backup directory path
   */
  getBackupDirectory(): string {
    return this.backupDir;
  }
}
