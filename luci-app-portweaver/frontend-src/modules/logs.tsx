const form = L.form;
const fs = L.fs;
const _uci = L.uci;
const ui = L.ui;

const LOG_FILE = "/tmp/portweaver.log";

export default function (
  _m: LuCI.form.CBIMap,
  s: LuCI.form.CBIAbstractSection,
  tab_id: string,
) {
  let o: LuCI.form.CBIAbstractValue;

  o = s.taboption(tab_id, form.Flag, "log_enabled", _("Enable Logging"));
  o.default = "1";
  o.rmempty = false;
  o.description = _("Enable logging output to /tmp/portweaver.log");

  o = s.taboption(tab_id, form.DummyValue, "_logs_viewer");
  o.rawhtml = true;

  let pollInterval: NodeJS.Timeout | null = null;

  const updateLogs = () => {
    const container = document.getElementById("portweaver-log-container");
    if (!container) return;

    fs.read_direct(LOG_FILE, "text")
      .then((res: string) => {
        container.textContent = res.trim() || _("Log is empty.");
      })
      .catch((err: Error) => {
        if (err.toString().includes("NotFoundError")) {
          container.textContent = _("Log file does not exist.");
        } else {
          container.textContent = _("Error reading log: %s").format(
            err.toString(),
          );
        }
      });
  };

  const clearLogs = async () => {
    if (!confirm(_("Are you sure you want to clear all logs?"))) {
      return;
    }

    try {
      await fs.write(LOG_FILE, "");
      ui.addNotification(null, E("p", _("Logs cleared successfully")), "info");
      updateLogs();
    } catch (_err) {
      ui.addNotification(null, E("p", _("Failed to clear logs")), "error");
    }
  };

  const restartService = async () => {
    if (!confirm(_("Are you sure you want to restart PortWeaver service?"))) {
      return;
    }

    try {
      await fs.exec("/etc/init.d/portweaver", ["restart"]);
      ui.addNotification(
        null,
        E("p", _("Service restarted successfully")),
        "info",
      );
      setTimeout(updateLogs, 2000);
    } catch (_err) {
      ui.addNotification(null, E("p", _("Failed to restart service")), "error");
    }
  };

  o.render = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
    }

    pollInterval = setInterval(updateLogs, 3000);

    setTimeout(updateLogs, 100);

    return E("div", { class: "cbi-section" }, [
      E(
        "div",
        {
          style:
            "display: flex; gap: 10px; margin-bottom: 10px; align-items: center;",
        },
        [
          E(
            "button",
            {
              class: "btn cbi-button cbi-button-action",
              click: updateLogs,
            },
            [_("Refresh")],
          ),
          E(
            "button",
            {
              class: "btn cbi-button cbi-button-remove",
              click: clearLogs,
            },
            [_("Clear logs")],
          ),
          E(
            "button",
            {
              class: "btn cbi-button cbi-button-apply",
              click: restartService,
            },
            [_("Restart service")],
          ),
          E(
            "small",
            { style: "color: #666; margin-left: auto;" },
            _("Auto-refresh every 3 seconds"),
          ),
        ],
      ),
      E(
        "pre",
        {
          id: "portweaver-log-container",
          style:
            "padding: 10px; background: #f5f5f5; border: 1px solid #ddd; font-family: monospace; white-space: pre-wrap; word-break: break-all; max-height: 400px; overflow-y: auto; margin: 0;",
        },
        [_("Loading logs...")],
      ),
    ]);
  };
}
