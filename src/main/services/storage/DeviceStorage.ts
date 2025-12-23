/**
 * Device Storage - SQLite-based device profile storage
 */

import { app } from 'electron';
import initSqlJs, { Database } from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { DeviceProfile } from '@shared/types';
import { DB_NAME } from '@shared/constants';
import log from 'electron-log';

export class DeviceStorage {
  private db: Database | null = null;
  private dbPath: string;
  private initialized: boolean = false;

  constructor() {
    const userDataPath = app.getPath('userData');
    const dbDir = join(userDataPath, 'database');

    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    this.dbPath = join(dbDir, DB_NAME);
  }

  /**
   * Initialize database
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const SQL = await initSqlJs();

      // Load existing database or create new
      if (existsSync(this.dbPath)) {
        const buffer = readFileSync(this.dbPath);
        this.db = new SQL.Database(buffer);
        log.info('Database loaded from:', this.dbPath);
      } else {
        this.db = new SQL.Database();
        log.info('New database created');
      }

      // Create tables
      await this.createTables();
      this.initialized = true;
    } catch (error) {
      log.error('Failed to initialize database:', error);
      throw new Error(`Database initialization failed: ${(error as Error).message}`);
    }
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    const createDevicesTable = `
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER NOT NULL,
        username TEXT NOT NULL,
        authType TEXT NOT NULL,
        keyPath TEXT,
        credentialId TEXT NOT NULL,
        vyosVersion TEXT,
        hostname TEXT,
        lastConnected TEXT,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `;

    this.db!.run(createDevicesTable);
    this.save();
  }

  /**
   * Save database to disk
   */
  private save(): void {
    if (!this.db) {
      return;
    }

    try {
      const data = this.db.export();
      writeFileSync(this.dbPath, data);
    } catch (error) {
      log.error('Failed to save database:', error);
    }
  }

  // ============================================================================
  // Device CRUD Operations
  // ============================================================================

  /**
   * Add a new device
   */
  async addDevice(device: DeviceProfile): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const stmt = this.db!.prepare(`
        INSERT INTO devices (
          id, name, host, port, username, authType, keyPath, credentialId,
          vyosVersion, hostname, lastConnected, status, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        device.id,
        device.name,
        device.host,
        device.port,
        device.username,
        device.authType,
        device.keyPath || null,
        device.credentialId,
        device.vyosVersion || null,
        device.hostname || null,
        device.lastConnected ? device.lastConnected.toISOString() : null,
        device.status,
        device.createdAt.toISOString(),
        device.updatedAt.toISOString(),
      ]);

      stmt.free();
      this.save();

      log.info(`Device added: ${device.name} (${device.id})`);
    } catch (error) {
      log.error('Failed to add device:', error);
      throw new Error(`Failed to add device: ${(error as Error).message}`);
    }
  }

  /**
   * Get device by ID
   */
  async getDevice(id: string): Promise<DeviceProfile | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const stmt = this.db!.prepare('SELECT * FROM devices WHERE id = ?');
      stmt.bind([id]);

      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return this.rowToDevice(row);
      }

      stmt.free();
      return null;
    } catch (error) {
      log.error('Failed to get device:', error);
      return null;
    }
  }

  /**
   * Get all devices
   */
  async getAllDevices(): Promise<DeviceProfile[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const stmt = this.db!.prepare('SELECT * FROM devices ORDER BY name ASC');
      const devices: DeviceProfile[] = [];

      while (stmt.step()) {
        const row = stmt.getAsObject();
        devices.push(this.rowToDevice(row));
      }

      stmt.free();
      return devices;
    } catch (error) {
      log.error('Failed to get all devices:', error);
      return [];
    }
  }

  /**
   * Update device
   */
  async updateDevice(device: DeviceProfile): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      device.updatedAt = new Date();

      const stmt = this.db!.prepare(`
        UPDATE devices SET
          name = ?, host = ?, port = ?, username = ?, authType = ?, keyPath = ?,
          credentialId = ?, vyosVersion = ?, hostname = ?, lastConnected = ?,
          status = ?, updatedAt = ?
        WHERE id = ?
      `);

      stmt.run([
        device.name,
        device.host,
        device.port,
        device.username,
        device.authType,
        device.keyPath || null,
        device.credentialId,
        device.vyosVersion || null,
        device.hostname || null,
        device.lastConnected ? device.lastConnected.toISOString() : null,
        device.status,
        device.updatedAt.toISOString(),
        device.id,
      ]);

      stmt.free();
      this.save();

      log.info(`Device updated: ${device.name} (${device.id})`);
    } catch (error) {
      log.error('Failed to update device:', error);
      throw new Error(`Failed to update device: ${(error as Error).message}`);
    }
  }

  /**
   * Delete device
   */
  async deleteDevice(id: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const stmt = this.db!.prepare('DELETE FROM devices WHERE id = ?');
      stmt.run([id]);
      stmt.free();
      this.save();

      log.info(`Device deleted: ${id}`);
    } catch (error) {
      log.error('Failed to delete device:', error);
      throw new Error(`Failed to delete device: ${(error as Error).message}`);
    }
  }

  /**
   * Update device status
   */
  async updateDeviceStatus(id: string, status: 'online' | 'offline' | 'unknown'): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const stmt = this.db!.prepare(`
        UPDATE devices SET status = ?, updatedAt = ? WHERE id = ?
      `);

      stmt.run([status, new Date().toISOString(), id]);
      stmt.free();
      this.save();
    } catch (error) {
      log.error('Failed to update device status:', error);
    }
  }

  /**
   * Update last connected time
   */
  async updateLastConnected(id: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const now = new Date().toISOString();
      const stmt = this.db!.prepare(`
        UPDATE devices SET lastConnected = ?, status = ?, updatedAt = ? WHERE id = ?
      `);

      stmt.run([now, 'online', now, id]);
      stmt.free();
      this.save();
    } catch (error) {
      log.error('Failed to update last connected:', error);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Convert database row to DeviceProfile
   */
  private rowToDevice(row: any): DeviceProfile {
    return {
      id: row.id as string,
      name: row.name as string,
      host: row.host as string,
      port: row.port as number,
      username: row.username as string,
      authType: row.authType as 'password' | 'key',
      keyPath: row.keyPath as string | undefined,
      credentialId: row.credentialId as string,
      vyosVersion: row.vyosVersion as string | undefined,
      hostname: row.hostname as string | undefined,
      lastConnected: row.lastConnected ? new Date(row.lastConnected as string) : undefined,
      status: row.status as 'online' | 'offline' | 'unknown',
      createdAt: new Date(row.createdAt as string),
      updatedAt: new Date(row.updatedAt as string),
    };
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
      log.info('Database closed');
    }
  }

  /**
   * Get database path
   */
  getDatabasePath(): string {
    return this.dbPath;
  }
}
