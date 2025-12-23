/**
 * VyOS Client - High-level interface for VyOS operations
 */

import { SSHClient, SSHConnectionOptions } from '../ssh/SSHClient';
import { CommandBuilder } from './CommandBuilder';
import { ConfigParser } from './ConfigParser';
import { CommandExecutor } from './CommandExecutor';
import {
  VyOSCommandResult,
  NetworkInterface,
  FirewallZone,
  FirewallRuleset,
  NATRule,
  IPSecSite,
  StaticRoute,
  SystemConfig,
  ConnectionTestResult,
} from '@shared/types';
import { VYOS_COMMANDS } from '@shared/constants';
import log from 'electron-log';

export class VyOSClient {
  private sshClient: SSHClient;
  private commandBuilder: CommandBuilder;
  private configParser: ConfigParser;
  private commandExecutor: CommandExecutor;
  private connected: boolean = false;

  constructor(connectionOptions: SSHConnectionOptions) {
    this.sshClient = new SSHClient(connectionOptions);
    this.commandBuilder = new CommandBuilder();
    this.configParser = new ConfigParser();
    this.commandExecutor = new CommandExecutor(this.sshClient);
  }

  /**
   * Connect to VyOS device
   */
  async connect(): Promise<void> {
    await this.sshClient.connect();
    this.connected = true;
    log.info('Connected to VyOS device');
  }

  /**
   * Disconnect from VyOS device
   */
  disconnect(): void {
    this.sshClient.disconnect();
    this.connected = false;
    log.info('Disconnected from VyOS device');
  }

  /**
   * Test connection and get device info
   */
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const testResult = await this.sshClient.testConnection();

      if (!testResult.success) {
        return {
          success: false,
          error: testResult.error,
          latency: testResult.latency,
        };
      }

      // Get VyOS version and hostname
      const versionResult = await this.sshClient.exec(VYOS_COMMANDS.SHOW_VERSION);
      const version = this.parseVyOSVersion(versionResult.output);

      const hostnameResult = await this.sshClient.exec('hostname');
      const hostname = hostnameResult.output.trim();

      return {
        success: true,
        vyosVersion: version,
        hostname,
        latency: testResult.latency,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get full VyOS configuration
   */
  async getConfiguration(): Promise<string> {
    const result = await this.sshClient.exec(VYOS_COMMANDS.SHOW_CONFIG_COMMANDS);
    return result.output;
  }

  /**
   * Get parsed configuration tree
   */
  async getParsedConfiguration(): Promise<any> {
    const configText = await this.getConfiguration();
    return this.configParser.parse(configText);
  }

  // ============================================================================
  // Interface Operations
  // ============================================================================

  /**
   * Get all network interfaces
   */
  async getInterfaces(): Promise<NetworkInterface[]> {
    const config = await this.getParsedConfiguration();
    return this.configParser.parseInterfaces(config);
  }

  /**
   * Get specific interface
   */
  async getInterface(name: string): Promise<NetworkInterface | null> {
    const interfaces = await this.getInterfaces();
    return interfaces.find((iface) => iface.name === name) || null;
  }

  /**
   * Set interface configuration
   */
  async setInterface(iface: NetworkInterface): Promise<void> {
    const commands = this.commandBuilder.buildInterfaceCommands(iface);
    await this.commandExecutor.executeWithRollback(commands);
  }

  /**
   * Delete interface
   */
  async deleteInterface(name: string, type: string): Promise<void> {
    const commands = [`delete interfaces ${type} ${name}`];
    await this.commandExecutor.executeWithRollback(commands);
  }

  // ============================================================================
  // Static Route Operations
  // ============================================================================

  /**
   * Get all static routes
   */
  async getStaticRoutes(): Promise<StaticRoute[]> {
    const config = await this.getParsedConfiguration();
    return this.configParser.parseStaticRoutes(config);
  }

  /**
   * Set static route
   */
  async setStaticRoute(route: StaticRoute): Promise<void> {
    const commands = this.commandBuilder.buildStaticRouteCommands(route);
    await this.commandExecutor.executeWithRollback(commands);
  }

  /**
   * Delete static route
   */
  async deleteStaticRoute(network: string): Promise<void> {
    const commands = [`delete protocols static route ${network}`];
    await this.commandExecutor.executeWithRollback(commands);
  }

  // ============================================================================
  // Firewall Operations
  // ============================================================================

  /**
   * Get firewall zones
   */
  async getFirewallZones(): Promise<FirewallZone[]> {
    const config = await this.getParsedConfiguration();
    return this.configParser.parseFirewallZones(config);
  }

  /**
   * Get firewall rulesets
   */
  async getFirewallRulesets(): Promise<FirewallRuleset[]> {
    const config = await this.getParsedConfiguration();
    return this.configParser.parseFirewallRulesets(config);
  }

  /**
   * Set firewall zone
   */
  async setFirewallZone(zone: FirewallZone): Promise<void> {
    const commands = this.commandBuilder.buildFirewallZoneCommands(zone);
    await this.commandExecutor.executeWithRollback(commands);
  }

  /**
   * Set firewall ruleset
   */
  async setFirewallRuleset(ruleset: FirewallRuleset): Promise<void> {
    const commands = this.commandBuilder.buildFirewallRulesetCommands(ruleset);
    await this.commandExecutor.executeWithRollback(commands);
  }

  // ============================================================================
  // NAT Operations
  // ============================================================================

  /**
   * Get NAT rules
   */
  async getNATRules(): Promise<{ source: NATRule[]; destination: NATRule[] }> {
    const config = await this.getParsedConfiguration();
    return this.configParser.parseNATRules(config);
  }

  /**
   * Set NAT rule
   */
  async setNATRule(rule: NATRule): Promise<void> {
    const commands = this.commandBuilder.buildNATRuleCommands(rule);
    await this.commandExecutor.executeWithRollback(commands);
  }

  /**
   * Delete NAT rule
   */
  async deleteNATRule(type: 'source' | 'destination', ruleNumber: number): Promise<void> {
    const commands = [`delete nat ${type} rule ${ruleNumber}`];
    await this.commandExecutor.executeWithRollback(commands);
  }

  // ============================================================================
  // VPN Operations
  // ============================================================================

  /**
   * Get IPsec sites
   */
  async getIPSecSites(): Promise<IPSecSite[]> {
    const config = await this.getParsedConfiguration();
    return this.configParser.parseIPSecSites(config);
  }

  /**
   * Set IPsec site
   */
  async setIPSecSite(site: IPSecSite): Promise<void> {
    const commands = this.commandBuilder.buildIPSecCommands(site);
    await this.commandExecutor.executeWithRollback(commands);
  }

  /**
   * Delete IPsec site
   */
  async deleteIPSecSite(name: string): Promise<void> {
    const commands = [`delete vpn ipsec site-to-site peer ${name}`];
    await this.commandExecutor.executeWithRollback(commands);
  }

  // ============================================================================
  // System Operations
  // ============================================================================

  /**
   * Get system configuration
   */
  async getSystemConfig(): Promise<SystemConfig> {
    const config = await this.getParsedConfiguration();
    return this.configParser.parseSystemConfig(config);
  }

  /**
   * Set system configuration
   */
  async setSystemConfig(system: Partial<SystemConfig>): Promise<void> {
    const commands = this.commandBuilder.buildSystemCommands(system);
    await this.commandExecutor.executeWithRollback(commands);
  }

  // ============================================================================
  // Command Operations
  // ============================================================================

  /**
   * Preview commands without executing
   */
  previewCommands(type: string, data: any): string[] {
    switch (type) {
      case 'interface':
        return this.commandBuilder.buildInterfaceCommands(data);
      case 'route':
        return this.commandBuilder.buildStaticRouteCommands(data);
      case 'firewall-zone':
        return this.commandBuilder.buildFirewallZoneCommands(data);
      case 'firewall-ruleset':
        return this.commandBuilder.buildFirewallRulesetCommands(data);
      case 'nat':
        return this.commandBuilder.buildNATRuleCommands(data);
      case 'ipsec':
        return this.commandBuilder.buildIPSecCommands(data);
      case 'system':
        return this.commandBuilder.buildSystemCommands(data);
      default:
        throw new Error(`Unknown command type: ${type}`);
    }
  }

  /**
   * Execute custom commands
   */
  async executeCommands(
    commands: string[],
    options?: {
      autoCommit?: boolean;
      autoSave?: boolean;
      rollbackOnError?: boolean;
    }
  ): Promise<void> {
    const opts = {
      autoCommit: true,
      autoSave: true,
      rollbackOnError: true,
      ...options,
    };

    if (opts.rollbackOnError) {
      await this.commandExecutor.executeWithRollback(commands, {
        commit: opts.autoCommit,
        save: opts.autoSave,
      });
    } else {
      for (const cmd of commands) {
        await this.sshClient.exec(cmd);
      }
    }
  }

  /**
   * Commit configuration
   */
  async commit(): Promise<void> {
    await this.commandExecutor.commit();
  }

  /**
   * Save configuration
   */
  async save(): Promise<void> {
    await this.commandExecutor.save();
  }

  /**
   * Rollback configuration
   */
  async rollback(revision: number = 0): Promise<void> {
    await this.commandExecutor.rollback(revision);
  }

  /**
   * Compare configuration
   */
  async compare(): Promise<string> {
    const result = await this.sshClient.exec(VYOS_COMMANDS.COMPARE);
    return result.output;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Parse VyOS version from show version output
   */
  private parseVyOSVersion(output: string): string {
    const match = output.match(/Version:\s+VyOS\s+([\d.]+)/i);
    return match ? match[1] : 'Unknown';
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.sshClient.isConnected();
  }

  /**
   * Get SSH client for advanced operations
   */
  getSSHClient(): SSHClient {
    return this.sshClient;
  }
}
