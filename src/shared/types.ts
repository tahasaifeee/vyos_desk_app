/**
 * Shared TypeScript types for VyOS Desktop Manager
 * Used across main and renderer processes
 */

// ============================================================================
// Device Management
// ============================================================================

export interface DeviceProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  keyPath?: string;
  credentialId: string;
  password?: string;        // Temporary field for IPC communication
  privateKey?: string;      // Temporary field for IPC communication
  vyosVersion?: string;
  hostname?: string;
  lastConnected?: Date;
  status: 'online' | 'offline' | 'unknown';
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectionTestResult {
  success: boolean;
  vyosVersion?: string;
  hostname?: string;
  error?: string;
  latency?: number;
}

// ============================================================================
// Network Interfaces
// ============================================================================

export type InterfaceType = 'ethernet' | 'vlan' | 'bond' | 'bridge' | 'loopback' | 'tunnel';

export interface NetworkInterface {
  name: string;
  type: InterfaceType;
  description?: string;
  enabled: boolean;
  mtu?: number;
  mac?: string;
  addresses: AddressConfig;
  vlan?: VLANConfig;
  bond?: BondConfig;
  bridge?: BridgeConfig;
}

export interface AddressConfig {
  ipv4: string[];
  ipv6: string[];
  dhcp: boolean;
  dhcpv6: boolean;
}

export interface VLANConfig {
  id: number;
  parentInterface: string;
}

export type BondMode = 'active-backup' | '802.3ad' | 'balance-rr' | 'balance-xor' | 'broadcast' | 'balance-tlb' | 'balance-alb';

export interface BondConfig {
  mode: BondMode;
  members: string[];
  primaryInterface?: string;
  hashPolicy?: 'layer2' | 'layer2+3' | 'layer3+4';
}

export interface BridgeConfig {
  members: string[];
  stp: boolean;
  aging?: number;
  maxAge?: number;
}

// ============================================================================
// Static Routes
// ============================================================================

export interface StaticRoute {
  network: string;
  nextHop?: string;
  interface?: string;
  distance?: number;
  description?: string;
}

// ============================================================================
// Firewall
// ============================================================================

export interface FirewallZone {
  name: string;
  description?: string;
  defaultAction: 'accept' | 'drop' | 'reject';
  interfaces: string[];
  from: {
    [zoneName: string]: {
      firewall: {
        name?: string;
        ipv6Name?: string;
      };
    };
  };
}

export interface FirewallRuleset {
  name: string;
  description?: string;
  defaultAction: 'accept' | 'drop' | 'reject';
  enableDefaultLog?: boolean;
  rules: FirewallRule[];
}

export type FirewallProtocol = 'tcp' | 'udp' | 'icmp' | 'esp' | 'ah' | 'all';
export type FirewallAction = 'accept' | 'drop' | 'reject';

export interface FirewallRule {
  number: number;
  action: FirewallAction;
  description?: string;
  protocol?: FirewallProtocol;
  source?: FirewallAddress;
  destination?: FirewallAddress;
  state?: {
    established?: boolean;
    related?: boolean;
    new?: boolean;
    invalid?: boolean;
  };
  log?: boolean;
  disabled?: boolean;
}

export interface FirewallAddress {
  address?: string;
  port?: string;
  group?: {
    addressGroup?: string;
    networkGroup?: string;
    portGroup?: string;
  };
}

// ============================================================================
// NAT
// ============================================================================

export type NATType = 'source' | 'destination';

export interface NATRule {
  number: number;
  type: NATType;
  description?: string;
  disabled?: boolean;

  // Source NAT specific
  outboundInterface?: string;

  // Destination NAT specific
  inboundInterface?: string;

  // Common
  source?: {
    address?: string;
    port?: string;
  };
  destination?: {
    address?: string;
    port?: string;
  };
  translation?: {
    address?: string | 'masquerade';
    port?: string;
  };
  protocol?: FirewallProtocol;
}

// ============================================================================
// VPN - IPsec
// ============================================================================

export interface IPSecSite {
  name: string;
  authMode: 'pre-shared-secret' | 'x509';
  description?: string;

  // IKE Peer
  localAddress: string;
  remoteAddress: string;
  authentication: {
    mode: 'pre-shared-secret' | 'x509';
    preSharedSecret?: string;
    remoteId?: string;
    localId?: string;
  };

  // IKE Group
  ikeGroup: {
    name: string;
    proposal: {
      encryption: 'aes256' | 'aes128' | '3des';
      hash: 'sha256' | 'sha1' | 'md5';
      dhGroup: '2' | '5' | '14' | '15' | '16' | '19' | '20';
    }[];
    lifeTime?: number;
  };

  // ESP Group
  espGroup: {
    name: string;
    proposal: {
      encryption: 'aes256' | 'aes128' | '3des';
      hash: 'sha256' | 'sha1' | 'md5';
    }[];
    lifeTime?: number;
    pfs?: 'enable' | 'disable';
  };

  // Tunnels
  tunnels: IPSecTunnel[];
}

export interface IPSecTunnel {
  id: number;
  localSubnet: string;
  remoteSubnet: string;
  protocol?: 'esp' | 'ah';
}

// ============================================================================
// System Configuration
// ============================================================================

export interface SystemConfig {
  hostName?: string;
  domainName?: string;
  timeZone?: string;

  nameServer: string[];

  ntp: {
    servers: string[];
    allowClients?: string[];
  };

  login: {
    users: SystemUser[];
  };
}

export interface SystemUser {
  name: string;
  fullName?: string;
  authentication: {
    encryptedPassword?: string;
    plaintextPassword?: string;
    publicKeys?: string[];
  };
  level?: 'admin' | 'operator';
}

// ============================================================================
// VyOS Commands & Execution
// ============================================================================

export interface VyOSCommand {
  command: string;
  description?: string;
}

export interface VyOSCommandResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode?: number;
}

export interface VyOSCommandBatch {
  commands: VyOSCommand[];
  autoCommit: boolean;
  autoSave: boolean;
  rollbackOnError: boolean;
}

export interface VyOSConfigBackup {
  id: string;
  deviceId: string;
  deviceName: string;
  timestamp: Date;
  config: string;
  size: number;
  description?: string;
}

// ============================================================================
// Application State
// ============================================================================

export interface AppSettings {
  theme: 'light' | 'dark';
  autoConnect: boolean;
  confirmDestructiveActions: boolean;
  enableAuditLog: boolean;
  maxBackups: number;
  sshTimeout: number;
  commandTimeout: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  deviceId: string;
  deviceName: string;
  action: string;
  commands: string[];
  success: boolean;
  error?: string;
  userId?: string;
}

// ============================================================================
// IPC Messages (Electron)
// ============================================================================

export interface IPCRequest<T = any> {
  id: string;
  channel: string;
  data: T;
}

export interface IPCResponse<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: string;
}

// IPC Channel Names
export enum IPCChannel {
  // Device Management
  DEVICE_LIST = 'device:list',
  DEVICE_ADD = 'device:add',
  DEVICE_UPDATE = 'device:update',
  DEVICE_DELETE = 'device:delete',
  DEVICE_TEST = 'device:test',

  // SSH Operations
  SSH_CONNECT = 'ssh:connect',
  SSH_DISCONNECT = 'ssh:disconnect',
  SSH_EXECUTE = 'ssh:execute',

  // VyOS Operations
  VYOS_GET_CONFIG = 'vyos:getConfig',
  VYOS_GET_INTERFACES = 'vyos:getInterfaces',
  VYOS_GET_FIREWALL = 'vyos:getFirewall',
  VYOS_GET_NAT = 'vyos:getNat',
  VYOS_GET_VPN = 'vyos:getVpn',
  VYOS_GET_SYSTEM = 'vyos:getSystem',
  VYOS_EXECUTE_COMMANDS = 'vyos:executeCommands',
  VYOS_PREVIEW_COMMANDS = 'vyos:previewCommands',

  // Backup Operations
  BACKUP_CREATE = 'backup:create',
  BACKUP_LIST = 'backup:list',
  BACKUP_RESTORE = 'backup:restore',
  BACKUP_DELETE = 'backup:delete',

  // Settings
  SETTINGS_GET = 'settings:get',
  SETTINGS_UPDATE = 'settings:update',

  // Logs
  LOG_GET_AUDIT = 'log:getAudit',
  LOG_EXPORT = 'log:export',
}

// ============================================================================
// Validation & Errors
// ============================================================================

export class VyOSError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'VyOSError';
  }
}

export class SSHConnectionError extends VyOSError {
  constructor(message: string, details?: any) {
    super(message, 'SSH_CONNECTION_ERROR', details);
    this.name = 'SSHConnectionError';
  }
}

export class VyOSCommandError extends VyOSError {
  constructor(
    message: string,
    public command: string,
    public output: string
  ) {
    super(message, 'VYOS_COMMAND_ERROR', { command, output });
    this.name = 'VyOSCommandError';
  }
}

export class VyOSCommitError extends VyOSError {
  constructor(message: string, output: string) {
    super(message, 'VYOS_COMMIT_ERROR', { output });
    this.name = 'VyOSCommitError';
  }
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];
