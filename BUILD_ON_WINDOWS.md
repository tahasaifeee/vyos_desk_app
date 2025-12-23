# Building VyOS Desktop Manager on Windows 11

## Why Build on Windows?

The application is currently being developed on Linux, but to create a Windows .exe installer, you need to build it on a Windows machine. Cross-compilation from Linux requires Wine, which is not available in all environments.

## Prerequisites for Windows 11

Before building, install these on your Windows 11 machine:

### 1. Node.js
- Download from: https://nodejs.org/
- Version: 18 LTS or higher
- Installer: Windows 64-bit (.msi)
- **Important**: Check "Add to PATH" during installation

### 2. Git for Windows
- Download from: https://git-scm.com/download/win
- Use default installation options

### 3. Visual Studio Build Tools (for native modules)
- Download from: https://visualstudio.microsoft.com/downloads/
- Install "Desktop development with C++"
- Or run in PowerShell as Administrator:
  ```powershell
  npm install --global windows-build-tools
  ```

## Step-by-Step Build Instructions

### Step 1: Clone the Repository

Open PowerShell or Command Prompt:

```powershell
# Navigate to your projects folder
cd C:\Users\YourUsername\Documents

# Clone the repository
git clone <your-repo-url>
cd vyos_desk_app

# Checkout the correct branch
git checkout claude/vyos-desktop-app-lTiFp
```

### Step 2: Install Dependencies

```powershell
npm install
```

This will download ~500MB of dependencies. It may take 5-10 minutes.

### Step 3: Build the Application

```powershell
# Build TypeScript and React code
npm run build
```

Expected output:
- React build: `dist/renderer/` (bundle size ~500KB)
- Main process build: `dist/main/`

### Step 4: Create Windows Installer

```powershell
# Create the .exe installer
npm run electron:build
```

This will:
1. Compile all code
2. Download Electron binaries for Windows
3. Package the application
4. Create NSIS installer

Expected output:
- **Installer**: `release/VyOS-Manager-Setup-1.0.0.exe` (~150MB)
- **Portable**: `release/win-unpacked/` (can run without installation)

Build time: 2-5 minutes depending on your machine.

### Step 5: Test the Application

Before distributing, test the installer:

```powershell
# Run from unpacked folder
cd release/win-unpacked
.\VyOS-Manager.exe
```

Or install using the installer:
```powershell
.\release\VyOS-Manager-Setup-1.0.0.exe
```

## Build Troubleshooting

### Issue: "npm install" fails with Python errors

**Solution**: Install Python 3.x
```powershell
# Using winget (Windows Package Manager)
winget install Python.Python.3.11
```

Restart PowerShell after installation.

### Issue: "node-gyp" errors during npm install

**Solution**: Install Visual Studio Build Tools
```powershell
npm install --global windows-build-tools
```

This installs Python and VS Build Tools automatically.

### Issue: "keytar" build fails

**Solution**: Rebuild native modules
```powershell
npm rebuild
```

### Issue: Build succeeds but app doesn't start

**Check**:
1. Look in `release/win-unpacked/resources/app.asar` - this should exist
2. Check `dist/main/main/index.js` exists
3. Review logs in PowerShell output

**Solution**: Clean rebuild
```powershell
# Delete build artifacts
Remove-Item -Recurse -Force dist, release

# Rebuild
npm run build
npm run electron:build
```

### Issue: "Access Denied" errors

**Solution**: Run PowerShell as Administrator
- Right-click PowerShell → "Run as Administrator"

### Issue: Installer is not signed (Windows SmartScreen warning)

**Expected behavior**: Windows will show "Windows protected your PC" because the app is not code-signed.

**For testing**:
- Click "More info" → "Run anyway"

**For distribution**: You need to sign the executable with a code signing certificate.

## Code Signing (Optional - For Distribution)

If you plan to distribute the application, you should sign it with a code signing certificate.

### Get a Code Signing Certificate

1. Purchase from: Sectigo, DigiCert, or similar CA
2. Cost: ~$100-500/year
3. Delivery: .pfx or .p12 file + password

### Configure Signing

Edit `package.json`:

```json
{
  "build": {
    "win": {
      "certificateFile": "path/to/certificate.pfx",
      "certificatePassword": "YOUR_PASSWORD"
    }
  }
}
```

**Security Note**: Never commit the certificate file or password to git!

### Build with Signing

```powershell
npm run electron:build
```

The installer will now be signed and won't trigger SmartScreen warnings.

## Development Mode on Windows

For development, you don't need to build an installer. Run in development mode:

```powershell
npm run dev
```

This will:
- Start the Vite dev server
- Launch Electron with hot reload
- Open DevTools automatically

Changes to code will reload automatically!

## Distribution

### For Internal Use
- Share the .exe installer from `release/VyOS-Manager-Setup-1.0.0.exe`
- Users run the installer, no additional software needed

### For Public Release
1. Code sign the executable (see above)
2. Create a GitHub Release
3. Upload the installer as an asset
4. Enable auto-updates (optional - see ARCHITECTURE.md)

## File Sizes

- **Source code**: ~2 MB
- **node_modules**: ~500 MB (not distributed)
- **Installer**: ~150 MB (includes Electron + dependencies)
- **Installed size**: ~400 MB

## Building on CI/CD

### GitHub Actions Example

```yaml
name: Build Windows

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run electron:build

      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: VyOS-Manager-Installer
          path: release/*.exe
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run dev` | Run in development mode |
| `npm run build` | Compile TypeScript/React |
| `npm run electron:build` | Create Windows installer |
| `npm rebuild` | Rebuild native modules |

## Next Steps After Building

1. **Test the installer** on a clean Windows machine
2. **Test on VyOS device** - try connecting and configuring
3. **Create screenshots** for documentation
4. **Package for distribution** if needed

## Support

If you encounter build issues not covered here:

1. Check Node.js version: `node --version` (should be 18+)
2. Check npm version: `npm --version` (should be 9+)
3. Review build output for specific errors
4. Check the GitHub repository for issues
5. See TROUBLESHOOTING.md for common problems

## Build Output Locations

After successful build:

```
vyos_desk_app/
├── dist/                       # Compiled code (git ignored)
│   ├── main/                   # Main process (Node.js)
│   └── renderer/               # Renderer process (React)
│
├── release/                    # Build output (git ignored)
│   ├── VyOS-Manager-Setup-1.0.0.exe    # ← Installer (distribute this)
│   └── win-unpacked/                    # Portable version
│       └── VyOS-Manager.exe
│
└── node_modules/               # Dependencies (git ignored)
```

## Important Notes

- **Do not commit** `dist/`, `release/`, or `node_modules/` to git
- The installer is **unsigned** by default (causes SmartScreen warning)
- First build takes longer (downloads Electron binaries)
- Subsequent builds are faster (cached dependencies)
- The .exe works offline (no internet required to run)

## Performance Tips

- **Faster builds**: Use an SSD for `node_modules`
- **Parallel builds**: Close other applications
- **Clean builds**: Only when necessary (slow)

---

**Ready to Build?** → Go to Step 1 and start building! 🚀
