/**
 * Command Builder - Generates VyOS CLI commands from configuration objects
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
  SystemUser,
} from '@shared/types';
import { sanitizeConfigValue } from '@shared/validators';

export class CommandBuilder {
  // ============================================================================
  // Interface Commands
  // ============================================================================

  buildInterfaceCommands(iface: NetworkInterface): string[] {
    const commands: string[] = [];
    const { name, type } = iface;
    const basePath = `interfaces ${type} ${name}`;

    // Description
    if (iface.description) {
      commands.push(`set ${basePath} description ${sanitizeConfigValue(iface.description)}`);
    }

    // MTU
    if (iface.mtu) {
      commands.push(`set ${basePath} mtu ${iface.mtu}`);
    }

    // MAC address
    if (iface.mac) {
      commands.push(`set ${basePath} mac ${iface.mac}`);
    }

    // IPv4 addresses
    if (iface.addresses.ipv4) {
      iface.addresses.ipv4.forEach((addr) => {
        commands.push(`set ${basePath} address ${sanitizeConfigValue(addr)}`);
      });
    }

    // IPv6 addresses
    if (iface.addresses.ipv6) {
      iface.addresses.ipv6.forEach((addr) => {
        commands.push(`set ${basePath} address ${sanitizeConfigValue(addr)}`);
      });
    }

    // DHCP
    if (iface.addresses.dhcp) {
      commands.push(`set ${basePath} address dhcp`);
    }

    // DHCPv6
    if (iface.addresses.dhcpv6) {
      commands.push(`set ${basePath} address dhcpv6`);
    }

    // VLAN specific
    if (type === 'vlan' && iface.vlan) {
      commands.push(`set ${basePath} vlan id ${iface.vlan.id}`);
      // Note: VyOS 1.5 uses interface naming like eth0.100 for VLAN 100 on eth0
    }

    // Bond specific
    if (type === 'bond' && iface.bond) {
      commands.push(`set ${basePath} mode ${iface.bond.mode}`);

      iface.bond.members.forEach((member) => {
        commands.push(`set ${basePath} member interface ${member}`);
      });

      if (iface.bond.primaryInterface) {
        commands.push(`set ${basePath} primary ${iface.bond.primaryInterface}`);
      }

      if (iface.bond.hashPolicy) {
        commands.push(`set ${basePath} hash-policy ${iface.bond.hashPolicy}`);
      }
    }

    // Bridge specific
    if (type === 'bridge' && iface.bridge) {
      iface.bridge.members.forEach((member) => {
        commands.push(`set ${basePath} member interface ${member}`);
      });

      if (iface.bridge.stp) {
        commands.push(`set ${basePath} stp`);
      }

      if (iface.bridge.aging) {
        commands.push(`set ${basePath} aging ${iface.bridge.aging}`);
      }

      if (iface.bridge.maxAge) {
        commands.push(`set ${basePath} max-age ${iface.bridge.maxAge}`);
      }
    }

    // Enable/disable
    if (iface.enabled) {
      commands.push(`delete ${basePath} disable`);
    } else {
      commands.push(`set ${basePath} disable`);
    }

    return commands;
  }

  // ============================================================================
  // Static Route Commands
  // ============================================================================

  buildStaticRouteCommands(route: StaticRoute): string[] {
    const commands: string[] = [];
    const basePath = `protocols static route ${route.network}`;

    if (route.nextHop) {
      const hopPath = `${basePath} next-hop ${route.nextHop}`;
      commands.push(`set ${hopPath}`);

      if (route.distance) {
        commands.push(`set ${hopPath} distance ${route.distance}`);
      }
    } else if (route.interface) {
      const ifPath = `${basePath} interface ${route.interface}`;
      commands.push(`set ${ifPath}`);

      if (route.distance) {
        commands.push(`set ${ifPath} distance ${route.distance}`);
      }
    }

    if (route.description) {
      commands.push(`set ${basePath} description ${sanitizeConfigValue(route.description)}`);
    }

    return commands;
  }

  // ============================================================================
  // Firewall Zone Commands
  // ============================================================================

  buildFirewallZoneCommands(zone: FirewallZone): string[] {
    const commands: string[] = [];
    const basePath = `zone-policy zone ${zone.name}`;

    // Description
    if (zone.description) {
      commands.push(`set ${basePath} description ${sanitizeConfigValue(zone.description)}`);
    }

    // Default action
    commands.push(`set ${basePath} default-action ${zone.defaultAction}`);

    // Interfaces
    zone.interfaces.forEach((iface) => {
      commands.push(`set ${basePath} interface ${iface}`);
    });

    // From zones
    Object.entries(zone.from).forEach(([fromZone, config]) => {
      const fromPath = `${basePath} from ${fromZone}`;

      if (config.firewall.name) {
        commands.push(`set ${fromPath} firewall name ${config.firewall.name}`);
      }

      if (config.firewall.ipv6Name) {
        commands.push(`set ${fromPath} firewall ipv6-name ${config.firewall.ipv6Name}`);
      }
    });

    return commands;
  }

  // ============================================================================
  // Firewall Ruleset Commands
  // ============================================================================

  buildFirewallRulesetCommands(ruleset: FirewallRuleset): string[] {
    const commands: string[] = [];
    const basePath = `firewall name ${ruleset.name}`;

    // Description
    if (ruleset.description) {
      commands.push(`set ${basePath} description ${sanitizeConfigValue(ruleset.description)}`);
    }

    // Default action
    commands.push(`set ${basePath} default-action ${ruleset.defaultAction}`);

    // Enable default log
    if (ruleset.enableDefaultLog) {
      commands.push(`set ${basePath} enable-default-log`);
    }

    // Rules
    ruleset.rules.forEach((rule) => {
      commands.push(...this.buildFirewallRuleCommands(ruleset.name, rule));
    });

    return commands;
  }

  buildFirewallRuleCommands(rulesetName: string, rule: FirewallRule): string[] {
    const commands: string[] = [];
    const basePath = `firewall name ${rulesetName} rule ${rule.number}`;

    // Action
    commands.push(`set ${basePath} action ${rule.action}`);

    // Description
    if (rule.description) {
      commands.push(`set ${basePath} description ${sanitizeConfigValue(rule.description)}`);
    }

    // Protocol
    if (rule.protocol) {
      commands.push(`set ${basePath} protocol ${rule.protocol}`);
    }

    // Source
    if (rule.source) {
      if (rule.source.address) {
        commands.push(`set ${basePath} source address ${rule.source.address}`);
      }
      if (rule.source.port) {
        commands.push(`set ${basePath} source port ${rule.source.port}`);
      }
      if (rule.source.group?.addressGroup) {
        commands.push(`set ${basePath} source group address-group ${rule.source.group.addressGroup}`);
      }
      if (rule.source.group?.networkGroup) {
        commands.push(`set ${basePath} source group network-group ${rule.source.group.networkGroup}`);
      }
    }

    // Destination
    if (rule.destination) {
      if (rule.destination.address) {
        commands.push(`set ${basePath} destination address ${rule.destination.address}`);
      }
      if (rule.destination.port) {
        commands.push(`set ${basePath} destination port ${rule.destination.port}`);
      }
      if (rule.destination.group?.addressGroup) {
        commands.push(`set ${basePath} destination group address-group ${rule.destination.group.addressGroup}`);
      }
      if (rule.destination.group?.portGroup) {
        commands.push(`set ${basePath} destination group port-group ${rule.destination.group.portGroup}`);
      }
    }

    // State
    if (rule.state) {
      if (rule.state.established) {
        commands.push(`set ${basePath} state established enable`);
      }
      if (rule.state.related) {
        commands.push(`set ${basePath} state related enable`);
      }
      if (rule.state.new) {
        commands.push(`set ${basePath} state new enable`);
      }
      if (rule.state.invalid) {
        commands.push(`set ${basePath} state invalid enable`);
      }
    }

    // Log
    if (rule.log) {
      commands.push(`set ${basePath} log enable`);
    }

    // Disabled
    if (rule.disabled) {
      commands.push(`set ${basePath} disable`);
    }

    return commands;
  }

  // ============================================================================
  // NAT Commands
  // ============================================================================

  buildNATRuleCommands(rule: NATRule): string[] {
    const commands: string[] = [];
    const basePath = `nat ${rule.type} rule ${rule.number}`;

    // Description
    if (rule.description) {
      commands.push(`set ${basePath} description ${sanitizeConfigValue(rule.description)}`);
    }

    // Outbound/Inbound interface
    if (rule.type === 'source' && rule.outboundInterface) {
      commands.push(`set ${basePath} outbound-interface ${rule.outboundInterface}`);
    }
    if (rule.type === 'destination' && rule.inboundInterface) {
      commands.push(`set ${basePath} inbound-interface ${rule.inboundInterface}`);
    }

    // Protocol
    if (rule.protocol) {
      commands.push(`set ${basePath} protocol ${rule.protocol}`);
    }

    // Source
    if (rule.source) {
      if (rule.source.address) {
        commands.push(`set ${basePath} source address ${rule.source.address}`);
      }
      if (rule.source.port) {
        commands.push(`set ${basePath} source port ${rule.source.port}`);
      }
    }

    // Destination
    if (rule.destination) {
      if (rule.destination.address) {
        commands.push(`set ${basePath} destination address ${rule.destination.address}`);
      }
      if (rule.destination.port) {
        commands.push(`set ${basePath} destination port ${rule.destination.port}`);
      }
    }

    // Translation
    if (rule.translation) {
      if (rule.translation.address) {
        commands.push(`set ${basePath} translation address ${rule.translation.address}`);
      }
      if (rule.translation.port) {
        commands.push(`set ${basePath} translation port ${rule.translation.port}`);
      }
    }

    // Disabled
    if (rule.disabled) {
      commands.push(`set ${basePath} disable`);
    }

    return commands;
  }

  // ============================================================================
  // IPsec VPN Commands
  // ============================================================================

  buildIPSecCommands(site: IPSecSite): string[] {
    const commands: string[] = [];

    // IKE Group
    const ikeGroupName = site.ikeGroup.name;
    const ikeBasePath = `vpn ipsec ike-group ${ikeGroupName}`;

    site.ikeGroup.proposal.forEach((proposal, index) => {
      const propPath = `${ikeBasePath} proposal ${index + 1}`;
      commands.push(`set ${propPath} encryption ${proposal.encryption}`);
      commands.push(`set ${propPath} hash ${proposal.hash}`);
      commands.push(`set ${propPath} dh-group ${proposal.dhGroup}`);
    });

    if (site.ikeGroup.lifeTime) {
      commands.push(`set ${ikeBasePath} lifetime ${site.ikeGroup.lifeTime}`);
    }

    // ESP Group
    const espGroupName = site.espGroup.name;
    const espBasePath = `vpn ipsec esp-group ${espGroupName}`;

    site.espGroup.proposal.forEach((proposal, index) => {
      const propPath = `${espBasePath} proposal ${index + 1}`;
      commands.push(`set ${propPath} encryption ${proposal.encryption}`);
      commands.push(`set ${propPath} hash ${proposal.hash}`);
    });

    if (site.espGroup.lifeTime) {
      commands.push(`set ${espBasePath} lifetime ${site.espGroup.lifeTime}`);
    }

    if (site.espGroup.pfs) {
      commands.push(`set ${espBasePath} pfs ${site.espGroup.pfs}`);
    }

    // Site-to-Site Peer
    const peerPath = `vpn ipsec site-to-site peer ${site.remoteAddress}`;

    commands.push(`set ${peerPath} authentication mode ${site.authentication.mode}`);

    if (site.authentication.mode === 'pre-shared-secret' && site.authentication.preSharedSecret) {
      commands.push(`set ${peerPath} authentication pre-shared-secret ${sanitizeConfigValue(site.authentication.preSharedSecret)}`);
    }

    if (site.authentication.remoteId) {
      commands.push(`set ${peerPath} authentication remote-id ${sanitizeConfigValue(site.authentication.remoteId)}`);
    }

    if (site.authentication.localId) {
      commands.push(`set ${peerPath} authentication local-id ${sanitizeConfigValue(site.authentication.localId)}`);
    }

    commands.push(`set ${peerPath} ike-group ${ikeGroupName}`);
    commands.push(`set ${peerPath} local-address ${site.localAddress}`);

    if (site.description) {
      commands.push(`set ${peerPath} description ${sanitizeConfigValue(site.description)}`);
    }

    // Tunnels
    site.tunnels.forEach((tunnel) => {
      const tunnelPath = `${peerPath} tunnel ${tunnel.id}`;
      commands.push(`set ${tunnelPath} local prefix ${tunnel.localSubnet}`);
      commands.push(`set ${tunnelPath} remote prefix ${tunnel.remoteSubnet}`);
      commands.push(`set ${tunnelPath} esp-group ${espGroupName}`);

      if (tunnel.protocol) {
        commands.push(`set ${tunnelPath} protocol ${tunnel.protocol}`);
      }
    });

    return commands;
  }

  // ============================================================================
  // System Commands
  // ============================================================================

  buildSystemCommands(system: Partial<SystemConfig>): string[] {
    const commands: string[] = [];

    // Hostname
    if (system.hostName) {
      commands.push(`set system host-name ${sanitizeConfigValue(system.hostName)}`);
    }

    // Domain name
    if (system.domainName) {
      commands.push(`set system domain-name ${sanitizeConfigValue(system.domainName)}`);
    }

    // Time zone
    if (system.timeZone) {
      commands.push(`set system time-zone ${sanitizeConfigValue(system.timeZone)}`);
    }

    // Name servers
    if (system.nameServer) {
      system.nameServer.forEach((ns) => {
        commands.push(`set system name-server ${ns}`);
      });
    }

    // NTP
    if (system.ntp) {
      system.ntp.servers.forEach((server) => {
        commands.push(`set system ntp server ${server}`);
      });

      if (system.ntp.allowClients) {
        system.ntp.allowClients.forEach((client) => {
          commands.push(`set system ntp allow-clients address ${client}`);
        });
      }
    }

    // Users
    if (system.login?.users) {
      system.login.users.forEach((user) => {
        commands.push(...this.buildUserCommands(user));
      });
    }

    return commands;
  }

  buildUserCommands(user: SystemUser): string[] {
    const commands: string[] = [];
    const basePath = `system login user ${user.name}`;

    if (user.fullName) {
      commands.push(`set ${basePath} full-name ${sanitizeConfigValue(user.fullName)}`);
    }

    if (user.authentication.plaintextPassword) {
      commands.push(`set ${basePath} authentication plaintext-password ${sanitizeConfigValue(user.authentication.plaintextPassword)}`);
    }

    if (user.authentication.encryptedPassword) {
      commands.push(`set ${basePath} authentication encrypted-password ${sanitizeConfigValue(user.authentication.encryptedPassword)}`);
    }

    if (user.authentication.publicKeys) {
      user.authentication.publicKeys.forEach((key, index) => {
        commands.push(`set ${basePath} authentication public-keys key-${index} key ${sanitizeConfigValue(key)}`);
        commands.push(`set ${basePath} authentication public-keys key-${index} type ssh-rsa`);
      });
    }

    if (user.level) {
      commands.push(`set ${basePath} level ${user.level}`);
    }

    return commands;
  }
}
