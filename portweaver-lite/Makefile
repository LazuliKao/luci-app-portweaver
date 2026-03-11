include $(TOPDIR)/rules.mk

PKG_NAME:=portweaver-lite
PKG_VERSION:=1.0.0
PKG_RELEASE:=1

PKG_SOURCE_PROTO:=git
PKG_SOURCE_URL:=https://github.com/LazuliKao/portweaver.git
PKG_SOURCE_VERSION:=HEAD
PKG_MIRROR_HASH:=2ef3cef58cb22255fc4eb6be240f3db09209b205d8e814d9c585094c4e3e5b38

PKG_LICENSE:=GPL-3.0
PKG_LICENSE_FILES:=LICENSE
PKG_MAINTAINER:=LazuliKao

PKG_BUILD_PARALLEL:=1

include $(INCLUDE_DIR)/package.mk

# ---------------------------------------------------------------------------
# Zig toolchain configuration
# ---------------------------------------------------------------------------
ZIG_VERSION := 0.15.2
ZIG_HOST_ARCH := x86_64-linux
ZIG_DIST_NAME := zig-$(ZIG_HOST_ARCH)-$(ZIG_VERSION)
ZIG_DIST_URL := https://ziglang.org/download/$(ZIG_VERSION)/$(ZIG_DIST_NAME).tar.xz

ZIG := $(STAGING_DIR_HOST)/bin/zig
ZIG_BOOTSTRAP := $(PKG_BUILD_DIR)/zig-tmp/$(ZIG_DIST_NAME)/zig

ZIG_TARGET := $(subst openwrt-,,$(GNU_TARGET_NAME))
ZIG_OPTIMIZE ?= ReleaseSmall

ifeq ($(CPU_TYPE),)
  ZIG_CPU := baseline
else
  ZIG_CPU := $(CPU_TYPE)
endif

# Shared files from the full portweaver package
PORTWEAVER_FILES_DIR := $(CURDIR)/../portweaver/files

# ---------------------------------------------------------------------------
# Package definition
# ---------------------------------------------------------------------------
define Package/portweaver-lite
  SECTION:=net
  CATEGORY:=Network
  TITLE:=PortWeaver (lite, no frpc/frps/ddns)
  URL:=https://github.com/LazuliKao/portweaver
  DEPENDS:=+libuci
  PROVIDES:=portweaver-impl
  CONFLICTS:=portweaver
endef

define Package/portweaver-lite/description
  PortWeaver Lite is a lightweight build of PortWeaver for OpenWrt.
  Only UCI and ubus support are enabled; frpc, frps and ddns are excluded,
  resulting in a smaller binary suitable for resource-constrained devices.
endef

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

define Build/Compile
	if [ ! -f "$(ZIG)" ]; then \
		echo "Zig $(ZIG_VERSION) not found in staging_dir, downloading bootstrap..."; \
		mkdir -p $(PKG_BUILD_DIR)/zig-tmp; \
		wget -q -O $(PKG_BUILD_DIR)/zig-tmp/zig.tar.xz $(ZIG_DIST_URL) && \
		tar -xf $(PKG_BUILD_DIR)/zig-tmp/zig.tar.xz -C $(PKG_BUILD_DIR)/zig-tmp; \
	fi
	ZIG_BIN=$$(if [ -f "$(ZIG)" ]; then echo "$(ZIG)"; else echo "$(ZIG_BOOTSTRAP)"; fi); \
	cd $(PKG_BUILD_DIR) && \
	$$ZIG_BIN build \
		-Dtarget=$(ZIG_TARGET) \
		-Dcpu=$(ZIG_CPU) \
		-Doptimize=$(ZIG_OPTIMIZE) \
		-Duci=true -Dubus=true \
		-Dfrpc=false -Dfrps=false -Dddns=false \
		--prefix $(PKG_INSTALL_DIR)
endef

# ---------------------------------------------------------------------------
# Install
# ---------------------------------------------------------------------------

define Package/portweaver-lite/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_INSTALL_DIR)/bin/portweaver $(1)/usr/bin/portweaver
	$(INSTALL_BIN) $(PORTWEAVER_FILES_DIR)/log-processor.sh $(1)/usr/bin/portweaver-log-processor
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_DATA) $(PORTWEAVER_FILES_DIR)/portweaver.config $(1)/etc/config/portweaver
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) $(PORTWEAVER_FILES_DIR)/portweaver.init $(1)/etc/init.d/portweaver
endef

define Package/portweaver-lite/conffiles
/etc/config/portweaver
endef

# ---------------------------------------------------------------------------

$(eval $(call BuildPackage,portweaver-lite))
