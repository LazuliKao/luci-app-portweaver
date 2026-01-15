const form = L.form;
export default function (m: LuCI.form.CBIMap) {
  let o: LuCI.form.CBIAbstractValue;
  // FRP Node Management section
  const s = m.section(
    form.GridSection,
    "frp_node",
    _("FRP Node Management"),
    _("Configure FRP nodes for port forwarding tunneling"),
  );
  s.anonymous = true;
  s.addremove = true;
  s.sortable = true;
  s.cloneable = true;

  s.sectiontitle = (section_id: string) =>
    L.uci.get("portweaver", section_id, "name") ||
    section_id ||
    _("Unnamed node");

  o = s.option(form.Value, "name", _("Node Name"));
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

  o = s.option(form.Value, "server", _("FRP Server Address"));
  o.modalonly = true;
  o.rmempty = false;
  o.datatype = "host";
  o.placeholder = "1.2.3.4";
  o.validate = (_section_id: string, value: string) => {
    if (!value || String(value).trim() === "")
      return _("Server address is required");
    return true;
  };

  o = s.option(form.Value, "port", _("FRP Server Port"));
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

  o = s.option(form.Value, "token", _("Authentication Token"));
  o.modalonly = true;
  o.password = true;
  o.rmempty = true;
  o.placeholder = "optional token for authentication";
}
