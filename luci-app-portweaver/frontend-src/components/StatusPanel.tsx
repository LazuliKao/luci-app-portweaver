import type {
  PortWeaverStatus,
  FrpStatus,
  ProjectStatus,
  ActivityEvent,
} from "../types/portweaver";
import { formatBytes, formatUptime } from "../utils/formatters";

export class StatusPanel {
  render(
    status: PortWeaverStatus,
    frpStatus?: FrpStatus,
    projectStatuses?: ProjectStatus[],
    events?: ActivityEvent[],
  ): HTMLElement {
    const statusColor =
      {
        running: "#28a745",
        stopped: "#dc3545",
        degraded: "#ffc107",
      }[status.status || ""] || "#6c757d";

    // Calculate project health stats
    const enabledProjects = projectStatuses?.filter((p) => p.enabled) || [];
    const runningProjects = enabledProjects.filter(
      (p) => p.status === "running",
    );
    const hasEnabledProjects = enabledProjects.length > 0;

    return (
      <div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1em; margin-top: 0.5em;">
          {this.card(
            _("Status"),
            <strong
              style={`color: ${statusColor}; font-size: 1.1em; font-weight: 600;`}
              id="status-value"
            >
              {status.status || "-"}
            </strong>,
          )}

          {this.card(
            _("Total Projects"),
            <strong
              style="font-size: 1.1em; font-weight: 600;"
              id="total-projects-value"
            >
              {status.total_projects || 0}
            </strong>,
          )}

          {this.card(
            _("Active Ports"),
            <strong
              style="font-size: 1.1em; font-weight: 600;"
              id="active-ports-value"
            >
              {status.active_ports || 0}
            </strong>,
          )}

          {this.card(
            _("Uptime"),
            <strong
              style="font-size: 1.1em; font-weight: 600;"
              id="uptime-value"
            >
              {formatUptime(status.uptime || 0)}
            </strong>,
          )}

          {this.card(
            _("Traffic In"),
            <strong
              style="font-size: 1.1em; font-weight: 600;"
              id="traffic-in-value"
            >
              {formatBytes(status.total_bytes_in || 0)}
            </strong>,
          )}

          {this.card(
            _("Traffic Out"),
            <strong
              style="font-size: 1.1em; font-weight: 600;"
              id="traffic-out-value"
            >
              {formatBytes(status.total_bytes_out || 0)}
            </strong>,
          )}

          {/* Global Project Health Indicator */}
          {hasEnabledProjects &&
            this.card(
              _("Project Health"),
              <div id="project-health-value">
                <strong
                  style={`font-size: 1.1em; font-weight: 600; color: ${runningProjects.length === enabledProjects.length ? "#28a745" : runningProjects.length > 0 ? "#ffc107" : "#dc3545"};`}
                >
                  {runningProjects.length} / {enabledProjects.length}
                </strong>
                <div style="font-size: 0.85em; color: #6c757d; margin-top: 0.3em;">
                  {_("projects running")}
                </div>
              </div>,
            )}

          {frpStatus &&
            this.card(
              _("FRP Status"),
              <div>
                <strong
                  style={`font-size: 1.1em; font-weight: 600; color: ${this.getFrpStatusColor(frpStatus)};`}
                  id="frp-enabled-value"
                >
                  {this.getFrpStatusText(frpStatus)}
                </strong>
                {frpStatus.frp_version && (
                  <div
                    style="font-size: 0.85em; color: #6c757d; margin-top: 0.3em;"
                    id="frp-version-value"
                  >
                    {frpStatus.frp_version}
                  </div>
                )}
                {frpStatus.client_count !== undefined &&
                  frpStatus.client_count > 0 && (
                    <div style="font-size: 0.85em; color: #6c757d; margin-top: 0.2em;">
                      {frpStatus.client_count} {_("client(s)")}
                    </div>
                  )}
              </div>,
            )}

          {/* FRP Error Display */}
          {frpStatus?.last_error &&
            this.card(
              _("FRP Error"),
              <div
                style="cursor: help;"
                title={frpStatus.last_error}
                id="frp-error-value"
              >
                <strong style="font-size: 0.95em; font-weight: 600; color: #dc3545;">
                  {this.truncateError(frpStatus.last_error, 50)}
                </strong>
              </div>,
            )}
        </div>

        {/* Activity Log Section */}
        {events && events.length > 0 && this.renderActivityLog(events)}
      </div>
    );
  }

  private getFrpStatusColor(frpStatus: FrpStatus): string {
    if (!frpStatus.frp_enabled) return "#6c757d";
    switch (frpStatus.frp_status) {
      case "connected":
        return "#28a745";
      case "connecting":
        return "#ffc107";
      case "error":
        return "#dc3545";
      case "stopped":
        return "#6c757d";
      default:
        return frpStatus.frp_enabled ? "#28a745" : "#6c757d";
    }
  }

  private getFrpStatusText(frpStatus: FrpStatus): string {
    if (!frpStatus.frp_enabled) return _("Disabled");
    if (frpStatus.frp_status) {
      switch (frpStatus.frp_status) {
        case "connected":
          return _("Connected");
        case "connecting":
          return _("Connecting");
        case "error":
          return _("Error");
        case "stopped":
          return _("Stopped");
        default:
          return frpStatus.frp_status;
      }
    }
    return _("Enabled");
  }

  private truncateError(error: string, maxLen: number): string {
    if (error.length <= maxLen) return error;
    return `${error.substring(0, maxLen - 3)}...`;
  }

  private renderActivityLog(events: ActivityEvent[]): HTMLElement {
    // Show last 5 events, most recent first
    const recentEvents = events.slice(-5).reverse();

    return (
      <div style="margin-top: 1em; border: 1px solid #dee2e6; border-radius: 4px; padding: 0.8em;">
        <div style="font-size: 0.9em; font-weight: 600; margin-bottom: 0.5em; color: #495057;">
          {_("Recent Activity")}
        </div>
        <div
          style="max-height: 150px; overflow-y: auto;"
          id="activity-log-container"
        >
          {recentEvents.map((event) => this.renderEventRow(event))}
        </div>
      </div>
    );
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
      project_started: "▶",
      project_stopped: "⏹",
      frp_error: "⚠",
      frp_connected: "🔗",
      frp_disconnected: "🔌",
      config_changed: "⚙",
    };

    const color = eventColors[event.type] || "#6c757d";
    const icon = eventIcons[event.type] || "•";
    const time = this.formatTimestamp(event.timestamp);

    return (
      <div style="display: flex; align-items: flex-start; padding: 0.3em 0; border-bottom: 1px solid #eee; font-size: 0.85em;">
        <span style={`color: ${color}; margin-right: 0.5em; flex-shrink: 0;`}>
          {icon}
        </span>
        <span style="color: #6c757d; margin-right: 0.5em; flex-shrink: 0; min-width: 70px;">
          {time}
        </span>
        <span style="flex: 1; word-break: break-word;" title={event.message}>
          {this.truncateError(event.message, 60)}
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

  private card(label: string, valueEl: any): HTMLElement {
    return (
      <div style="border: 1px solid #dee2e6; padding: 0.8em; border-radius: 4px; background: transparent;">
        <div style="font-size: 0.85em; color: #6c757d; margin-bottom: 0.3em;">
          {label}
        </div>
        {valueEl}
      </div>
    );
  }
}
