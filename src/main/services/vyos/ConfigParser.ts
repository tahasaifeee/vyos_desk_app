/**
 * Config Parser - Parses VyOS configuration into structured objects
 */

import {
  NetworkInterface,
  FirewallZone,
  FirewallRuleset,
  FirewallRule,
  NATRule,
  IPSecSite,
  StaticRoute,
  SystemConfig,
  InterfaceType,
} from '@shared/types';
import log from 'electron-log';

export class ConfigParser {
  /**
   * Parse raw configuration commands into a tree structure
   */
  parse(configText: string): any {
    const tree: any = {};
    const lines = configText.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('set ')) {
        continue;
      }

      // Remove 'set ' prefix
      const path = trimmed.substring(4);
      this.addToTree(tree, path);
    }

    return tree;
  }

  /**
   * Add a configuration path to the tree
   */
  private addToTree(tree: any, path: string): void {
    // Parse the path, handling quoted values
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < path.length; i++) {
      const char = path[i];

      if (char === "'" || char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ' ' && !inQuotes) {
        if (current.length > 0) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current.length > 0) {
      parts.push(current);
    }

    // Build the tree
    let node = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!node[part]) {
        node[part] = {};
      }
      node = node[part];
    }

    // Set the final value
    const lastPart = parts[parts.length - 1];
    if (typeof node === 'object') {
      node[lastPart] = true;
    }
  }

  // ============================================================================
  // Interface Parsing
  // ============================================================================

  parseInterfaces(config: any): NetworkInterface[] {
    const interfaces: NetworkInterface[] = [];

    if (!config.interfaces) {
      return interfaces;
    }

    // Parse each interface type
    Object.entries(config.interfaces).forEach(([type, ifaces]: [string, any]) => {
      if (typeof ifaces !== 'object') return;

      Object.entries(ifaces).forEach(([name, ifaceConfig]: [string, any]) => {
        try {
          const iface = this.parseInterface(name, type as InterfaceType, ifaceConfig);
          interfaces.push(iface);
        } catch (error) {
          log.error(`Failed to parse interface ${type} ${name}:`, error);
        }
      });
    });

    return interfaces;
  }

  private parseInterface(name: string, type: InterfaceType, config: any): NetworkInterface {
    const iface: NetworkInterface = {
      name,
      type,
      enabled: !config.disable,
      addresses: {
        ipv4: [],
        ipv6: [],
        dhcp: false,
        dhcpv6: false,
      },
    };

    // Description
    if (config.description) {
      iface.description = Object.keys(config.description)[0] || '';
    }

    // MTU
    if (config.mtu) {
      iface.mtu = parseInt(Object.keys(config.mtu)[0], 10);
    }

    // MAC
    if (config.mac) {
      iface.mac = Object.keys(config.mac)[0];
    }

    // Addresses
    if (config.address) {
      Object.keys(config.address).forEach((addr) => {
        if (addr === 'dhcp') {
          iface.addresses.dhcp = true;
        } else if (addr === 'dhcpv6') {
          iface.addresses.dhcpv6 = true;
        } else if (addr.includes(':')) {
          iface.addresses.ipv6.push(addr);
        } else {
          iface.addresses.ipv4.push(addr);
        }
      });
    }

    // VLAN specific
    if (type === 'vlan' && config.vlan) {
      iface.vlan = {
        id: parseInt(Object.keys(config.vlan.id || {})[0], 10),
        parentInterface: name.split('.')[0], // Extract from interface name
      };
    }

    // Bond specific
    if (type === 'bond') {
      iface.bond = {
        mode: Object.keys(config.mode || {})[0] as any || '802.3ad',
        members: [],
      };

      if (config.member?.interface) {
        iface.bond.members = Object.keys(config.member.interface);
      }

      if (config.primary) {
        iface.bond.primaryInterface = Object.keys(config.primary)[0];
      }

      if (config['hash-policy']) {
        iface.bond.hashPolicy = Object.keys(config['hash-policy'])[0] as any;
      }
    }

    // Bridge specific
    if (type === 'bridge') {
      iface.bridge = {
        members: [],
        stp: !!config.stp,
      };

      if (config.member?.interface) {
        iface.bridge.members = Object.keys(config.member.interface);
      }

      if (config.aging) {
        iface.bridge.aging = parseInt(Object.keys(config.aging)[0], 10);
      }

      if (config['max-age']) {
        iface.bridge.maxAge = parseInt(Object.keys(config['max-age'])[0], 10);
      }
    }

    return iface;
  }

  // ============================================================================
  // Static Routes Parsing
  // ============================================================================

  parseStaticRoutes(config: any): StaticRoute[] {
    const routes: StaticRoute[] = [];

    if (!config.protocols?.static?.route) {
      return routes;
    }

    Object.entries(config.protocols.static.route).forEach(([network, routeConfig]: [string, any]) => {
      try {
        const route: StaticRoute = { network };

        if (routeConfig.description) {
          route.description = Object.keys(routeConfig.description)[0];
        }

        // Next-hop
        if (routeConfig['next-hop']) {
          const nextHops = Object.keys(routeConfig['next-hop']);
          if (nextHops.length > 0) {
            route.nextHop = nextHops[0];

            const hopConfig = routeConfig['next-hop'][nextHops[0]];
            if (hopConfig?.distance) {
              route.distance = parseInt(Object.keys(hopConfig.distance)[0], 10);
            }
          }
        }

        // Interface
        if (routeConfig.interface) {
          const interfaces = Object.keys(routeConfig.interface);
          if (interfaces.length > 0) {
            route.interface = interfaces[0];

            const ifConfig = routeConfig.interface[interfaces[0]];
            if (ifConfig?.distance) {
              route.distance = parseInt(Object.keys(ifConfig.distance)[0], 10);
            }
          }
        }

        routes.push(route);
      } catch (error) {
        log.error(`Failed to parse route ${network}:`, error);
      }
    });

    return routes;
  }

  // ============================================================================
  // Firewall Parsing
  // ============================================================================

  parseFirewallZones(config: any): FirewallZone[] {
    const zones: FirewallZone[] = [];

    if (!config['zone-policy']?.zone) {
      return zones;
    }

    Object.entries(config['zone-policy'].zone).forEach(([name, zoneConfig]: [string, any]) => {
      try {
        const zone: FirewallZone = {
          name,
          defaultAction: Object.keys(zoneConfig['default-action'] || {})[0] as any || 'drop',
          interfaces: Object.keys(zoneConfig.interface || {}),
          from: {},
        };

        if (zoneConfig.description) {
          zone.description = Object.keys(zoneConfig.description)[0];
        }

        // From zones
        if (zoneConfig.from) {
          Object.entries(zoneConfig.from).forEach(([fromZone, fromConfig]: [string, any]) => {
            zone.from[fromZone] = {
              firewall: {
                name: Object.keys(fromConfig.firewall?.name || {})[0],
                ipv6Name: Object.keys(fromConfig.firewall?.['ipv6-name'] || {})[0],
              },
            };
          });
        }

        zones.push(zone);
      } catch (error) {
        log.error(`Failed to parse zone ${name}:`, error);
      }
    });

    return zones;
  }

  parseFirewallRulesets(config: any): FirewallRuleset[] {
    const rulesets: FirewallRuleset[] = [];

    if (!config.firewall?.name) {
      return rulesets;
    }

    Object.entries(config.firewall.name).forEach(([name, rulesetConfig]: [string, any]) => {
      try {
        const ruleset: FirewallRuleset = {
          name,
          defaultAction: Object.keys(rulesetConfig['default-action'] || {})[0] as any || 'drop',
          enableDefaultLog: !!rulesetConfig['enable-default-log'],
          rules: [],
        };

        if (rulesetConfig.description) {
          ruleset.description = Object.keys(rulesetConfig.description)[0];
        }

        // Parse rules
        if (rulesetConfig.rule) {
          Object.entries(rulesetConfig.rule).forEach(([number, ruleConfig]: [string, any]) => {
            try {
              const rule = this.parseFirewallRule(parseInt(number, 10), ruleConfig);
              ruleset.rules.push(rule);
            } catch (error) {
              log.error(`Failed to parse rule ${number}:`, error);
            }
          });
        }

        rulesets.push(ruleset);
      } catch (error) {
        log.error(`Failed to parse ruleset ${name}:`, error);
      }
    });

    return rulesets;
  }

  private parseFirewallRule(number: number, config: any): FirewallRule {
    const rule: FirewallRule = {
      number,
      action: Object.keys(config.action || {})[0] as any || 'drop',
    };

    if (config.description) {
      rule.description = Object.keys(config.description)[0];
    }

    if (config.protocol) {
      rule.protocol = Object.keys(config.protocol)[0] as any;
    }

    if (config.source) {
      rule.source = {};
      if (config.source.address) {
        rule.source.address = Object.keys(config.source.address)[0];
      }
      if (config.source.port) {
        rule.source.port = Object.keys(config.source.port)[0];
      }
    }

    if (config.destination) {
      rule.destination = {};
      if (config.destination.address) {
        rule.destination.address = Object.keys(config.destination.address)[0];
      }
      if (config.destination.port) {
        rule.destination.port = Object.keys(config.destination.port)[0];
      }
    }

    if (config.state) {
      rule.state = {
        established: !!config.state.established,
        related: !!config.state.related,
        new: !!config.state.new,
        invalid: !!config.state.invalid,
      };
    }

    rule.log = !!config.log;
    rule.disabled = !!config.disable;

    return rule;
  }

  // ============================================================================
  // NAT Parsing
  // ============================================================================

  parseNATRules(config: any): { source: NATRule[]; destination: NATRule[] } {
    const result = {
      source: [] as NATRule[],
      destination: [] as NATRule[],
    };

    if (!config.nat) {
      return result;
    }

    // Source NAT
    if (config.nat.source?.rule) {
      Object.entries(config.nat.source.rule).forEach(([number, ruleConfig]: [string, any]) => {
        try {
          const rule = this.parseNATRule('source', parseInt(number, 10), ruleConfig);
          result.source.push(rule);
        } catch (error) {
          log.error(`Failed to parse source NAT rule ${number}:`, error);
        }
      });
    }

    // Destination NAT
    if (config.nat.destination?.rule) {
      Object.entries(config.nat.destination.rule).forEach(([number, ruleConfig]: [string, any]) => {
        try {
          const rule = this.parseNATRule('destination', parseInt(number, 10), ruleConfig);
          result.destination.push(rule);
        } catch (error) {
          log.error(`Failed to parse destination NAT rule ${number}:`, error);
        }
      });
    }

    return result;
  }

  private parseNATRule(type: 'source' | 'destination', number: number, config: any): NATRule {
    const rule: NATRule = {
      number,
      type,
    };

    if (config.description) {
      rule.description = Object.keys(config.description)[0];
    }

    if (config['outbound-interface']) {
      rule.outboundInterface = Object.keys(config['outbound-interface'])[0];
    }

    if (config['inbound-interface']) {
      rule.inboundInterface = Object.keys(config['inbound-interface'])[0];
    }

    if (config.protocol) {
      rule.protocol = Object.keys(config.protocol)[0] as any;
    }

    if (config.source) {
      rule.source = {};
      if (config.source.address) {
        rule.source.address = Object.keys(config.source.address)[0];
      }
      if (config.source.port) {
        rule.source.port = Object.keys(config.source.port)[0];
      }
    }

    if (config.destination) {
      rule.destination = {};
      if (config.destination.address) {
        rule.destination.address = Object.keys(config.destination.address)[0];
      }
      if (config.destination.port) {
        rule.destination.port = Object.keys(config.destination.port)[0];
      }
    }

    if (config.translation) {
      rule.translation = {};
      if (config.translation.address) {
        rule.translation.address = Object.keys(config.translation.address)[0];
      }
      if (config.translation.port) {
        rule.translation.port = Object.keys(config.translation.port)[0];
      }
    }

    rule.disabled = !!config.disable;

    return rule;
  }

  // ============================================================================
  // IPsec Parsing
  // ============================================================================

  parseIPSecSites(config: any): IPSecSite[] {
    const sites: IPSecSite[] = [];

    // This is a simplified parser - full IPsec config is complex
    if (!config.vpn?.ipsec?.['site-to-site']?.peer) {
      return sites;
    }

    Object.entries(config.vpn.ipsec['site-to-site'].peer).forEach(([remoteAddr, peerConfig]: [string, any]) => {
      try {
        // Parse basic site configuration
        // In a production system, this would be more comprehensive
        log.warn('IPsec parsing is simplified - implement full parser for production');
      } catch (error) {
        log.error(`Failed to parse IPsec site ${remoteAddr}:`, error);
      }
    });

    return sites;
  }

  // ============================================================================
  // System Config Parsing
  // ============================================================================

  parseSystemConfig(config: any): SystemConfig {
    const system: SystemConfig = {
      nameServer: [],
      ntp: {
        servers: [],
      },
      login: {
        users: [],
      },
    };

    if (!config.system) {
      return system;
    }

    const sysConfig = config.system;

    // Hostname
    if (sysConfig['host-name']) {
      system.hostName = Object.keys(sysConfig['host-name'])[0];
    }

    // Domain name
    if (sysConfig['domain-name']) {
      system.domainName = Object.keys(sysConfig['domain-name'])[0];
    }

    // Time zone
    if (sysConfig['time-zone']) {
      system.timeZone = Object.keys(sysConfig['time-zone'])[0];
    }

    // Name servers
    if (sysConfig['name-server']) {
      system.nameServer = Object.keys(sysConfig['name-server']);
    }

    // NTP
    if (sysConfig.ntp?.server) {
      system.ntp.servers = Object.keys(sysConfig.ntp.server);
    }

    // Users
    if (sysConfig.login?.user) {
      Object.entries(sysConfig.login.user).forEach(([username, userConfig]: [string, any]) => {
        system.login.users.push({
          name: username,
          authentication: {},
        });
      });
    }

    return system;
  }
}
