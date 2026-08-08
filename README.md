# LuCI PortWeaver UI - TypeScript Source

This directory contains the TypeScript source code for the LuCI PortWeaver UI.

## Structure

```
components/     # UI component modules
modules/        # Business logic modules
types/          # TypeScript type definitions
utils/          # Utility functions
main.tsx        # Main entry point
```

## Development

This package is managed from the project root directory.
Run dependency installation in the project root:

```bash
pnpm install
```

### Local Development
```bash
pnpm dev
```

### Remote Development (Auto-upload to OpenWrt)

1. Copy `.env.example` to `.env` and configure SSH settings:
```bash
cp .env.example .env
```

2. Edit `.env`:
```env
SSH_HOST=192.168.1.1
SSH_PORT=22
SSH_USERNAME=root
SSH_PASSWORD=your_password
# Or use SSH key: SSH_PRIVATE_KEY_PATH=~/.ssh/id_rsa
SSH_REMOTE_PATH=/www/luci-static/resources/view/portweaver
```

3. Start remote development:
```bash
pnpm dev:remote
```

This will auto-compile and upload changes to your OpenWrt device.

### Build
```bash
pnpm build
```

## Build Output

The TypeScript code will be compiled and bundled into:
`./package/luci-app-portweaver/htdocs/luci-static/resources/view/portweaver/config.js`

This file is what gets packaged into the final IPK.

## Notes

- The source files (such as `main.tsx`, `components/`, `modules/`) are NOT included in the IPK package
- Only the compiled output in `package/luci-app-portweaver/htdocs/` is packaged
- Keep LuCI API compatibility when refactoring
