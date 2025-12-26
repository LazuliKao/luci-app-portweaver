include $(TOPDIR)/rules.mk

PKG_NAME:=portweaver
PKG_VERSION:=1.0.0
PKG_RELEASE:=1

PKG_SOURCE_PROTO:=git
PKG_SOURCE_URL:=https://github.com/LazuliKao/PortWeaver.git
PKG_SOURCE_VERSION:=HEAD
PKG_MIRROR_HASH=104552175f6409837f92beda963e98bad51e6f26520360d432f3fa07cc7034aa

PKG_LICENSE:=MIT
PKG_LICENSE_FILES:=LICENSE
PKG_MAINTAINER:=LazuliKao

PKG_BUILD_DEPENDS:=zig/host
PKG_BUILD_PARALLEL:=1

include $(INCLUDE_DIR)/package.mk

# Zig configuration
ZIG := $(STAGING_DIR_HOST)/bin/zig
ZIG_TARGET := $(subst openwrt-,,$(GNU_TARGET_NAME))

define Package/portweaver
  SECTION:=net
  CATEGORY:=Network
  TITLE:=Port forwarding and NAT traversal tool
  URL:=https://github.com/LazuliKao/PortWeaver
  DEPENDS:=+libuci +kmod-ipt-nat +iptables-mod-ipopt
endef

define Package/portweaver/description
  PortWeaver is a flexible port forwarding and NAT traversal tool
  for OpenWrt, with UCI configuration support.
endef

define Build/Compile
	# Check if Zig is available, download if not
	@if [ ! -f "$(ZIG)" ]; then \
		echo "Zig not found, downloading..."; \
		mkdir -p $(PKG_BUILD_DIR)/zig-tmp; \
		cd $(PKG_BUILD_DIR)/zig-tmp && \
		wget -q -O zig.tar.xz https://ziglang.org/download/0.15.2/zig-x86_64-linux-0.15.2.tar.xz && \
		tar xf zig.tar.xz; \
		cd $(PKG_BUILD_DIR) && \
		$(PKG_BUILD_DIR)/zig-tmp/zig-x86_64-linux-0.15.2/zig build \
			-Dtarget=$(ZIG_TARGET) \
			-Dcpu=$(if $(CPU_TYPE),$(CPU_TYPE),baseline) \
			--release=small \
	else \
		cd $(PKG_BUILD_DIR) && \
		$(ZIG) build \
			-Dtarget=$(ZIG_TARGET) \
			-Dcpu=$(if $(CPU_TYPE),$(CPU_TYPE),baseline) \
			--release=small \
	fi
endef

define Package/portweaver/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_INSTALL_DIR)/bin/PortWeaver $(1)/usr/bin/portweaver
	
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_DATA) ./files/portweaver.config $(1)/etc/config/portweaver
	
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/portweaver.init $(1)/etc/init.d/portweaver
endef

define Package/portweaver/conffiles
/etc/config/portweaver
endef

$(eval $(call BuildPackage,portweaver))
