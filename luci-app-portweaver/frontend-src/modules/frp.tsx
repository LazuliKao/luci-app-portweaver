import { LogViewer } from "../components/LogViewer";
import { rpcClient } from "./client";
const form = L.form;

const nodeStatuses: Record<string, { status: string; last_error: string }> = {};
const statusElements: Record<string, HTMLElement> = {};
const actionButtons: Record<string, HTMLButtonElement> = {};

export default function (
  m: LuCI.form.CBIMap,
  s: LuCI.form.CBIAbstractSection,
  tab_id: string
) {
  let o: LuCI.form.CBIAbstractValue;

  o = s.taboption(tab_id, form.SectionValue, "_frp_nodes", form.GridSection, "frp_node");
  
  const ss = o.subsection;
  ss.anonymous = true;
  ss.addremove = true;
  ss.sortable = true;
  ss.cloneable = true;

  ss.sectiontitle = (section_id: string) =>
    L.uci.get("portweaver", section_id, "name") ||
    section_id ||
    _("Unnamed node");

  o = ss.option(form.Value, "name", _("Node Name"));
  o.modalonly = true;
  o.rmempty = false;
  o.datatype = "string";
  o.placeholder = "node1";
  o.validate = (_section_id: string, value: string) => {
    if (!value || String(value).trim() === "")
      return _("Node name is required");
    if (!/^[a-zA-Z0-9_-]+$/.test(String(value).trim()))
      return _(
        "Node name must contain only alphanumeric characters, underscore, or hyphen",
      );
    return true;
  };

  o = ss.option(form.DummyValue, "status", _("Status"));
  o.modalonly = false;
  o.cfgvalue = (section_id: string) => {
    const info = nodeStatuses[section_id] || { status: "unavailable" };
    const statusColor =
      {
        connected: "#4CAF50",
        connecting: "#FFC107",
        error: "#F44336",
        stopped: "#9E9E9E",
        unavailable: "#9E9E9E",
      }[info.status] || "#9E9E9E";

    const el = (
      <span
        style={`display:inline-block; width:12px; height:12px; border-radius:50%; background-color:${statusColor}; margin-right:8px;`}
      ></span>
    ) as HTMLElement;
    
    statusElements[section_id] = el;
    return el;
  };

  o = ss.option(form.Value, "server", _("FRP Server Address"));
  o.modalonly = true;
  o.rmempty = false;
  o.datatype = "host";
  o.placeholder = "1.2.3.4";
  o.validate = (_section_id: string, value: string) => {
    if (!value || String(value).trim() === "")
      return _("Server address is required");
    return true;
  };

  o = ss.option(form.Value, "port", _("FRP Server Port"));
  o.modalonly = true;
  o.rmempty = false;
  o.datatype = "port";
  o.placeholder = "7000";
  o.validate = (_section_id: string, value: string) => {
    if (!value || String(value).trim() === "")
      return _("Server port is required");
    const port = parseInt(value, 10);
    if (Number.isNaN(port) || port < 1 || port > 65535)
      return _("Port must be between 1 and 65535");
    return true;
  };

  o = ss.option(form.Value, "token", _("Authentication Token"));
  o.modalonly = true;
  o.password = true;
  o.rmempty = true;
  o.placeholder = "optional token for authentication";

  o = ss.option(form.DummyValue, "actions", _("Actions"));
  o.modalonly = false;
  o.cfgvalue = (section_id: string) => {
    const isRunning =
      (nodeStatuses[section_id]?.status || "stopped") !== "stopped";
    
    const btn = (
      <button
        type="button"
        class="cbi-button cbi-button-action"
        onclick={() => {
          const logViewer = new LogViewer(parseInt(section_id, 10));
          logViewer.open();
        }}
        disabled={!isRunning}
      >
        {_("View Logs")}
      </button>
    ) as HTMLButtonElement;
    
    actionButtons[section_id] = btn;
    return btn;
  };

  L.Poll.add(async () => {
    try {
      const sections = await L.uci.sections("portweaver", "frp_node");
      const promises = sections.map((sec: any) =>
        rpcClient
          .getFrpInfo(sec[".name"])
          .then((res) => {
            const oldStatus = nodeStatuses[sec[".name"]]?.status;
            nodeStatuses[sec[".name"]] = res;
            
            if (oldStatus !== res.status) {
              const statusEl = statusElements[sec[".name"]];
              if (statusEl) {
                const statusColor = {
                  connected: "#4CAF50",
                  connecting: "#FFC107",
                  error: "#F44336",
                  stopped: "#9E9E9E",
                  unavailable: "#9E9E9E",
                }[res.status] || "#9E9E9E";
                statusEl.style.backgroundColor = statusColor;
              }

              const actionBtn = actionButtons[sec[".name"]];
              if (actionBtn) {
                const isRunning = res.status !== "stopped";
                actionBtn.disabled = !isRunning;
              }
            }
          })
          .catch(() => {
            nodeStatuses[sec[".name"]] = {
              status: "error",
              last_error: "Failed to fetch status",
            };
            
            const statusEl = statusElements[sec[".name"]];
            if (statusEl) {
              statusEl.style.backgroundColor = "#F44336";
            }

            const actionBtn = actionButtons[sec[".name"]];
            if (actionBtn) {
              actionBtn.disabled = true;
            }
          }),
      );
      await Promise.all(promises);
    } catch (e) {
      console.error("Polling for FRP status failed:", e);
    }
  }, 5);
}
