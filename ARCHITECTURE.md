# VyOS Desktop Application - Architecture Document

## Executive Summary

This document describes a production-ready desktop application for managing VyOS 1.5 routers through a graphical interface on Windows 11. The application uses SSH to communicate with VyOS devices and provides a comprehensive GUI for network configuration tasks.

## Technology Stack Selection

### Chosen Stack: Electron + React + TypeScript + Node.js

**Justification:**

1. **Electron Framework**
   - Native Windows 11 support with modern UI capabilities
   - Access to Node.js for SSH operations
   - Single executable packaging (.exe)
   - Mature ecosystem with proven enterprise applications (VS Code, Slack, Discord)
   - Built-in auto-updater and crash reporting

2. **React + TypeScript**
   - Component-based architecture for complex UIs
   - Strong typing reduces runtime errors
   - Massive ecosystem of UI libraries (Ant Design, Material-UI)
   - Easy to implement tree views, forms, and wizards
   - Hot reload for rapid development

3. **Node.js Backend**
   - Excellent SSH library support (ssh2)
   - JSON parsing and manipulation
   - File system access for logs and config storage
   - Native Windows integration

4. **Alternative Stacks Considered:**

   | Stack | Pros | Cons | Score |
   |-------|------|------|-------|
   | **Electron + React** | Modern UI, cross-platform, huge ecosystem | Larger bundle size (~150MB) | ⭐⭐⭐⭐⭐ |
   | **.NET WPF/WinUI 3** | Native Windows, smaller size, great performance | Windows-only, steeper learning curve | ⭐⭐⭐⭐ |
   | **Python + PySide6** | Rapid development, paramiko for SSH | Slower UI, packaging complexity | ⭐⭐⭐ |

**Final Choice: Electron + React + TypeScript** for best balance of development speed, UI quality, and maintainability.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Connection  │  │ Config Tree  │  │  Forms & Wizards │   │
│  │  Manager    │  │   Navigator  │  │  (Network, FW)   │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│         React Components (TSX) + Ant Design                  │
└─────────────────────────────────────────────────────────────┘
                            ↕ IPC (Electron)
┌─────────────────────────────────────────────────────────────┐
│                     BUSINESS LOGIC LAYER                     │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │   Device     │  │    Config     │  │    Command      │  │
│  │   Manager    │  │   Validator   │  │   Generator     │  │
│  └──────────────┘  └───────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                   VyOS COMMAND ENGINE                        │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │     SSH      │  │    Command    │  │     Config      │  │
│  │   Session    │  │   Executor    │  │     Parser      │  │
│  │   Manager    │  │               │  │                 │  │
│  └──────────────┘  └───────────────┘  └─────────────────┘  │
│           Node.js + ssh2 Library                            │
└─────────────────────────────────────────────────────────────┘
                            ↕ SSH Protocol
┌─────────────────────────────────────────────────────────────┐
│                      VyOS 1.5 DEVICE                        │
│              (CLI via SSH - No REST API)                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     STORAGE LAYER                           │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │  Credential  │  │    Device     │  │      Logs       │  │
│  │   Storage    │  │   Profiles    │  │   & Backups     │  │
│  │ (Win Cred)   │  │   (SQLite)    │  │   (File Sys)    │  │
│  └──────────────┘  └───────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Application Structure

```
vyos-desktop-app/
├── src/
│   ├── main/                          # Electron Main Process
│   │   ├── index.ts                   # Main entry point
│   │   ├── ipc-handlers.ts            # IPC communication handlers
│   │   ├── services/
│   │   │   ├── ssh/
│   │   │   │   ├── SSHClient.ts       # SSH connection wrapper
│   │   │   │   ├── SSHSessionPool.ts  # Connection pooling
│   │   │   │   └── KeyManager.ts      # SSH key handling
│   │   │   ├── vyos/
│   │   │   │   ├── VyOSClient.ts      # VyOS-specific operations
│   │   │   │   ├── CommandBuilder.ts  # CLI command generation
│   │   │   │   ├── ConfigParser.ts    # Parse 'show configuration'
│   │   │   │   └── CommandExecutor.ts # Execute with rollback
│   │   │   ├── storage/
│   │   │   │   ├── DeviceStorage.ts   # SQLite device profiles
│   │   │   │   ├── CredentialStore.ts # Windows Credential Manager
│   │   │   │   └── LogManager.ts      # Application logging
│   │   │   └── backup/
│   │   │       └── BackupManager.ts   # Config backup/restore
│   │   └── models/                    # TypeScript interfaces
│   │       ├── Device.ts
│   │       ├── NetworkInterface.ts
│   │       ├── Firewall.ts
│   │       ├── NAT.ts
│   │       ├── VPN.ts
│   │       └── VyOSConfig.ts
│   │
│   ├── renderer/                      # Electron Renderer Process
│   │   ├── App.tsx                    # Root React component
│   │   ├── index.tsx                  # Renderer entry point
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── MainLayout.tsx     # App shell
│   │   │   │   └── Sidebar.tsx        # Navigation
│   │   │   ├── devices/
│   │   │   │   ├── DeviceList.tsx     # Device management
│   │   │   │   ├── DeviceForm.tsx     # Add/edit device
│   │   │   │   └── ConnectionTest.tsx # Test connection
│   │   │   ├── config/
│   │   │   │   ├── ConfigTree.tsx     # Tree navigation
│   │   │   │   ├── ConfigEditor.tsx   # Main editor
│   │   │   │   └── CommandPreview.tsx # Show generated CLI
│   │   │   ├── interfaces/
│   │   │   │   ├── InterfaceList.tsx
│   │   │   │   ├── EthernetForm.tsx
│   │   │   │   ├── VLANForm.tsx
│   │   │   │   └── BridgeForm.tsx
│   │   │   ├── firewall/
│   │   │   │   ├── ZoneList.tsx
│   │   │   │   ├── RuleList.tsx
│   │   │   │   └── RuleForm.tsx
│   │   │   ├── nat/
│   │   │   │   ├── SNATList.tsx
│   │   │   │   └── DNATList.tsx
│   │   │   ├── vpn/
│   │   │   │   └── IPSecForm.tsx
│   │   │   ├── system/
│   │   │   │   ├── SystemSettings.tsx
│   │   │   │   └── UserManagement.tsx
│   │   │   └── common/
│   │   │       ├── ConfirmDialog.tsx
│   │   │       ├── ErrorBoundary.tsx
│   │   │       └── LoadingSpinner.tsx
│   │   ├── hooks/
│   │   │   ├── useVyOSDevice.ts       # Device operations
│   │   │   ├── useConfig.ts           # Config CRUD
│   │   │   └── useCommands.ts         # Command execution
│   │   ├── store/                     # State management (Zustand)
│   │   │   ├── deviceStore.ts
│   │   │   ├── configStore.ts
│   │   │   └── uiStore.ts
│   │   └── styles/
│   │       └── theme.ts               # Ant Design theme
│   │
│   └── shared/                        # Shared types/utils
│       ├── types.ts
│       ├── constants.ts
│       └── validators.ts
│
├── resources/                         # App icons, installer assets
├── test/                              # Unit & integration tests
├── docs/                              # User documentation
├── package.json
├── tsconfig.json
├── electron-builder.yml               # Windows installer config
└── README.md
```

## Core Data Models

### 1. Device Profile
```typescript
interface DeviceProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  credentialId: string;  // Reference to Windows Credential Manager
  vyosVersion?: string;
  lastConnected?: Date;
  status: 'online' | 'offline' | 'unknown';
}
```

### 2. Network Interface
```typescript
interface NetworkInterface {
  name: string;  // eth0, eth1.100, bond0, br0
  type: 'ethernet' | 'vlan' | 'bond' | 'bridge' | 'loopback';
  description?: string;
  enabled: boolean;
  addresses: {
    ipv4?: string[];  // e.g., "192.168.1.1/24"
    ipv6?: string[];
    dhcp?: boolean;
  };
  vlan?: {
    id: number;
    parentInterface: string;
  };
  bond?: {
    mode: 'active-backup' | '802.3ad' | 'balance-rr';
    members: string[];
    primaryInterface?: string;
  };
  bridge?: {
    members: string[];
    stp: boolean;
  };
}
```

### 3. Firewall Configuration
```typescript
interface FirewallZone {
  name: string;
  defaultAction: 'accept' | 'drop' | 'reject';
  interfaces: string[];
  fromZones: {
    [zoneName: string]: {
      rulesetName: string;
    };
  };
}

interface FirewallRule {
  number: number;
  action: 'accept' | 'drop' | 'reject';
  description?: string;
  protocol?: 'tcp' | 'udp' | 'icmp' | 'all';
  source?: {
    address?: string;
    port?: string;
  };
  destination?: {
    address?: string;
    port?: string;
  };
  state?: {
    established?: boolean;
    related?: boolean;
    new?: boolean;
  };
  log?: boolean;
}
```

### 4. NAT Configuration
```typescript
interface NATRule {
  number: number;
  type: 'source' | 'destination';
  description?: string;
  outboundInterface?: string;  // For SNAT
  inboundInterface?: string;   // For DNAT
  source?: {
    address?: string;
    port?: string;
  };
  destination?: {
    address?: string;
    port?: string;
  };
  translation?: {
    address?: string;
    port?: string;
  };
}
```

### 5. VPN Configuration
```typescript
interface IPSecSite {
  name: string;
  authMode: 'pre-shared-secret' | 'x509';
  localAddress: string;
  remoteAddress: string;
  tunnels: {
    id: number;
    localSubnet: string;
    remoteSubnet: string;
    protocol: 'esp';
  }[];
  ike: {
    version: 1 | 2;
    proposal: {
      encryption: 'aes256' | 'aes128';
      hash: 'sha256' | 'sha1';
      dhGroup: '14' | '2';
    };
  };
  esp: {
    proposal: {
      encryption: 'aes256' | 'aes128';
      hash: 'sha256' | 'sha1';
    };
  };
}
```

## GUI Action → VyOS CLI Translation

### Example 1: Add Ethernet Interface with IP

**GUI Form Input:**
```
Interface: eth1
Description: "LAN Interface"
IPv4 Address: 192.168.1.1/24
Enabled: true
```

**Generated VyOS Commands:**
```bash
configure
set interfaces ethernet eth1 description 'LAN Interface'
set interfaces ethernet eth1 address '192.168.1.1/24'
delete interfaces ethernet eth1 disable
commit
save
exit
```

### Example 2: Create Firewall Rule

**GUI Form Input:**
```
Zone: LAN
To Zone: WAN
Ruleset: LAN-to-WAN
Rule Number: 10
Action: Accept
Protocol: TCP
Destination Port: 443
Description: "Allow HTTPS"
```

**Generated VyOS Commands:**
```bash
configure
set zone-policy zone LAN from WAN firewall name 'LAN-to-WAN'
set firewall name LAN-to-WAN rule 10 action accept
set firewall name LAN-to-WAN rule 10 protocol tcp
set firewall name LAN-to-WAN rule 10 destination port 443
set firewall name LAN-to-WAN rule 10 description 'Allow HTTPS'
commit
save
exit
```

### Example 3: Configure Source NAT (Masquerade)

**GUI Form Input:**
```
Rule: 100
Outbound Interface: eth0
Source Network: 192.168.1.0/24
Translation: Masquerade
```

**Generated VyOS Commands:**
```bash
configure
set nat source rule 100 outbound-interface 'eth0'
set nat source rule 100 source address '192.168.1.0/24'
set nat source rule 100 translation address 'masquerade'
commit
save
exit
```

## SSH Command Execution Flow

```
┌─────────────────────────────────────────────────────────┐
│ User Action: "Save Interface Configuration"            │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ CommandBuilder.generateInterfaceCommands(interface)    │
│ Returns: string[] of VyOS commands                     │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ Show Preview Dialog with generated commands            │
│ User confirms or cancels                               │
└─────────────────────────────────────────────────────────┘
                      ↓ (if confirmed)
┌─────────────────────────────────────────────────────────┐
│ BackupManager.createBackup(deviceId)                   │
│ Execute: "show configuration commands"                 │
│ Save output to local file with timestamp               │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ CommandExecutor.executeWithRollback(commands)          │
│ 1. Enter configure mode                                │
│ 2. Execute each command                                │
│ 3. Check for errors after each command                 │
│ 4. If error: execute "rollback" and throw               │
│ 5. If all success: commit                              │
│ 6. Save config                                         │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ Show Success Notification                              │
│ Refresh configuration tree                             │
│ Log operation to audit log                            │
└─────────────────────────────────────────────────────────┘
```

## Error Handling & Rollback

### Error Scenarios & Responses

1. **SSH Connection Failure**
   - Retry 3 times with exponential backoff
   - Show detailed error (timeout, auth failed, host unreachable)
   - Mark device as offline in UI

2. **Invalid Command Syntax**
   - Parse VyOS error output
   - Highlight problematic command in preview
   - Prevent commit

3. **Commit Failure**
   - Automatically execute `rollback 0`
   - Restore from local backup if needed
   - Log full error trace
   - Show user-friendly error message

4. **Network Interruption During Commit**
   - Attempt reconnection
   - Verify config state with `compare`
   - Offer manual rollback option

### Rollback Logic

```typescript
async executeWithRollback(commands: string[]): Promise<void> {
  const session = await this.sshClient.createSession();

  try {
    // Enter configure mode
    await session.exec('configure');

    // Execute commands one by one
    for (const cmd of commands) {
      const result = await session.exec(cmd);

      if (result.stderr || result.includes('Error')) {
        throw new VyOSCommandError(cmd, result);
      }
    }

    // Commit changes
    const commitResult = await session.exec('commit');
    if (commitResult.includes('Commit failed')) {
      throw new VyOSCommitError(commitResult);
    }

    // Save to startup config
    await session.exec('save');

  } catch (error) {
    // Rollback on any error
    await session.exec('rollback 0');
    await session.exec('exit');
    throw error;
  } finally {
    await session.exec('exit');
    session.close();
  }
}
```

## Security Considerations

### 1. Credential Storage
- **Windows Credential Manager Integration**
  - Use `keytar` npm package for native integration
  - Store format: `vyos-app:{deviceId}` → encrypted password/key
  - Never store credentials in SQLite or plain files

### 2. SSH Security
- **Key-Based Authentication Preferred**
  - Support OpenSSH key formats (RSA, Ed25519)
  - Store private keys in user's `.ssh` directory
  - Prompt for key passphrase, never store it

- **Password Authentication**
  - Encrypt in memory during session
  - Clear from memory after disconnect
  - No credential caching

### 3. Application Security
- **Content Security Policy**
  - Disable Node integration in renderer
  - Use context isolation
  - Validate all IPC messages

- **Code Signing**
  - Sign Windows executable with valid certificate
  - Prevents SmartScreen warnings
  - Enables auto-update verification

### 4. Audit Logging
- Log all configuration changes with:
  - Timestamp
  - User action
  - Device ID
  - Commands executed
  - Success/failure status
- Store logs in `%APPDATA%/vyos-desktop-app/logs`

## Sample UI Screens

### Screen 1: Dashboard
```
┌────────────────────────────────────────────────────────────┐
│ VyOS Manager                           🌙 Dark  ⚙ Settings │
├──────────┬─────────────────────────────────────────────────┤
│          │  My Devices (3)                                 │
│ Devices  │  ┌─────────────────────────────────────────┐    │
│ ─────    │  │ 📡 Office Router                        │    │
│ Network  │  │ 192.168.1.1  ✅ Connected                │    │
│  Ifaces  │  │ VyOS 1.5.0   Last: 2 minutes ago        │    │
│  Static  │  └─────────────────────────────────────────┘    │
│  Routes  │  ┌─────────────────────────────────────────┐    │
│ Firewall │  │ 📡 Branch Router                        │    │
│  NAT     │  │ 10.0.0.1     ⚠️ Offline                  │    │
│  VPN     │  │ VyOS 1.5.0   Last: 2 hours ago          │    │
│ System   │  └─────────────────────────────────────────┘    │
│ ─────    │  ┌─────────────────────────────────────────┐    │
│ Logs     │  │ 📡 Lab Router                           │    │
│ Backups  │  │ 172.16.0.1   ✅ Connected                │    │
│          │  │ VyOS 1.5.0   Last: 5 minutes ago        │    │
│          │  └─────────────────────────────────────────┘    │
│          │                                                 │
│          │  [➕ Add New Device]                            │
└──────────┴─────────────────────────────────────────────────┘
```

### Screen 2: Interface Configuration
```
┌────────────────────────────────────────────────────────────┐
│ VyOS Manager - Office Router (192.168.1.1)                │
├──────────┬─────────────────────────────────────────────────┤
│ Config   │  Interfaces > Ethernet > eth1                  │
│ Tree:    │  ┌─────────────────────────────────────────┐    │
│          │  │ Interface:    eth1              [Enable]│    │
│ ├─ Ifaces│  │ Description:  LAN Interface              │    │
│ │  ├─ eth│  │                                         │    │
│ │  ├─ eth│  │ IPv4 Addresses:                         │    │
│ │  └─ eth│  │  • 192.168.1.1/24          [🗑️]         │    │
│ ├─ Static│  │  [➕ Add Address]                        │    │
│ ├─ FW    │  │                                         │    │
│ │  ├─ Zon│  │ IPv6 Addresses:                         │    │
│ │  └─ Rul│  │  • fe80::1/64              [🗑️]         │    │
│ └─ NAT   │  │  [➕ Add Address]                        │    │
│          │  │                                         │    │
│          │  │ Advanced:                               │    │
│          │  │  MTU:         1500                      │    │
│          │  │  Duplex:      [Auto]                    │    │
│          │  │  Speed:       [Auto]                    │    │
│          │  │                                         │    │
│          │  └─────────────────────────────────────────┘    │
│          │                                                 │
│          │  [Preview Commands]  [Apply]  [Discard]        │
└──────────┴─────────────────────────────────────────────────┘
```

### Screen 3: Command Preview Dialog
```
┌────────────────────────────────────────────────────────────┐
│ Preview VyOS Commands                               [✕]    │
├────────────────────────────────────────────────────────────┤
│ The following commands will be executed on the device:     │
│                                                            │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ configure                                              │ │
│ │ set interfaces ethernet eth1 description 'LAN Iface'   │ │
│ │ set interfaces ethernet eth1 address '192.168.1.1/24'  │ │
│ │ set interfaces ethernet eth1 address 'fe80::1/64'      │ │
│ │ delete interfaces ethernet eth1 disable                │ │
│ │ commit                                                 │ │
│ │ save                                                   │ │
│ │ exit                                                   │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ ⚠️ A configuration backup will be created before applying. │
│                                                            │
│                          [Cancel]  [Apply Changes]         │
└────────────────────────────────────────────────────────────┘
```

## Build & Packaging for Windows 11

### Prerequisites
```bash
Node.js 18 LTS or higher
npm or yarn
Windows 11 SDK (for native modules)
Code signing certificate (optional but recommended)
```

### Build Configuration (electron-builder.yml)
```yaml
appId: com.vyosmanager.app
productName: VyOS Manager
copyright: Copyright © 2024

directories:
  output: dist
  buildResources: resources

files:
  - src/**/*
  - node_modules/**/*
  - package.json

win:
  target:
    - target: nsis
      arch:
        - x64
  icon: resources/icon.ico
  artifactName: ${productName}-Setup-${version}.${ext}
  requestedExecutionLevel: asInvoker
  sign: ./build/sign.js  # Code signing script

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: VyOS Manager
  installerIcon: resources/installer-icon.ico
  uninstallerIcon: resources/uninstaller-icon.ico
  license: LICENSE.txt
```

### Build Steps

1. **Install Dependencies**
```bash
npm install
```

2. **Development Mode**
```bash
npm run dev  # Hot reload for rapid development
```

3. **Build for Production**
```bash
npm run build           # Compile TypeScript
npm run electron:build  # Create Windows installer
```

4. **Output**
   - `dist/VyOS-Manager-Setup-1.0.0.exe` (NSIS installer)
   - ~150MB installer size
   - Installs to `C:\Program Files\VyOS Manager`
   - Auto-creates desktop shortcut

### Auto-Update Setup (Optional)
```typescript
// In main process
import { autoUpdater } from 'electron-updater';

autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'your-org',
  repo: 'vyos-desktop-app'
});

autoUpdater.checkForUpdatesAndNotify();
```

## Development Roadmap

### Phase 1: MVP (4-6 weeks)
- ✅ SSH connection management
- ✅ Device profiles with secure storage
- ✅ Basic interface configuration (Ethernet, IP addressing)
- ✅ Static routes
- ✅ Command preview & execution
- ✅ Basic error handling

### Phase 2: Advanced Features (4-6 weeks)
- ✅ Firewall zones & rules
- ✅ NAT (SNAT/DNAT)
- ✅ VLANs, Bonds, Bridges
- ✅ System settings (DNS, NTP, hostname)
- ✅ Configuration backup/restore
- ✅ Comprehensive error handling

### Phase 3: VPN & Polish (3-4 weeks)
- ✅ IPsec site-to-site VPN
- ✅ Dark/light theme
- ✅ User documentation
- ✅ Auto-updater
- ✅ Code signing
- ✅ Installer testing

### Phase 4: Advanced (Future)
- OpenVPN support
- BGP/OSPF configuration
- Configuration templates
- Multi-device operations
- Configuration diff viewer
- Plugin system

## Performance Considerations

1. **SSH Connection Pooling**
   - Maintain persistent SSH connections
   - Reuse sessions for multiple commands
   - Automatic reconnection on timeout

2. **Lazy Loading**
   - Load device configs on-demand
   - Virtual scrolling for large rule lists
   - Code splitting for React components

3. **Caching**
   - Cache parsed configs in memory
   - Invalidate on commit
   - Background refresh option

4. **Responsive UI**
   - All SSH operations in main process (non-blocking)
   - Progress indicators for long operations
   - Cancellable operations

## Testing Strategy

1. **Unit Tests (Jest)**
   - CommandBuilder logic
   - ConfigParser validation
   - Form validators

2. **Integration Tests**
   - SSH connection mocking
   - End-to-end command execution
   - Rollback scenarios

3. **Manual Testing**
   - Real VyOS 1.5 device
   - Edge cases (network failure, invalid input)
   - Windows 11 compatibility

## Conclusion

This architecture provides a solid foundation for a production-ready VyOS management application. The modular design allows easy extension for new features, while the security-first approach ensures safe credential handling and configuration management.

**Key Strengths:**
- Modern, maintainable tech stack
- Comprehensive VyOS 1.5 support
- Robust error handling and rollback
- Professional UI/UX
- Windows 11 optimized
- Extensible architecture

**Next Steps:**
1. Set up project structure
2. Implement SSH client and VyOS wrapper
3. Build core UI components
4. Implement configuration modules
5. Testing and refinement
6. Packaging and distribution
