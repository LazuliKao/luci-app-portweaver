

interface ProxyStatsViewerProps {
  clientId: string;
  clientName: string;
  rpcClient: any;
  refreshInterval?: number;
}

export class ProxyStatsViewer {
  private clientId: string;
  private clientName: string;
  private rpcClient: any;
  private statsEl: HTMLElement | null = null;
  private errorEl: HTMLElement | null = null;
  private loadingEl: HTMLElement | null = null;
  private refreshInterval: number | null = null;
  private refreshRate: number;
  private isPaused: boolean = false;
  private visibilityHandler: (() => void) | null = null;
  private lastStats: string = "";
  private retryCount: number = 0;
  private maxRetries: number = 3;

  constructor(props: ProxyStatsViewerProps) {
    this.clientId = props.clientId;
    this.clientName = props.clientName;
    this.rpcClient = props.rpcClient;
    this.refreshRate = props.refreshInterval ?? 5000;
  }

  render(): HTMLElement {
    const container = document.createElement("div");
    container.style.cssText =
      "padding: 12px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;";

    this.loadingEl = document.createElement("div");
    this.loadingEl.textContent = "Loading stats...";
    this.loadingEl.style.cssText = "color: #666; font-size: 14px;";
    container.appendChild(this.loadingEl);

    this.errorEl = document.createElement("div");
    this.errorEl.style.cssText =
      "color: #d32f2f; font-size: 14px; display: none;";
    container.appendChild(this.errorEl);

    this.statsEl = document.createElement("div");
    this.statsEl.style.cssText = "display: none;";
    container.appendChild(this.statsEl);

    this.fetchStats();
    this.refreshInterval = window.setInterval(
      () => this.fetchStats(),
      this.refreshRate,
    );

    this.visibilityHandler = () => this.handleVisibilityChange();
    document.addEventListener("visibilitychange", this.visibilityHandler);

    return container;
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.isPaused = true;
    } else {
      this.isPaused = false;
      this.fetchStats();
    }
  }

  private async fetchStats(): Promise<void> {
    if (this.isPaused) return;

    try {
      const stats = await this.rpcClient.getFrpProxyStats(this.clientId);

      const currentStats = JSON.stringify(stats);

      if (currentStats === this.lastStats) {
        return;
      }

      this.lastStats = currentStats;
      this.retryCount = 0;

      if (this.loadingEl) {
        this.loadingEl.style.display = "none";
      }
      if (this.errorEl) {
        this.errorEl.style.display = "none";
      }

      if (this.statsEl) {
        this.statsEl.style.display = "block";
        this.statsEl.innerHTML = "";

        const proxies = stats.proxies ? JSON.parse(stats.proxies) : [];

        if (!Array.isArray(proxies) || proxies.length === 0) {
          const noProxiesEl = document.createElement("div");
          noProxiesEl.style.cssText = "color: #666; font-size: 14px;";
          noProxiesEl.textContent = "No proxies configured";
          this.statsEl.appendChild(noProxiesEl);
          return;
        }

        const hasError = proxies.some((p: any) => p.err && p.err.length > 0);
        const statusColor = hasError ? "#dc3545" : "green";
        const statusText = hasError ? "error" : "running";

        const statusBadge = document.createElement("div");
        statusBadge.style.cssText = "margin-bottom: 8px;";
        const badge = document.createElement("span");
        badge.className = "ifacebadge";
        badge.style.cssText = `font-size: 1em; font-weight: 600; color: ${statusColor};`;
        badge.textContent = statusText;
        statusBadge.appendChild(badge);
        this.statsEl.appendChild(statusBadge);

        const countEl = document.createElement("small");
        countEl.style.cssText = "display: block; margin-bottom: 4px;";
        countEl.innerHTML = `<span>Proxies: ${proxies.length}</span><br>`;
        this.statsEl.appendChild(countEl);

        const container = document.createElement("div");
        container.style.cssText =
          "margin-top: 0.3em; padding: 0.3em; background: #f8f9fa; border-radius: 3px; max-height: 80px; overflow-y: auto;";

        proxies.forEach((proxy: any) => {
          const row = document.createElement("div");
          row.style.cssText =
            "display: flex; gap: 0.5em; padding: 0.15em 0; font-size: 0.9em; border-bottom: 1px solid #eee;";

          const typeEl = document.createElement("span");
          typeEl.style.cssText = "min-width: 35px; color: #6c757d;";
          typeEl.textContent = proxy.type.toUpperCase();
          row.appendChild(typeEl);

          const portEl = document.createElement("span");
          portEl.style.cssText = "min-width: 45px;";
          portEl.textContent = `:${proxy.cfg?.remote_port || proxy.remote_addr || "N/A"}`;
          row.appendChild(portEl);

          const inEl = document.createElement("span");
          inEl.style.cssText = "color: #28a745;";
          inEl.textContent = "↓0 B";
          row.appendChild(inEl);

          const outEl = document.createElement("span");
          outEl.style.cssText = "color: #dc3545;";
          outEl.textContent = "↑0 B";
          row.appendChild(outEl);

          container.appendChild(row);
        });

        this.statsEl.appendChild(container);
      }
    } catch (error) {
      this.retryCount++;

      if (this.retryCount < this.maxRetries) {
        const backoffDelay = Math.min(1000 * 2 ** this.retryCount, 30000);
        setTimeout(() => this.fetchStats(), backoffDelay);
        return;
      }

      if (this.loadingEl) {
        this.loadingEl.style.display = "none";
      }
      if (this.errorEl) {
        this.errorEl.style.display = "block";
        this.errorEl.textContent = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    }
  }

  destroy(): void {
    if (this.refreshInterval !== null) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    if (this.visibilityHandler) {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
      this.visibilityHandler = null;
    }

    this.isPaused = true;
  }
}
