#!/bin/sh

# PortWeaver OpenWrt One-Click Installer

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

REPO="LazuliKao/openwrt-portweaver"
API_URL="https://api.github.com/repos/$REPO/releases/latest"

printf "${GREEN}PortWeaver OpenWrt One-Click Installer${NC}\n"
echo "======================================"

# Determine architecture
if command -v opkg >/dev/null 2>&1; then
    # opkg print-architecture outputs lines like "arch x86_64 10", we want the one with highest priority, excluding all/noarch
    ARCH=$(opkg print-architecture | awk '$1=="arch" && $2!="all" && $2!="noarch" {arch=$2} END {print arch}')
else
    ARCH=$(uname -m)
fi

if [ -z "$ARCH" ]; then
    ARCH=$(uname -m)
fi

printf "Detected Architecture: ${YELLOW}%s${NC}\n" "$ARCH"

# Select version
echo ""
echo "Please select the version to install:"
echo "1) Full version (portweaver + luci-app-portweaver)"
echo "2) Lite version (portweaver-lite)"
printf "Enter your choice [1-2]: "
read choice

if [ "$choice" = "1" ]; then
    VERSION_TYPE="full"
    CORE_PKG="portweaver"
    LUCI_PKG="luci-app-portweaver"
elif [ "$choice" = "2" ]; then
    VERSION_TYPE="lite"
    CORE_PKG="portweaver-lite"
    LUCI_PKG=""
else
    printf "${RED}Invalid choice. Exiting.${NC}\n"
    exit 1
fi

printf "You have selected the ${YELLOW}%s${NC} version.\n" "${VERSION_TYPE}"

# Get download tool
if command -v curl >/dev/null 2>&1; then
    FETCH_CMD="curl -sL"
elif command -v wget >/dev/null 2>&1; then
    # In OpenWrt, uclient-fetch is symlinked to wget. We use -qO-
    FETCH_CMD="wget -qO-"
else
    printf "${RED}Error: curl or wget is required to download packages.${NC}\n"
    exit 1
fi

echo "Fetching latest release information..."
RELEASE_INFO=$($FETCH_CMD "$API_URL")

if [ -z "$RELEASE_INFO" ]; then
    printf "${RED}Failed to fetch release information. Please check your network connection.${NC}\n"
    exit 1
fi

# Extract all browser_download_url lines
URLS=$(echo "$RELEASE_INFO" | grep -o '"browser_download_url": *"[^"]*"' | sed 's/"browser_download_url": "//' | sed 's/"//')

if [ -z "$URLS" ]; then
    printf "${RED}Failed to parse release information or no assets found.${NC}\n"
    exit 1
fi

# Find core package URL
CORE_URL=$(echo "$URLS" | grep -E "/${CORE_PKG}_.*_${ARCH}\.ipk" | head -n 1)

if [ -z "$CORE_URL" ]; then
    # Fallback to broader arch matching if exact match fails
    if echo "$ARCH" | grep -q "aarch64"; then
        CORE_URL=$(echo "$URLS" | grep -E "/${CORE_PKG}_.*_aarch64_generic\.ipk|/${CORE_PKG}_.*_aarch64_cortex-a53\.ipk" | head -n 1)
    fi
fi

if [ -z "$CORE_URL" ]; then
    printf "${RED}Could not find the core package for your architecture (${ARCH}).${NC}\n"
    echo "Available architectures in the latest release:"
    echo "$URLS" | grep -E "/${CORE_PKG}_" | sed "s|.*/${CORE_PKG}_.*_||" | sed 's/\.ipk//' | sort -u
    exit 1
fi

# Find LuCI package URL if requested
LUCI_URL=""
if [ -n "$LUCI_PKG" ]; then
    LUCI_URL=$(echo "$URLS" | grep -E "/${LUCI_PKG}_.*_all\.ipk" | head -n 1)
    if [ -z "$LUCI_URL" ]; then
        printf "${YELLOW}Warning: Could not find LuCI package for the latest release. Proceeding with core package only.${NC}\n"
    fi
fi

echo ""
printf "Found Core Package: ${GREEN}%s${NC}\n" "${CORE_URL##*/}"
if [ -n "$LUCI_URL" ]; then
    printf "Found LuCI Package: ${GREEN}%s${NC}\n" "${LUCI_URL##*/}"
fi

echo ""
printf "Do you want to proceed with the installation? (y/N) "
read confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Installation cancelled."
    exit 0
fi

cd /tmp || { printf "${RED}Failed to cd into /tmp${NC}\n"; exit 1; }

echo "Downloading ${CORE_URL##*/}..."
if command -v curl >/dev/null 2>&1; then
    curl -sL "$CORE_URL" -o "${CORE_URL##*/}"
else
    wget -qO "${CORE_URL##*/}" "$CORE_URL"
fi

if [ ! -s "${CORE_URL##*/}" ]; then
    printf "${RED}Failed to download core package.${NC}\n"
    exit 1
fi

if [ -n "$LUCI_URL" ]; then
    echo "Downloading ${LUCI_URL##*/}..."
    if command -v curl >/dev/null 2>&1; then
        curl -sL "$LUCI_URL" -o "${LUCI_URL##*/}"
    else
        wget -qO "${LUCI_URL##*/}" "$LUCI_URL"
    fi
    if [ ! -s "${LUCI_URL##*/}" ]; then
        printf "${RED}Failed to download LuCI package.${NC}\n"
        exit 1
    fi
fi

echo "Installing packages..."
if command -v opkg >/dev/null 2>&1; then
    # We update opkg before installing
    echo "Updating opkg feeds..."
    opkg update >/dev/null 2>&1

    opkg install "/tmp/${CORE_URL##*/}"
    if [ $? -ne 0 ]; then
        printf "${RED}Failed to install core package.${NC}\n"
        exit 1
    fi

    if [ -n "$LUCI_URL" ]; then
        opkg install "/tmp/${LUCI_URL##*/}"
        if [ $? -ne 0 ]; then
            printf "${RED}Failed to install LuCI package.${NC}\n"
            exit 1
        fi
    fi
else
    printf "${YELLOW}opkg not found. This does not appear to be an OpenWrt system.${NC}\n"
    echo "The downloaded packages are located in /tmp:"
    echo " - /tmp/${CORE_URL##*/}"
    if [ -n "$LUCI_URL" ]; then
        echo " - /tmp/${LUCI_URL##*/}"
    fi
    exit 1
fi

# Cleanup
rm -f "/tmp/${CORE_URL##*/}"
if [ -n "$LUCI_URL" ]; then
    rm -f "/tmp/${LUCI_URL##*/}"
fi

printf "${GREEN}Installation completed successfully!${NC}\n"
