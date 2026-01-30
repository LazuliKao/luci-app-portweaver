import { StatusPanel } from "../components/StatusPanel";
const form = L.form;
import { type Client, rpcClient } from "./client";

export default function (
  _m: LuCI.form.CBIMap,
  s: LuCI.form.CBIAbstractSection,
  client: Client,
  tab_id: string,
) {
  let o: LuCI.form.CBIAbstractValue;

  o = s.taboption(tab_id, form.Flag, "enabled", _("Enable PortWeaver"));
  o.default = "1";
  o.rmempty = false;

  o = s.taboption(
    tab_id,
    form.DummyValue,
    "_runtime_status",
    _("Runtime Status"),
  );
  o.rawhtml = true;
  o.cfgvalue = () => {
    const panel = new StatusPanel();
    client.statusPanel = panel;
    return panel.render(
      client.globalStatus,
      client.frpStatus,
      client.projectStatuses,
      client.events,
    );
  };

  const runtimeToggle = async (section_id: string) => {
    const idx = client.getProjectIndex(section_id);
    if (idx < 0) {
      L.ui.addNotification(
        null,
        <p>{_("Could not determine project index")}</p>,
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
        <p>
          {_("Runtime state updated to: ") +
            (newEnabled ? _("enabled") : _("disabled"))}
        </p>,
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
