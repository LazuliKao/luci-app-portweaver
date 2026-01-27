include $(TOPDIR)/rules.mk

PKG_NAME:=portweaver
PKG_VERSION:=1.0.0
PKG_RELEASE:=1

PKG_SOURCE_PROTO:=git
PKG_SOURCE_URL:=https://github.com/LazuliKao/portweaver.git
PKG_SOURCE_VERSION:=HEAD
PKG_MIRROR_HASH:=6e86764b9510bce3bf3c059ee96c70b100858b9860c3a057226fb325f2f3dbcc

PKG_LICENSE:=GPL-3.0
PKG_LICENSE_FILES:=LICENSE
PKG_MAINTAINER:=LazuliKao

PKG_BUILD_DEPENDS:=zig/host
PKG_BUILD_PARALLEL:=1

include $(INCLUDE_DIR)/package.mk

# Zig configuration
ZIG := $(STAGING_DIR_HOST)/bin/zig
ZIG_TARGET := $(subst openwrt-,,$(GNU_TARGET_NAME))

# Go configuration
GO_ROOT := $(STAGING_DIR_HOST)/portweaver-go
GO := $(GO_ROOT)/bin/go

define Package/portweaver
  SECTION:=net
  CATEGORY:=Network
  TITLE:=Port forwarding and NAT traversal tool
  URL:=https://github.com/LazuliKao/portweaver
  DEPENDS:=+libuci
endef

define Package/portweaver/description
  PortWeaver is a flexible port forwarding and NAT traversal tool
  for OpenWrt, with UCI configuration support.
endef

define Build/Compile
	# Check if Go is available, download if not
	@if [ ! -f "$(GO)" ]; then \
		echo "Go not found, downloading..."; \
		mkdir -p $(GO_ROOT); \
		cd $(STAGING_DIR_HOST) && \
		wget -q -O portweaver-go.tar.gz https://github.com/LazuliKao/build-golang/releases/download/go1.25.6/go1.25.6.linux-amd64.tar.gz && \
		tar xzf portweaver-go.tar.gz -C $(GO_ROOT) --strip-components=1 && \
		rm portweaver-go.tar.gz; \
	fi
	
	# Check if Zig is available, download if not
	@if [ ! -f "$(ZIG)" ]; then \
		echo "Zig not found, downloading..."; \
		mkdir -p $(PKG_BUILD_DIR)/zig-tmp; \
		cd $(PKG_BUILD_DIR)/zig-tmp && \
		wget -q -O zig.tar.xz https://ziglang.org/download/0.15.2/zig-x86_64-linux-0.15.2.tar.xz && \
		tar xf zig.tar.xz; \
		cd $(PKG_BUILD_DIR) && \
		GOROOT=$(GO_ROOT) PATH=$(GO_ROOT)/bin:$(PATH) \
		$(PKG_BUILD_DIR)/zig-tmp/zig-x86_64-linux-0.15.2/zig build \
			-Dtarget=$(ZIG_TARGET) \
			-Dcpu=$(if $(CPU_TYPE),$(CPU_TYPE),baseline) \
			-Duci=true \
			-Dubus=true \
			-Dfrpc=true \
			--prefix $(PKG_INSTALL_DIR) \
			--release=small; \
	else \
		cd $(PKG_BUILD_DIR) && \
		GOROOT=$(GO_ROOT) PATH=$(GO_ROOT)/bin:$(PATH) \
		$(ZIG) build \
			-Dtarget=$(ZIG_TARGET) \
			-Dcpu=$(if $(CPU_TYPE),$(CPU_TYPE),baseline) \
			-Duci=true \
			-Dubus=true \
			-Dfrpc=true \
			--prefix $(PKG_INSTALL_DIR) \
			--release=small; \
	fi
endef

define Package/portweaver/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_INSTALL_DIR)/bin/portweaver $(1)/usr/bin/portweaver
	
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_DATA) ./files/portweaver.config $(1)/etc/config/portweaver
	
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/portweaver.init $(1)/etc/init.d/portweaver
endef

define Package/portweaver/conffiles
/etc/config/portweaver
endef

$(eval $(call BuildPackage,portweaver))
