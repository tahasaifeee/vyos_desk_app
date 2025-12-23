/**
 * Validation utilities for VyOS configuration
 */

import { VALIDATION, VYOS_FEATURES } from './constants';
import type {
  NetworkInterface,
  FirewallRule,
  NATRule,
  IPSecSite,
  StaticRoute,
  DeviceProfile,
} from './types';

// ============================================================================
// Network Validation
// ============================================================================

export function isValidIPv4(ip: string): boolean {
  return VALIDATION.IPV4_CIDR.test(ip);
}

export function isValidIPv6(ip: string): boolean {
  return VALIDATION.IPV6_CIDR.test(ip);
}

export function isValidIPAddress(ip: string): boolean {
  return isValidIPv4(ip) || isValidIPv6(ip);
}

export function isValidHostname(hostname: string): boolean {
  return VALIDATION.HOSTNAME.test(hostname);
}

export function isValidDomain(domain: string): boolean {
  return VALIDATION.DOMAIN.test(domain);
}

export function isValidPort(port: string | number): boolean {
  const portNum = typeof port === 'string' ? parseInt(port, 10) : port;
  return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
}

export function isValidPortRange(portRange: string): boolean {
  if (!VALIDATION.PORT.test(portRange)) {
    return false;
  }

  const parts = portRange.split('-');
  if (parts.length === 1) {
    return isValidPort(parts[0]);
  }

  const start = parseInt(parts[0], 10);
  const end = parseInt(parts[1], 10);
  return isValidPort(start) && isValidPort(end) && start < end;
}

export function isValidMACAddress(mac: string): boolean {
  return VALIDATION.MAC_ADDRESS.test(mac);
}

export function isValidVLANId(id: number | string): boolean {
  const vlanId = typeof id === 'string' ? parseInt(id, 10) : id;
  return !isNaN(vlanId) && vlanId >= 1 && vlanId <= 4094;
}

export function isValidInterfaceName(name: string): boolean {
  return VALIDATION.INTERFACE_NAME.test(name);
}

export function isValidMTU(mtu: number): boolean {
  return mtu >= 68 && mtu <= 9000;
}

// ============================================================================
// Device Validation
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateDeviceProfile(device: Partial<DeviceProfile>): ValidationResult {
  const errors: string[] = [];

  if (!device.name || device.name.trim().length === 0) {
    errors.push('Device name is required');
  }

  if (!device.host || device.host.trim().length === 0) {
    errors.push('Host address is required');
  } else if (!isValidIPAddress(device.host) && !isValidHostname(device.host)) {
    errors.push('Host must be a valid IP address or hostname');
  }

  if (device.port && !isValidPort(device.port)) {
    errors.push('Port must be between 1 and 65535');
  }

  if (!device.username || device.username.trim().length === 0) {
    errors.push('Username is required');
  }

  if (!device.authType || !['password', 'key'].includes(device.authType)) {
    errors.push('Authentication type must be either password or key');
  }

  if (device.authType === 'key' && (!device.keyPath || device.keyPath.trim().length === 0)) {
    errors.push('SSH key path is required for key-based authentication');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Interface Validation
// ============================================================================

export function validateNetworkInterface(iface: Partial<NetworkInterface>): ValidationResult {
  const errors: string[] = [];

  if (!iface.name || !isValidInterfaceName(iface.name)) {
    errors.push('Invalid interface name');
  }

  if (!iface.type || !VYOS_FEATURES.INTERFACES.includes(iface.type)) {
    errors.push(`Interface type must be one of: ${VYOS_FEATURES.INTERFACES.join(', ')}`);
  }

  if (iface.mtu && !isValidMTU(iface.mtu)) {
    errors.push('MTU must be between 68 and 9000');
  }

  if (iface.addresses) {
    iface.addresses.ipv4?.forEach((ip) => {
      if (!isValidIPv4(ip)) {
        errors.push(`Invalid IPv4 address: ${ip}`);
      }
    });

    iface.addresses.ipv6?.forEach((ip) => {
      if (!isValidIPv6(ip)) {
        errors.push(`Invalid IPv6 address: ${ip}`);
      }
    });
  }

  if (iface.type === 'vlan') {
    if (!iface.vlan) {
      errors.push('VLAN configuration is required for VLAN interfaces');
    } else {
      if (!isValidVLANId(iface.vlan.id)) {
        errors.push('VLAN ID must be between 1 and 4094');
      }
      if (!iface.vlan.parentInterface) {
        errors.push('Parent interface is required for VLAN');
      }
    }
  }

  if (iface.type === 'bond') {
    if (!iface.bond) {
      errors.push('Bond configuration is required for bond interfaces');
    } else {
      if (!VYOS_FEATURES.BOND_MODES.includes(iface.bond.mode)) {
        errors.push(`Bond mode must be one of: ${VYOS_FEATURES.BOND_MODES.join(', ')}`);
      }
      if (!iface.bond.members || iface.bond.members.length === 0) {
        errors.push('At least one member interface is required for bond');
      }
    }
  }

  if (iface.type === 'bridge') {
    if (!iface.bridge) {
      errors.push('Bridge configuration is required for bridge interfaces');
    } else if (!iface.bridge.members || iface.bridge.members.length === 0) {
      errors.push('At least one member interface is required for bridge');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Static Route Validation
// ============================================================================

export function validateStaticRoute(route: Partial<StaticRoute>): ValidationResult {
  const errors: string[] = [];

  if (!route.network) {
    errors.push('Network address is required');
  } else if (!isValidIPAddress(route.network)) {
    errors.push('Network must be a valid IP address with CIDR notation');
  }

  if (!route.nextHop && !route.interface) {
    errors.push('Either next-hop or interface must be specified');
  }

  if (route.nextHop && !isValidIPAddress(route.nextHop.split('/')[0])) {
    errors.push('Next-hop must be a valid IP address');
  }

  if (route.distance !== undefined) {
    const dist = route.distance;
    if (dist < 1 || dist > 255) {
      errors.push('Distance must be between 1 and 255');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Firewall Validation
// ============================================================================

export function validateFirewallRule(rule: Partial<FirewallRule>): ValidationResult {
  const errors: string[] = [];

  if (rule.number === undefined || rule.number < 1 || rule.number > 9999) {
    errors.push('Rule number must be between 1 and 9999');
  }

  if (!rule.action || !VYOS_FEATURES.FIREWALL_ACTIONS.includes(rule.action)) {
    errors.push(`Action must be one of: ${VYOS_FEATURES.FIREWALL_ACTIONS.join(', ')}`);
  }

  if (rule.protocol && !VYOS_FEATURES.FIREWALL_PROTOCOLS.includes(rule.protocol)) {
    errors.push(`Protocol must be one of: ${VYOS_FEATURES.FIREWALL_PROTOCOLS.join(', ')}`);
  }

  if (rule.source?.address && !isValidIPAddress(rule.source.address)) {
    errors.push('Source address must be a valid IP address or network');
  }

  if (rule.source?.port && !isValidPortRange(rule.source.port)) {
    errors.push('Source port must be a valid port or port range');
  }

  if (rule.destination?.address && !isValidIPAddress(rule.destination.address)) {
    errors.push('Destination address must be a valid IP address or network');
  }

  if (rule.destination?.port && !isValidPortRange(rule.destination.port)) {
    errors.push('Destination port must be a valid port or port range');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// NAT Validation
// ============================================================================

export function validateNATRule(rule: Partial<NATRule>): ValidationResult {
  const errors: string[] = [];

  if (rule.number === undefined || rule.number < 1 || rule.number > 9999) {
    errors.push('Rule number must be between 1 and 9999');
  }

  if (!rule.type || !VYOS_FEATURES.NAT_TYPES.includes(rule.type)) {
    errors.push(`NAT type must be one of: ${VYOS_FEATURES.NAT_TYPES.join(', ')}`);
  }

  if (rule.type === 'source' && !rule.outboundInterface) {
    errors.push('Outbound interface is required for source NAT');
  }

  if (rule.type === 'destination' && !rule.inboundInterface) {
    errors.push('Inbound interface is required for destination NAT');
  }

  if (rule.source?.address && !isValidIPAddress(rule.source.address)) {
    errors.push('Source address must be a valid IP address or network');
  }

  if (rule.destination?.address && !isValidIPAddress(rule.destination.address)) {
    errors.push('Destination address must be a valid IP address or network');
  }

  if (rule.translation?.address && rule.translation.address !== 'masquerade') {
    if (!isValidIPAddress(rule.translation.address)) {
      errors.push('Translation address must be a valid IP address or "masquerade"');
    }
  }

  if (rule.source?.port && !isValidPortRange(rule.source.port)) {
    errors.push('Source port must be a valid port or port range');
  }

  if (rule.destination?.port && !isValidPortRange(rule.destination.port)) {
    errors.push('Destination port must be a valid port or port range');
  }

  if (rule.translation?.port && !isValidPortRange(rule.translation.port)) {
    errors.push('Translation port must be a valid port or port range');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// VPN Validation
// ============================================================================

export function validateIPSecSite(site: Partial<IPSecSite>): ValidationResult {
  const errors: string[] = [];

  if (!site.name || site.name.trim().length === 0) {
    errors.push('Site name is required');
  }

  if (!site.localAddress || !isValidIPAddress(site.localAddress.split('/')[0])) {
    errors.push('Local address must be a valid IP address');
  }

  if (!site.remoteAddress || !isValidIPAddress(site.remoteAddress.split('/')[0])) {
    errors.push('Remote address must be a valid IP address');
  }

  if (!site.authentication) {
    errors.push('Authentication configuration is required');
  } else {
    if (site.authentication.mode === 'pre-shared-secret' && !site.authentication.preSharedSecret) {
      errors.push('Pre-shared secret is required');
    }
  }

  if (!site.tunnels || site.tunnels.length === 0) {
    errors.push('At least one tunnel is required');
  } else {
    site.tunnels.forEach((tunnel, index) => {
      if (!isValidIPAddress(tunnel.localSubnet)) {
        errors.push(`Tunnel ${index + 1}: Invalid local subnet`);
      }
      if (!isValidIPAddress(tunnel.remoteSubnet)) {
        errors.push(`Tunnel ${index + 1}: Invalid remote subnet`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

export function sanitizeConfigValue(value: string): string {
  // Escape single quotes and wrap in quotes if needed
  if (value.includes(' ') || value.includes("'")) {
    return `'${value.replace(/'/g, "\\'")}'`;
  }
  return value;
}

export function parseIPAddress(address: string): { ip: string; cidr?: number } {
  const parts = address.split('/');
  return {
    ip: parts[0],
    cidr: parts[1] ? parseInt(parts[1], 10) : undefined,
  };
}

export function formatIPAddress(ip: string, cidr?: number): string {
  return cidr !== undefined ? `${ip}/${cidr}` : ip;
}
