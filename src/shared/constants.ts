/**
 * Application-wide constants
 */

export const APP_NAME = 'VyOS Manager';
export const APP_VERSION = '1.0.0';

// SSH Configuration
export const SSH_DEFAULT_PORT = 22;
export const SSH_CONNECTION_TIMEOUT = 10000; // 10 seconds
export const SSH_KEEPALIVE_INTERVAL = 5000; // 5 seconds
export const SSH_MAX_RETRIES = 3;

// VyOS Command Timeouts
export const VYOS_COMMAND_TIMEOUT = 30000; // 30 seconds
export const VYOS_COMMIT_TIMEOUT = 60000; // 60 seconds
export const VYOS_CONFIG_TIMEOUT = 120000; // 2 minutes for large configs

// VyOS Command Patterns
export const VYOS_COMMANDS = {
  ENTER_CONFIG: 'configure',
  EXIT_CONFIG: 'exit',
  COMMIT: 'commit',
  COMMIT_CONFIRM: 'commit-confirm',
  SAVE: 'save',
  DISCARD: 'discard',
  COMPARE: 'compare',
  ROLLBACK: 'rollback',
  SHOW_CONFIG: 'show configuration',
  SHOW_CONFIG_COMMANDS: 'show configuration commands',
  SHOW_VERSION: 'show version',
  SHOW_INTERFACES: 'show interfaces',
  SHOW_SYSTEM: 'show system',
} as const;

// VyOS Config Paths
export const VYOS_CONFIG_PATHS = {
  INTERFACES: 'interfaces',
  PROTOCOLS: 'protocols',
  FIREWALL: 'firewall',
  ZONE_POLICY: 'zone-policy',
  NAT: 'nat',
  VPN: 'vpn',
  SYSTEM: 'system',
  SERVICE: 'service',
} as const;

// Database Configuration
export const DB_NAME = 'vyos-manager.db';
export const DB_VERSION = 1;

// Storage Paths (relative to user data directory)
export const STORAGE_PATHS = {
  DATABASE: 'database',
  BACKUPS: 'backups',
  LOGS: 'logs',
  SSH_KEYS: 'ssh-keys',
} as const;

// Credential Storage
export const CREDENTIAL_SERVICE = 'vyos-desktop-manager';
export const CREDENTIAL_PREFIX = 'device';

// Backup Configuration
export const MAX_BACKUPS_PER_DEVICE = 50;
export const BACKUP_RETENTION_DAYS = 30;

// UI Configuration
export const THEME_STORAGE_KEY = 'theme';
export const SETTINGS_STORAGE_KEY = 'app-settings';

// Validation Patterns
export const VALIDATION = {
  // IPv4 address with optional CIDR
  IPV4_CIDR: /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/,

  // IPv6 address with optional CIDR
  IPV6_CIDR: /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))(\/([0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8]))?$/,

  // Hostname
  HOSTNAME: /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/,

  // Domain name
  DOMAIN: /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i,

  // Interface name (eth0, eth1.100, bond0, br0)
  INTERFACE_NAME: /^(eth|bond|br|tun|vtun|wg|lo)\d+(\.\d+)?$/,

  // Port number or range
  PORT: /^([0-9]{1,5})(-[0-9]{1,5})?$/,

  // MAC address
  MAC_ADDRESS: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,

  // VLAN ID (1-4094)
  VLAN_ID: /^([1-9]|[1-9][0-9]{1,2}|[1-3][0-9]{3}|40[0-8][0-9]|409[0-4])$/,

  // VyOS configuration path
  CONFIG_PATH: /^[a-z0-9\-]+(\s+[a-z0-9\-'\.]+)*$/i,
} as const;

// Default Values
export const DEFAULTS = {
  SSH_PORT: 22,
  SSH_TIMEOUT: 10000,
  MTU: 1500,
  FIREWALL_DEFAULT_ACTION: 'drop' as const,
  NTP_SERVERS: ['pool.ntp.org', 'time.google.com'],
  DNS_SERVERS: ['8.8.8.8', '8.8.4.4'],
  IKE_LIFETIME: 3600,
  ESP_LIFETIME: 1800,
  BOND_MODE: '802.3ad' as const,
  BRIDGE_AGING: 300,
} as const;

// VyOS 1.5 Supported Features
export const VYOS_FEATURES = {
  INTERFACES: ['ethernet', 'vlan', 'bond', 'bridge', 'loopback', 'tunnel'],
  BOND_MODES: ['active-backup', '802.3ad', 'balance-rr', 'balance-xor', 'broadcast', 'balance-tlb', 'balance-alb'],
  FIREWALL_ACTIONS: ['accept', 'drop', 'reject'],
  FIREWALL_PROTOCOLS: ['tcp', 'udp', 'icmp', 'esp', 'ah', 'all'],
  NAT_TYPES: ['source', 'destination'],
  IPSEC_ENCRYPTION: ['aes256', 'aes128', '3des'],
  IPSEC_HASH: ['sha256', 'sha1', 'md5'],
  IPSEC_DH_GROUPS: ['2', '5', '14', '15', '16', '19', '20'],
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  SSH_CONNECTION_FAILED: 'Failed to connect to device. Please check the host, port, and credentials.',
  SSH_AUTH_FAILED: 'Authentication failed. Please check your username and password/key.',
  SSH_TIMEOUT: 'Connection timeout. The device may be unreachable.',
  VYOS_COMMAND_FAILED: 'VyOS command execution failed.',
  VYOS_COMMIT_FAILED: 'Failed to commit configuration changes.',
  VYOS_PARSE_ERROR: 'Failed to parse VyOS configuration.',
  DEVICE_NOT_FOUND: 'Device not found.',
  INVALID_CONFIG: 'Invalid configuration data.',
  BACKUP_FAILED: 'Failed to create configuration backup.',
  RESTORE_FAILED: 'Failed to restore configuration from backup.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  DEVICE_ADDED: 'Device added successfully.',
  DEVICE_UPDATED: 'Device updated successfully.',
  DEVICE_DELETED: 'Device deleted successfully.',
  CONFIG_COMMITTED: 'Configuration committed successfully.',
  CONFIG_SAVED: 'Configuration saved successfully.',
  BACKUP_CREATED: 'Backup created successfully.',
  CONFIG_RESTORED: 'Configuration restored successfully.',
} as const;

// Log Levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

// Audit Action Types
export enum AuditActionType {
  DEVICE_ADD = 'device:add',
  DEVICE_UPDATE = 'device:update',
  DEVICE_DELETE = 'device:delete',
  CONFIG_SET = 'config:set',
  CONFIG_DELETE = 'config:delete',
  CONFIG_COMMIT = 'config:commit',
  CONFIG_ROLLBACK = 'config:rollback',
  BACKUP_CREATE = 'backup:create',
  BACKUP_RESTORE = 'backup:restore',
}
