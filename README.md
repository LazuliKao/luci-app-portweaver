# PortWeaver OpenWrt Packages

This repository contains OpenWrt packages for [PortWeaver](https://github.com/LazuliKao/PortWeaver) - a flexible port forwarding and NAT traversal tool.

## Packages

- **openwrt-portweaver/** - Core PortWeaver binary package
- **luci-app-portweaver/** - LuCI web interface for PortWeaver

## Installation

### Pre-built Packages

Download the latest pre-built packages from [Releases](../../releases) and install:

```bash
# Install core package
opkg install portweaver_*.ipk

# Install LuCI web interface (optional)
opkg install luci-app-portweaver_*.ipk
```

### Build from Source

#### Using GitHub Actions

The packages are automatically built using GitHub Actions for multiple architectures:
- x86_64
- aarch64 (ARM64: Raspberry Pi 3/4)
- arm_cortex-a7 (Raspberry Pi 2)
- mipsel_24kc (MT7621 routers)
- mips_24kc (AR71xx/AR9xxx routers)
- And more...

#### Manual Build

1. Set up OpenWrt SDK:
```bash
wget https://downloads.openwrt.org/releases/24.10.5/targets/x86/64/openwrt-sdk-24.10.5-x86-64_gcc-13.3.0_musl.Linux-x86_64.tar.xz
tar -xJf openwrt-sdk-*.tar.xz
cd openwrt-sdk-*
```

2. Copy packages to SDK:
```bash
git clone https://github.com/LazuliKao/luci-app-portweaver.git
cp -r luci-app-portweaver/openwrt-portweaver package/network/portweaver
cp -r luci-app-portweaver/luci-app-portweaver package/luci/applications/luci-app-portweaver
```

3. Update feeds and build:
```bash
./scripts/feeds update -a
./scripts/feeds install -a
make defconfig
make package/portweaver/compile V=s
make package/luci-app-portweaver/compile V=s
```

## Configuration

Configuration is located at `/etc/config/portweaver`. Each `project` section defines a port forwarding rule.

### Example Configuration

```uci
config project 'rdp'
    option remark 'Windows RDP'
    option family 'any'
    option protocol 'tcp'
    option listen_port '3389'
    option reuseaddr '1'
    option target_address '192.168.1.100'
    option target_port '3389'
    option open_firewall_port '1'
    option add_firewall_forward '1'

config project 'web'
    option remark 'Web Server'
    option family 'ipv4'
    option protocol 'tcp'
    option listen_port '8080'
    option reuseaddr '1'
    option target_address '192.168.1.200'
    option target_port '80'
    option open_firewall_port '1'
    option add_firewall_forward '0'
```

### Configuration Options

| Option | Values | Description |
|--------|--------|-------------|
| `remark` | string | Description of the rule |
| `family` | `any`/`ipv4`/`ipv6` | Address family restriction |
| `protocol` | `both`/`tcp`/`udp` | Protocol to forward |
| `listen_port` | 1-65535 | Port to listen on |
| `reuseaddr` | `0`/`1` | Enable SO_REUSEADDR socket option |
| `target_address` | IP/hostname | Destination address |
| `target_port` | 1-65535 | Destination port |
| `open_firewall_port` | `0`/`1` | Open port in firewall |
| `add_firewall_forward` | `0`/`1` | Add firewall forwarding rule |

## Usage

### Command Line

```bash
# Start service
/etc/init.d/portweaver start

# Stop service
/etc/init.d/portweaver stop

# Restart service
/etc/init.d/portweaver restart

# Enable on boot
/etc/init.d/portweaver enable

# Disable on boot
/etc/init.d/portweaver disable
```

### Web Interface

After installing `luci-app-portweaver`, access the web interface at:

**Services → PortWeaver**

The interface allows you to:
- Add/remove port forwarding projects
- Configure all forwarding options
- Enable/disable specific rules

## Requirements

- OpenWrt 24.10.5 or later (or SNAPSHOT builds)
- Dependencies (automatically installed):
  - `libuci`
  - `kmod-ipt-nat`
  - `iptables-mod-ipopt`

## Development

### Repository Structure

This repository is part of the PortWeaver project and contains two OpenWrt packages:

```
luci-app-portweaver/
├── .github/
│   └── workflows/
│       └── build-openwrt.yml         # GitHub Actions workflow
├── openwrt-portweaver/               # Core PortWeaver package
│   ├── Makefile                      # OpenWrt package Makefile
│   ├── files/
│   │   ├── portweaver.config         # Default UCI config
│   │   └── portweaver.init           # Init script
│   └── README.md
└── luci-app-portweaver/              # LuCI web interface package
    ├── Makefile                      # LuCI package Makefile
    ├── htdocs/
    │   └── luci-static/
    │       └── resources/
    │           └── view/
    │               └── portweaver/
    │                   └── config.js  # LuCI JS view
    ├── root/
    │   ├── etc/
    │   │   └── uci-defaults/
    │   │       └── 40_luci-portweaver
    │   └── usr/
    │       └── share/
    │           ├── luci/
    │           │   └── menu.d/
    │           │       └── luci-app-portweaver.json
    │           └── rpcd/
    │               └── acl.d/
    │                   └── luci-app-portweaver.json
    ├── po/
    │   └── templates/
    │       └── portweaver.pot        # Translation template
    └── README.md
```

### Testing

Test the configuration:
```bash
# Validate UCI config
uci show portweaver

# Test run in foreground
portweaver
```

## License

MIT License - see [LICENSE](LICENSE) file

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Related Projects

- **[PortWeaver](https://github.com/LazuliKao/PortWeaver)** - Core PortWeaver project (Zig implementation)
- Built with [Zig](https://ziglang.org/)

## Support

For issues related to:
- **PortWeaver core functionality**: [PortWeaver Issues](https://github.com/LazuliKao/PortWeaver/issues)
- **OpenWrt packaging and LuCI interface**: [Open an issue](../../issues) in this repository
