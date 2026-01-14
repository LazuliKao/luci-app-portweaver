# LuCI PortWeaver UI - TypeScript Source

This directory contains the TypeScript source code for the LuCI PortWeaver UI.

## Structure

```
src/
├── types/          # TypeScript type definitions
├── components/     # UI component modules
├── utils/          # Utility functions
└── main.ts         # Main entry point
```

## Development

```bash
# Install dependencies
npm install

# Build once
npm run build

# Watch mode for development
npm run watch

# Clean build artifacts
npm run clean
```

## Build Output

The TypeScript code will be compiled and bundled into:
`../htdocs/luci-static/resources/view/portweaver/config.js`

This file is what gets packaged into the final IPK.

## Notes

- The src/ directory is NOT included in the IPK package
- Only the compiled output in htdocs/ is packaged
- Keep LuCI API compatibility when refactoring
