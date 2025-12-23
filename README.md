# VyOS Desktop Manager

A professional Windows 11 desktop application for managing VyOS 1.5 routers through a graphical interface. Built with Electron, React, and TypeScript.

## Features

### Core Functionality
- **Device Management**: Add, edit, and manage multiple VyOS devices
- **Secure Authentication**: SSH key-based and password authentication with Windows Credential Manager integration
- **Network Configuration**: Visual configuration for interfaces, VLANs, bonds, and bridges
- **Firewall Management**: Zone-based firewall with rule creation and management
- **NAT Configuration**: Source and destination NAT rules
- **VPN Support**: IPsec site-to-site VPN configuration
- **System Settings**: Hostname, DNS, NTP, and user management
- **Configuration Backup**: Automatic and manual backups with restore capability
- **Command Preview**: See generated VyOS CLI commands before applying
- **Rollback Protection**: Automatic rollback on configuration errors

### Safety Features
- Automatic configuration backup before changes
- Command preview with confirmation dialogs
- Rollback on failure
- Comprehensive error handling
- Audit logging

### User Experience
- Modern, professional UI with dark and light themes
- Real-time connection status
- Tooltips and validation
- Tree-based configuration navigation
- Form-based configuration with validation

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **UI Framework**: Ant Design 5
- **Desktop Framework**: Electron 28
- **State Management**: Zustand
- **SSH Communication**: ssh2 library
- **Secure Storage**: Windows Credential Manager (via keytar)
- **Database**: SQLite (sql.js)
- **Build Tool**: Vite + electron-builder

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: 18 LTS or higher
- **npm** or **yarn**
- **Windows 11** (x64)
- **Git** (for version control)

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Install Native Modules

```bash
npm rebuild
```

## Development

### Start Development Server

```bash
npm run dev
```

This command will:
- Start the Vite development server for the renderer process
- Compile the TypeScript code for the main process
- Launch Electron with hot reload enabled

## Building for Production

### Build the Application

```bash
npm run build
```

### Create Windows Installer

```bash
npm run electron:build
```

This will create a Windows installer in the `release/` directory (~150MB).

## Project Structure

```
vyos-desktop-manager/
├── src/
│   ├── main/                   # Electron main process
│   │   ├── index.ts            # Entry point
│   │   ├── ipc-handlers.ts     # IPC communication
│   │   └── services/           # Backend services
│   │       ├── ssh/            # SSH client
│   │       ├── vyos/           # VyOS operations
│   │       ├── storage/        # Database & credentials
│   │       └── backup/         # Backup management
│   │
│   ├── renderer/               # React frontend
│   │   ├── App.tsx             # Root component
│   │   ├── components/         # UI components
│   │   ├── store/              # State management
│   │   └── styles/             # CSS styles
│   │
│   └── shared/                 # Shared types & utilities
│       ├── types.ts            # TypeScript interfaces
│       ├── constants.ts        # Application constants
│       └── validators.ts       # Validation functions
│
├── resources/                  # App icons & assets
├── dist/                       # Compiled code
└── release/                    # Built installers
```

## Quick Start Guide

### 1. Add a Device

1. Launch VyOS Manager
2. Click "Add New Device"
3. Enter device details:
   - Name: Friendly name
   - Host: IP address or hostname
   - Port: SSH port (default: 22)
   - Username: VyOS username
   - Authentication: Password or SSH key
4. Test connection
5. Save

### 2. Configure Network

1. Connect to a device
2. Navigate to "Interfaces"
3. Select an interface
4. Configure IP addresses, MTU, etc.
5. Preview generated commands
6. Apply changes

### 3. Create Firewall Rules

1. Navigate to "Firewall"
2. Create zones
3. Add rulesets
4. Configure rules with source/destination
5. Preview and apply

### 4. Backup Configuration

1. Navigate to "Backups"
2. Click "Create Backup"
3. Backups are also created automatically before changes

## Key Features Explained

### Command Preview

Before applying any configuration, preview the exact VyOS CLI commands that will be executed:

```bash
configure
set interfaces ethernet eth1 description 'LAN Interface'
set interfaces ethernet eth1 address '192.168.1.1/24'
delete interfaces ethernet eth1 disable
commit
save
exit
```

### Automatic Rollback

If a configuration change fails, the application automatically executes `rollback 0` to restore the previous working configuration.

### Secure Credential Storage

Credentials are stored using Windows Credential Manager, providing native Windows encryption and security.

### Configuration Backups

- Automatic backups before each change
- Manual backups on demand
- Export backups to file
- Restore from any backup
- Retention policy (50 backups per device, 30 days)

## VyOS Compatibility

### Supported Versions
- VyOS 1.5.x (fully supported)
- VyOS 1.4.x (mostly compatible)

### Supported Features
- ✅ Network Interfaces (Ethernet, VLAN, Bond, Bridge)
- ✅ Static Routes
- ✅ Zone-based Firewall
- ✅ NAT (Source & Destination)
- ✅ IPsec VPN (Site-to-Site)
- ✅ System Settings

### Planned Features
- OpenVPN configuration
- BGP/OSPF routing
- QoS policies
- Load balancing

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed technical documentation including:
- Technology stack justification
- High-level architecture
- Data models
- Command generation
- Error handling & rollback
- Security considerations

## Security

- **No Cloud Dependencies**: All data stored locally
- **Encrypted Credentials**: Windows Credential Manager integration
- **SSH Key Support**: Recommended authentication method
- **Audit Logging**: Track all configuration changes
- **Command Validation**: Prevent dangerous commands

## Troubleshooting

### Connection Issues

```bash
# Test basic connectivity
ping <vyos-ip>
telnet <vyos-ip> 22
```

Check Windows Firewall and VyOS firewall rules.

### Build Issues

```bash
# Clean and rebuild
rm -rf node_modules
npm install
npm rebuild
```

### Credential Issues

Ensure Windows Credential Manager service is running. Run application as administrator for testing.

## Performance

- **Startup Time**: ~2-3 seconds
- **Memory Usage**: ~150-200 MB
- **Installer Size**: ~150 MB

## Contributing

Contributions welcome! Please follow TypeScript best practices and update tests/documentation.

## License

MIT License - See LICENSE file for details

## Support

- **Issues**: GitHub Issues
- **Documentation**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **VyOS Docs**: [docs.vyos.io](https://docs.vyos.io/)

## Acknowledgments

- VyOS project for the excellent router platform
- Electron, React, and Ant Design teams
- Open source community

---

**Built for the VyOS community with ❤️**