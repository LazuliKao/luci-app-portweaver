import type {
  PortWeaverStatus,
  ProjectStatus,
  FrpStatus,
} from "../types/portweaver";
import {
  formatBytes,
  formatUptime,
  getErrorMessage,
} from "../utils/formatters";
import { createRpcClient } from "../utils/rpc-client";
export const rpcClient = createRpcClient(L.rpc);
export class Client {
  globalStatus: PortWeaverStatus;
  projectStatuses: ProjectStatus[];
  frpStatus: FrpStatus;
  constructor(
    data: [PortWeaverStatus, { projects: ProjectStatus[] }, FrpStatus],
  ) {
    this.globalStatus = data[0] || {};
    this.projectStatuses = data[1] ? data[1].projects || [] : [];
    this.frpStatus = data[2] || { frp_enabled: false };
    L.Poll.add(async () => {
      const updateText = (id: string, value: any) => {
        const elem = document.getElementById(id);
        if (elem) elem.textContent = String(value);
      };

      try {
        const results = await Promise.all([
          rpcClient.getStatus(),
          rpcClient.listProjects(),
          rpcClient.getFrpStatus(),
        ]);
        this.globalStatus = results[0] || {};
        this.projectStatuses = results[1]?.projects ? results[1].projects : [];
        this.frpStatus = results[2] || { frp_enabled: false };

        const statusElem = document.getElementById(
          "status-value",
        ) as HTMLElement | null;
        const statusColors: Record<string, string> = {
          running: "green",
          stopped: "red",
          degraded: "orange",
        };
        if (statusElem) {
          statusElem.textContent = this.globalStatus.status || "-";
          (statusElem.style as any).color =
            statusColors[this.globalStatus.status || ""] || "gray";
        }

        updateText(
          "total-projects-value",
          this.globalStatus.total_projects || 0,
        );
        updateText("active-ports-value", this.globalStatus.active_ports || 0);
        updateText("uptime-value", formatUptime(this.globalStatus.uptime || 0));
        updateText(
          "traffic-in-value",
          formatBytes(this.globalStatus.total_bytes_in || 0),
        );
        updateText(
          "traffic-out-value",
          formatBytes(this.globalStatus.total_bytes_out || 0),
        );

        const frpEnabledElem = document.getElementById("frp-enabled-value");
        if (frpEnabledElem) {
          frpEnabledElem.textContent = this.frpStatus.frp_enabled
            ? _("Enabled")
            : _("Disabled");
          frpEnabledElem.style.color = this.frpStatus.frp_enabled
            ? "#28a745"
            : "#6c757d";
        }
        const frpVersionElem = document.getElementById("frp-version-value");
        if (frpVersionElem && this.frpStatus.frp_version) {
          frpVersionElem.textContent = this.frpStatus.frp_version;
        }

        (() => {
          const sections = L.uci.sections("portweaver", "project") || [];
          for (let i = 0; i < sections.length; i++) {
            const section_id = sections[i][".name"];
            if (!section_id) {
              continue;
            }
            const status = this.getProjectStatus(section_id);
            const section = document.getElementById(
              `project-status-${section_id}`,
            );
            if (!section) continue;
            const newStatusElements = this.renderStatusElements(
              status,
              section_id,
            );
            section.replaceWith(
              <span>
                <div id={`project-status-${section_id}`}>
                  {newStatusElements}
                </div>
              </span>,
            );
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
            style={
              "font-size: 1em; font-weight: 600; color: " + statusColor + ";"
            }
          >
            {startupFailed ? "failed" : status.status || "unknown"}
          </strong>
        </span>
      </div>,
    ];

    if (errorMessage && status.status !== "stopped") {
      statusElements.push(
        <small style="color: #dc3545; margin-top: 0.3em;">
          {`⚠ ${errorMessage}`}
        </small>,
      );
    } else {
      const elements: any[] = [];
      if ((status.active_ports || 0) > 0) {
        elements.push(<span>{_("Ports: ") + (status.active_ports || 0)}</span>);
        elements.push(<br />);
      }
      if ((status.bytes_in || 0) && (status.bytes_out || 0)) {
        elements.push(
          <span>
            {"↓ " +
              formatBytes(status.bytes_in || 0) +
              " ↑ " +
              formatBytes(status.bytes_out || 0)}
          </span>,
        );
      }
      statusElements.push(<small>{elements}</small>);
    }

    return statusElements;
  }
}
