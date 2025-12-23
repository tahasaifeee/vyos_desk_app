/**
 * Main Electron Process
 */

// Register module aliases FIRST before any other imports
import 'module-alias/register';

import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import log from 'electron-log';
import Store from 'electron-store';
import { DeviceStorage } from './services/storage/DeviceStorage';
import { CredentialStore } from './services/storage/CredentialStore';
import { BackupManager } from './services/backup/BackupManager';
import { registerIPCHandlers } from './ipc-handlers';

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

// Global references
let mainWindow: BrowserWindow | null = null;
const deviceStorage = new DeviceStorage();
const credentialStore = new CredentialStore();
const backupManager = new BackupManager();
const settings = new Store();

// ============================================================================
// Application Lifecycle
// ============================================================================

app.on('ready', async () => {
  log.info('Application starting...');

  // Initialize storage
  try {
    await deviceStorage.initialize();
    log.info('Device storage initialized');

    // Test credential storage
    const credStoreAvailable = await credentialStore.testAvailability();
    if (!credStoreAvailable) {
      log.warn('Credential storage may not be available on this system');
    }
  } catch (error) {
    log.error('Failed to initialize storage:', error);
  }

  // Register IPC handlers
  registerIPCHandlers(ipcMain, {
    deviceStorage,
    credentialStore,
    backupManager,
    settings,
  });

  // Create main window
  createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});

app.on('before-quit', async () => {
  log.info('Application shutting down...');
  await deviceStorage.close();
});

// ============================================================================
// Window Management
// ============================================================================

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: 'VyOS Manager',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js'),
    },
    show: false,
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow!.show();
    log.info('Main window shown');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============================================================================
// Error Handling
// ============================================================================

process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled rejection at:', promise, 'reason:', reason);
});

// Export for testing
export { mainWindow, deviceStorage, credentialStore, backupManager, settings };
