import { StatusPanel } from "../components/StatusPanel";
const form = L.form;
import { type Client, rpcClient } from "./client";
export default function (m: LuCI.form.CBIMap, client: Client) {
  let o: LuCI.form.CBIAbstractValue;
  // Global settings section
  const s = m.section(
    form.NamedSection,
    "global",
    "global",
    _("Global Settings"),
  );
  o = s.option(form.Flag, "enabled", _("Enable PortWeaver"));
  o.default = "1";
  o.rmempty = false;

  // Runtime status display (component)
  o = s.option(form.DummyValue, "_runtime_status", _("Runtime Status"));
  o.rawhtml = true;
  o.cfgvalue = () => {
    const panel = new StatusPanel();
    return panel.render(client.globalStatus);
  };

  // Helper to toggle runtime enable via RPC
  const runtimeToggle = async (section_id: string) => {
    const idx = client.getProjectIndex(section_id);
    if (idx < 0) {
      L.ui.addNotification(
        null,
        E("p", _("Could not determine project index")),
        "error",
      );
      return Promise.resolve();
    }
    const status = client.getProjectStatus(section_id);
    const newEnabled = !status?.enabled;
    try {
      await rpcClient.setEnabled(idx, !!newEnabled);
      L.ui.addNotification(
        null,
        E(
          "p",
          _("Runtime state updated to: ") +
            (newEnabled ? _("enabled") : _("disabled")),
        ),
        "info",
      );
      const results = await Promise.all([
        rpcClient.getStatus(),
        rpcClient.listProjects(),
      ]);
      client.globalStatus = results[0] || {};
      client.projectStatuses = results[1]?.projects ? results[1].projects : [];
      location.reload();
    } catch (err) {
      L.ui.addNotification(
        null,
        <p>
          {_("Failed to toggle runtime state: ") +
            ((err as { message: string })?.message || String(err))}
        </p>,
        "error",
      );
    }
  };
  (window as any).portweaverToggle = runtimeToggle;
}
