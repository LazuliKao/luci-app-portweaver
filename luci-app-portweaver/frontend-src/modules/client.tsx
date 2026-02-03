import type {
  PortWeaverStatus,
  ProjectStatus,
  FrpStatus,
  ActivityEvent,
  ForwarderStats,
} from "../types/portweaver";
import {
  formatBytes,
  formatUptime,
  getErrorMessage,
} from "../utils/formatters";
import { createRpcClient } from "../utils/rpc-client";
import { getThemeColors } from "../utils/theme-utils";
import type { StatusPanel } from "../components/StatusPanel";
export const rpcClient = createRpcClient(L.rpc);
export class Client {
  globalStatus: PortWeaverStatus;
  projectStatuses: ProjectStatus[];
  frpStatus: FrpStatus;
  events: ActivityEvent[];
  // References to UI elements provided by StatusPanel and config
  statusPanel?: StatusPanel;
  projectContainers: Record<string, HTMLElement> = {};
  constructor(
    data: [
      PortWeaverStatus,
      { projects: ProjectStatus[] },
      FrpStatus,
      ActivityEvent[],
    ],
  ) {
    this.globalStatus = data[0] || {};
    this.projectStatuses = data[1] ? data[1].projects || [] : [];
    this.frpStatus = data[2] || { frp_enabled: false };
    this.events = data[3] || [];
    L.Poll.add(async () => {
      try {
        const results = await Promise.all([
          rpcClient.getStatus(),
          rpcClient.listProjects(),
          rpcClient.getFrpStatus(),
          rpcClient.getEvents(),
        ]);
        this.globalStatus = results[0] || {};
        this.projectStatuses = results[1]?.projects ? results[1].projects : [];
        this.frpStatus = results[2] || { frp_enabled: false };
        this.events = results[3]?.events || [];

        const statusColors: Record<string, string> = {
          running: "green",
          stopped: "red",
          degraded: "orange",
        };
        if (this.statusPanel?.statusValueEl) {
          this.statusPanel.statusValueEl.textContent =
            this.globalStatus.status || "-";
          (this.statusPanel.statusValueEl.style as any).color =
            statusColors[this.globalStatus.status || ""] || "gray";
        }

        if (this.statusPanel?.totalProjectsEl)
          this.statusPanel.totalProjectsEl.textContent = String(
            this.globalStatus.total_projects || 0,
          );
        if (this.statusPanel?.activePortsEl)
          this.statusPanel.activePortsEl.textContent = String(
            this.globalStatus.active_ports || 0,
          );
        if (this.statusPanel?.uptimeEl)
          this.statusPanel.uptimeEl.textContent = formatUptime(
            this.globalStatus.uptime || 0,
          );
        if (this.statusPanel?.trafficInEl)
          this.statusPanel.trafficInEl.textContent = formatBytes(
            this.globalStatus.total_bytes_in || 0,
          );
        if (this.statusPanel?.trafficOutEl)
          this.statusPanel.trafficOutEl.textContent = formatBytes(
            this.globalStatus.total_bytes_out || 0,
          );

        if (this.statusPanel?.frpEnabledEl) {
          this.statusPanel.frpEnabledEl.textContent = this.frpStatus.frp_enabled
            ? _("Enabled")
            : _("Disabled");
          (this.statusPanel.frpEnabledEl.style as any).color = this.frpStatus
            .frp_enabled
            ? "#28a745"
            : "#6c757d";
        }
        if (this.statusPanel?.frpVersionEl && this.frpStatus.frp_version) {
          this.statusPanel.frpVersionEl.textContent =
            this.frpStatus.frp_version;
        }

        this.updateProjectHealthIndicator();
        this.updateFrpErrorDisplay();
        this.updateActivityLog();

        (() => {
          const sections = L.uci.sections("portweaver", "project") || [];
          for (let i = 0; i < sections.length; i++) {
            const section_id = sections[i][".name"];
            if (!section_id) {
              continue;
            }
            const status = this.getProjectStatus(section_id);
            const section = this.projectContainers[section_id];
            if (!section) continue;
            const newStatusElements = this.renderStatusElements(
              status,
              section_id,
            );
            const newContainer = (
              <div id={`project-status-${section_id}`}>{newStatusElements}</div>
            ) as HTMLElement;
            section.replaceWith(newContainer);
            this.projectContainers[section_id] = newContainer;
          }
        })();
      } catch (err) {
        console.warn("Auto-refresh failed:", err);
      }
    }, 3);
  }

  getProjectIndex(section_id: string): number {
    const sections = L.uci.sections("portweaver", "project");
    for (let i = 0; i < sections.length; i++) {
      if (sections[i][".name"] === section_id) return i;
    }
    return -1;
  }
  getProjectStatus(section_id: string): ProjectStatus | null {
    const idx = this.getProjectIndex(section_id);
    return idx >= 0 && this.projectStatuses && this.projectStatuses[idx]
      ? this.projectStatuses[idx]
      : null;
  }
  renderStatusElements(status: ProjectStatus | null, _section_id: string) {
    if (!status) {
      return [<span style="color: gray;">{_("N/A")}</span>];
    }
    const startupFailed = status.startup_status === "failed";
    const statusColor =
      status.status === "running" && !startupFailed ? "green" : "#dc3545";
    let errorMessage = null as string | null;
    if (
      startupFailed &&
      status.error_code !== undefined &&
      status.error_code !== 0
    ) {
      errorMessage = getErrorMessage(status.error_code);
    }

    const statusBadgeAttrs: any = {
      class: "ifacebadge",
      style: "",
    };
    if (errorMessage) {
      statusBadgeAttrs.title = errorMessage;
      statusBadgeAttrs.style += " cursor: help;";
    }

    const statusElements: any[] = [
      <div>
        <span {...statusBadgeAttrs}>
          <strong
            style={`font-size: 1em; font-weight: 600; color: ${statusColor};`}
          >
            {startupFailed ? "failed" : status.status || "unknown"}
          </strong>
        </span>
      </div>,
    ];

    if (errorMessage && status.status !== "stopped") {
      statusElements.push(
        <small style="color: #dc3545; margin-top: 0.3em;">
          {`\u26A0 ${errorMessage}`}
        </small>,
      );
    } else {
      const elements: any[] = [];
      if ((status.active_ports || 0) > 0) {
        elements.push(<span>{_("Ports: ") + (status.active_ports || 0)}</span>);
      }
      if (status.bytes_in || 0 || status.bytes_out || 0) {
        if (elements.length > 0) elements.push(<br />);
        elements.push(
          <span>
            {"\u2193 " +
              formatBytes(status.bytes_in || 0) +
              " \u2191 " +
              formatBytes(status.bytes_out || 0)}
          </span>,
        );
      }

      if (status.forwarders && status.forwarders.length > 0) {
        if (elements.length > 0) elements.push(<br />);
        elements.push(this.renderForwarderStats(status.forwarders));
      }

      if (elements.length > 0) {
        statusElements.push(<small>{elements}</small>);
      }
    }

    return statusElements;
  }

  private renderForwarderStats(forwarders: ForwarderStats[]): HTMLElement {
    const themeColors = getThemeColors();
    const borderColor = themeColors.isDark ? "#333" : "#eee";
    const bgColor = themeColors.isDark ? "#222" : "#f8f9fa";
    const textColor = themeColors.isDark ? "#ccc" : "#6c757d";

    const rows = forwarders.map((f) => (
      <div
        style={`display: flex; gap: 0.5em; padding: 0.15em 0; font-size: 0.9em; border-bottom: 1px solid ${borderColor};`}
      >
        <span style={`min-width: 35px; color: ${textColor};`}>
          {f.protocol.toUpperCase()}
        </span>
        <span style="min-width: 45px;">:{f.local_port}</span>
        <span style="color: #28a745;">
          {`\u2193${formatBytes(f.bytes_in)}`}
        </span>
        <span style="color: #dc3545;">
          {`\u2191${formatBytes(f.bytes_out)}`}
        </span>
      </div>
    ));

    return (
      <div
        style={`margin-top: 0.3em; padding: 0.3em; background: ${bgColor}; border-radius: 3px; max-height: 80px; overflow-y: auto;`}
      >
        {rows}
      </div>
    );
  }

  private updateProjectHealthIndicator(): void {
    const enabledProjects =
      this.projectStatuses?.filter((p) => p.enabled) || [];
    const runningProjects = enabledProjects.filter(
      (p) => p.status === "running",
    );
    const healthElem = this.statusPanel?.projectHealthEl;
    if (healthElem) {
      const healthColor =
        runningProjects.length === enabledProjects.length
          ? "#28a745"
          : runningProjects.length > 0
            ? "#ffc107"
            : "#dc3545";
      healthElem.innerHTML = "";
      healthElem.appendChild(
        <span>
          <strong
            style={`font-size: 1.1em; font-weight: 600; color: ${healthColor};`}
          >
            {runningProjects.length} / {enabledProjects.length}
          </strong>
          <div style="font-size: 0.85em; color: #6c757d; margin-top: 0.3em;">
            {_("projects running")}
          </div>
        </span>,
      );
    }
  }

  private updateFrpErrorDisplay(): void {
    const errorElem = this.statusPanel?.frpErrorEl;
    if (errorElem && this.frpStatus.last_error) {
      const truncated =
        this.frpStatus.last_error.length > 50
          ? `${this.frpStatus.last_error.substring(0, 47)}...`
          : this.frpStatus.last_error;
      errorElem.title = this.frpStatus.last_error;
      errorElem.innerHTML = "";
      errorElem.appendChild(
        <strong style="font-size: 0.95em; font-weight: 600; color: #dc3545;">
          {truncated}
        </strong>,
      );
    }
  }

  private updateActivityLog(): void {
    const logContainer = this.statusPanel?.activityLogContainer;
    if (logContainer && this.events && this.events.length > 0) {
      const recentEvents = this.events.slice(-5).reverse();
      logContainer.innerHTML = "";
      for (const event of recentEvents) {
        logContainer.appendChild(this.renderEventRow(event));
      }
    }
  }

  private renderEventRow(event: ActivityEvent): HTMLElement {
    const eventColors: Record<string, string> = {
      project_started: "#28a745",
      project_stopped: "#6c757d",
      frp_error: "#dc3545",
      frp_connected: "#28a745",
      frp_disconnected: "#ffc107",
      config_changed: "#17a2b8",
    };

    const eventIcons: Record<string, string> = {
      project_started: "\u25B6",
      project_stopped: "\u23F9",
      frp_error: "\u26A0",
      frp_connected: "\uD83D\uDD17",
      frp_disconnected: "\uD83D\uDD0C",
      config_changed: "\u2699",
    };

    const color = eventColors[event.type] || "#6c757d";
    const icon = eventIcons[event.type] || "\u2022";
    const time = this.formatTimestamp(event.timestamp);
    const truncatedMessage =
      event.message.length > 60
        ? `${event.message.substring(0, 57)}...`
        : event.message;

    return (
      <div style="display: flex; align-items: flex-start; padding: 0.3em 0; border-bottom: 1px solid #eee; font-size: 0.85em;">
        <span style={`color: ${color}; margin-right: 0.5em; flex-shrink: 0;`}>
          {icon}
        </span>
        <span style="color: #6c757d; margin-right: 0.5em; flex-shrink: 0; min-width: 70px;">
          {time}
        </span>
        <span style="flex: 1; word-break: break-word;" title={event.message}>
          {truncatedMessage}
        </span>
      </div>
    );
  }

  private formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }
}
