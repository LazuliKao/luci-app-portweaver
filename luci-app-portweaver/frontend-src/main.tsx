import "./utils/jsx-factory";
import { Client, rpcClient } from "./modules/client";
import FrpNodeSelector from "./components/FrpNodeSelector";
import PortMappingEditor from "./components/PortMappingEditor";
import type { PortWeaverStatus, ProjectStatus } from "./types/portweaver";
import frp from "./modules/frp";
import header from "./modules/header";

const form = L.form;
const uci = L.uci;
type UnwrapPromise<T> = T extends Promise<infer R> ? R : T;
export default class main extends L.view {
  override async load() {
    return Promise.all([
      uci.load("portweaver"),
      uci.load("firewall"),
      rpcClient
        .getStatus()
        .then((res: PortWeaverStatus) => res || {})
        .catch((err: any) => {
          console.warn("ubus get_status failed:", err);
          return {} as PortWeaverStatus;
        }),
      rpcClient
        .listProjects()
        .then((res: { projects: ProjectStatus[] }) => res || { projects: [] })
        .catch((err: any) => {
          console.warn("ubus list_projects failed:", err);
          return { projects: [] } as { projects: ProjectStatus[] };
        }),
    ]);
  }

  override render(data: UnwrapPromise<ReturnType<typeof this.load>>) {
    const m = new form.Map(
      "portweaver",
      _("PortWeaver"),
      _("Port forwarding and NAT traversal configuration"),
    );

    // Setup auto-refresh

    let o: LuCI.form.CBIAbstractValue;
    const client = new Client([data[2], data[3]]);
    header(m, client);
    {
      // Port forwarding rules section
      const s = m.section(
        form.GridSection,
        "project",
        _("Port Forwarding Projects"),
        _("Configure port forwarding projects for PortWeaver"),
      );
      s.anonymous = true;
      s.addremove = true;
      s.sortable = true;
      s.cloneable = true;

      s.sectiontitle = (section_id: string) =>
        uci.get("portweaver", section_id, "remark") || _("Unnamed project");
      // Runtime status indicator column
      o = s.option(form.DummyValue, "_runtime_status", _("Status"));
      o.modalonly = false;
      o.textvalue = (section_id: string) => {
        const status = client.getProjectStatus(section_id);
        return E(
          "div",
          { id: `project-status-${section_id}` },
          client.renderStatusElements(status, section_id),
        );
      };

      // Runtime toggle column
      o = s.option(form.Button, "_runtime_toggle", _("Toggle"));
      o.modalonly = false;
      o.editable = true;
      o.inputtitle = (section_id: string) => {
        const status = client.getProjectStatus(section_id);
        return status?.enabled ? _("Disable") : _("Enable");
      };
      o.onclick = (_ev: any, section_id: string) =>
        (window as any).portweaverToggle(section_id);

      o = s.option(form.Flag, "enabled", _("Enabled"));
      o.modalonly = false;
      o.default = "1";
      o.editable = true;

      // Preview column
      o = s.option(form.DummyValue, "_preview", _("Overview"));
      o.modalonly = false;
      o.textvalue = (section_id: string) => {
        const protocol = uci.get("portweaver", section_id, "protocol") || "tcp";
        const family = uci.get("portweaver", section_id, "family") || "any";
        const listen_port =
          uci.get("portweaver", section_id, "listen_port") || "";
        const target_address =
          uci.get("portweaver", section_id, "target_address") || "";
        const target_port =
          uci.get("portweaver", section_id, "target_port") || "";
        const port_mappings = L.toArray<string>(
          uci.get("portweaver", section_id, "port_mapping"),
        );
        const src_zones = L.toArray<string>(
          uci.get("portweaver", section_id, "src_zone"),
        );
        const dest_zones = L.toArray<string>(
          uci.get("portweaver", section_id, "dest_zone"),
        );

        const proto_text: string =
          ({ both: _("TCP and UDP"), tcp: "TCP", udp: "UDP" } as any)[
            protocol
          ] || String(protocol).toUpperCase();
        const family_text: string =
          (
            {
              any: _("IPv4 and IPv6"),
              ipv4: "IPv4",
              ipv6: "IPv6",
            } as any
          )[family] || family;

        const lines: any[] = [];
        lines.push(
          <span>
            {_("Incoming ")}
            <var>{family_text}</var>
            {_(" protocol ")}
            <var>{proto_text}</var>
          </span>,
        );

        if (src_zones.length > 0) {
          const src_badges = src_zones.map((z: string) =>
            E(
              "span",
              {
                class: "zonebadge",
                style: fwmodel.getZoneColorStyle(z),
              },
              [E("strong", {}, z || E("em", _("any zone")))],
            ),
          );
          lines.push(<br />);
          lines.push(E("span", {}, [_("From "), ...src_badges]));
        }

        if (port_mappings.length > 0) {
          lines.push(<br />);
          lines.push(
            E("span", {}, [
              E("strong", { style: "color: #09c;" }, _("Multi-Port")),
              _(" - "),
              E("var", {}, port_mappings.length),
              _(" mapping(s)"),
            ]),
          );
          const first = port_mappings[0];
          lines.push(<br />);
          lines.push(E("span", {}, [_("e.g. "), E("var", {}, first)]));
        } else if (listen_port) {
          lines.push(<br />);
          lines.push(E("span", {}, [_("Port "), E("var", {}, listen_port)]));
        }

        lines.push(<br />);
        lines.push(
          E("span", {}, [
            E("var", { "data-tooltip": "Forward" }, _("Forward")),
            _(" to "),
          ]),
        );

        if (dest_zones.length > 0) {
          const dest_badges = dest_zones.map((z: string) =>
            E(
              "span",
              {
                class: "zonebadge",
                style: fwmodel.getZoneColorStyle(z),
              },
              [E("strong", {}, z || E("em", _("any zone")))],
            ),
          );
          lines.push(...dest_badges);
          lines.push(_(" "));
        }

        if (target_address) {
          lines.push(E("span", {}, [_("IP "), E("var", {}, target_address)]));
        }
        if (port_mappings.length === 0 && target_port) {
          lines.push(E("span", {}, [_(" port "), E("var", {}, target_port)]));
        }
        return E("small", {}, lines);
      };

      // Modal configuration fields
      o = s.option(form.Value, "remark", _("Remark"));
      o.modalonly = true;
      o.rmempty = false;
      o.datatype = "string";
      o.validate = (_section_id: string, value: string) => {
        if (!value || String(value).trim() === "")
          return _("This field is required");
        return true;
      };
      o.placeholder = "My Project";

      o = s.option(form.Flag, "enabled", _("Enabled"));
      o.modalonly = true;
      o.default = "1";

      o = s.option(widgets.ZoneSelect, "src_zone", _("Source Zones"));
      o.modalonly = true;
      o.multiple = true;
      o.nocreate = false;
      o.allowlocal = false;
      o.default = "wan";
      o.rmempty = true;

      o = s.option(widgets.ZoneSelect, "dest_zone", _("Destination Zones"));
      o.modalonly = true;
      o.multiple = true;
      o.nocreate = false;
      o.allowlocal = false;
      o.default = "lan";
      o.rmempty = true;

      o = s.option(form.ListValue, "family", _("Address Family"));
      o.modalonly = true;
      o.value("any", _("IPv4 and IPv6"));
      o.value("ipv4", "IPv4");
      o.value("ipv6", "IPv6");
      o.default = "any";

      o = s.option(form.Value, "target_address", _("Target Address"));
      o.modalonly = true;
      o.rmempty = false;
      o.datatype = "host";
      o.placeholder = "192.168.1.100";
      o.validate = (_section_id: string, value: string) => {
        if (!value || String(value).trim() === "")
          return _("This field is required");
        return true;
      };

      // Port mode switcher
      o = s.option(form.Flag, "use_port_mappings", _("Use Port Mappings Mode"));
      o.modalonly = true;
      o.rmempty = true;
      o.default = "0";
      o.description = _(
        "Enable to configure multiple port mappings or port ranges. Disable for single port mode.",
      );

      // Single port mode
      o = s.option(form.ListValue, "protocol", _("Protocol"));
      o.modalonly = true;
      o.value("both", _("TCP and UDP"));
      o.value("tcp", "TCP");
      o.value("udp", "UDP");
      o.default = "tcp";
      o.depends("use_port_mappings", "0");

      // FRP node selector component factory
      o = s.option(FrpNodeSelector, "frp_nodes", _("FRP Tunnels"));
      o.modalonly = true;
      o.rmempty = true;
      o.depends("use_port_mappings", "0");
      o.depends("enable_app_forward", "1");

      // Port Mapping Editor component factory
      o = s.option(PortMappingEditor, "port_mapping", _("Port Mappings"));
      o.modalonly = true;
      o.depends("use_port_mappings", "1");

      o = s.option(form.Value, "listen_port", _("Listen Port"));
      o.modalonly = true;
      o.datatype = "port";
      o.placeholder = "8080";
      o.depends("use_port_mappings", "0");
      o.validate = (section_id: string, value: string) => {
        const use_mappings = uci.get(
          "portweaver",
          section_id,
          "use_port_mappings",
        );
        if (use_mappings !== "1") {
          if (!value || String(value).trim() === "")
            return _("This field is required in single port mode");
        }
        return true;
      };

      o = s.option(form.Value, "target_port", _("Target Port"));
      o.modalonly = true;
      o.datatype = "port";
      o.placeholder = "80";
      o.depends("use_port_mappings", "0");
      o.validate = (section_id: string, value: string) => {
        const use_mappings = uci.get(
          "portweaver",
          section_id,
          "use_port_mappings",
        );
        if (use_mappings !== "1") {
          if (!value || String(value).trim() === "")
            return _("This field is required in single port mode");
        }
        return true;
      };

      o = s.option(form.Flag, "open_firewall_port", _("Open Firewall Port"));
      o.modalonly = true;
      o.default = "1";

      o = s.option(
        form.Flag,
        "enable_app_forward",
        _("Enable App Level Forward"),
      );
      o.modalonly = true;
      o.default = "0";

      o = s.option(form.Flag, "reuseaddr", _("Reuse Address"));
      o.modalonly = true;
      o.default = "1";
      o.depends("enable_app_forward", "1");

      o = s.option(
        form.Flag,
        "enable_stats",
        _("Enable Statistics"),
        _(
          "Collect traffic statistics (bytes_in/bytes_out) using zero-cost atomic counters. " +
            "NOTE: Mutually exclusive with firewall forwarding - enabling stats will disable add_firewall_forward.",
        ),
      );
      o.modalonly = true;
      o.default = "0";
      o.depends("enable_app_forward", "1");

      o = s.option(
        form.Flag,
        "add_firewall_forward",
        _("Add Firewall Forward"),
      );
      o.modalonly = true;
      o.default = "1";
      o.depends({ enable_app_forward: "0" });
      o.depends({ enable_app_forward: "1", enable_stats: "0" });
    }
    frp(m);
    return m.render();
  }
}
