import { rpcClient } from "./client";
import type { DdnsStatus } from "../types/portweaver";

const form = L.form;
const uci = L.uci;
const ui = L.ui;

const DNS_PROVIDERS = [
  { value: "cloudflare", label: "Cloudflare" },
  { value: "alidns", label: "Alibaba Cloud DNS" },
  { value: "tencentcloud", label: "Tencent Cloud DNS" },
  { value: "dnspod", label: "DNSPod" },
  { value: "huaweicloud", label: "Huawei Cloud DNS" },
  { value: "godaddy", label: "GoDaddy" },
  { value: "namecheap", label: "Namecheap" },
  { value: "namesilo", label: "NameSilo" },
  { value: "cloudns", label: "ClouDNS" },
  { value: "he", label: "Hurricane Electric" },
];

const GET_TYPES = [
  { value: "url", label: _("URL") },
  { value: "net_interface", label: _("Network Interface") },
  { value: "cmd", label: _("Command") },
];

const TTL_OPTIONS = [
  { value: "60", label: "1 " + _("minute") },
  { value: "300", label: "5 " + _("minutes") },
  { value: "600", label: "10 " + _("minutes") },
  { value: "1800", label: "30 " + _("minutes") },
  { value: "3600", label: "1 " + _("hour") },
  { value: "7200", label: "2 " + _("hours") },
  { value: "14400", label: "4 " + _("hours") },
  { value: "43200", label: "12 " + _("hours") },
  { value: "86400", label: "24 " + _("hours") },
];

const ddnsStatuses: Record<string, DdnsStatus> = {};
const statusElements: Record<string, HTMLElement> = {};

export default function (
  _m: LuCI.form.CBIMap,
  s: LuCI.form.CBIAbstractSection,
  tab_id: string,
) {
  let o: LuCI.form.CBIAbstractValue;

  o = s.taboption(
    tab_id,
    form.SectionValue,
    "_ddns_configs",
    form.GridSection,
    "ddns",
  );

  const ss = o.subsection;
  ss.anonymous = true;
  ss.addremove = true;
  ss.sortable = true;

  ss.sectiontitle = (section_id: string) =>
    uci.get("portweaver", section_id, "name") || _("Unnamed DDNS");

  o = ss.option(form.DummyValue, "_status", _("Status"));
  o.modalonly = false;
  o.textvalue = (section_id: string) => {
    const status = ddnsStatuses[section_id] || {
      status: "unknown",
      name: "",
      provider: "",
      section: section_id,
    };

    const statusColors: Record<string, string> = {
      success: "#4CAF50",
      updating: "#FFC107",
      error: "#F44336",
      disabled: "#9E9E9E",
      unknown: "#9E9E9E",
    };

    const statusLabels: Record<string, string> = {
      success: _("Success"),
      updating: _("Updating"),
      error: _("Error"),
      disabled: _("Disabled"),
      unknown: _("Unknown"),
    };

    const statusColor = statusColors[status.status] || statusColors.unknown;
    const statusText = statusLabels[status.status] || status.status;

    const indicator = (
      <span
        style={`display:inline-block; width:12px; height:12px; border-radius:50%; background-color:${statusColor}; margin-right:8px;`}
      ></span>
    ) as HTMLElement;

    const textSpan = (<span>{statusText}</span>) as HTMLElement;

    const container = (
      <div style="display:flex; flex-direction:column; gap:4px;"></div>
    ) as HTMLElement;

    const statusRow = (
      <div style="display:flex; align-items:center;"></div>
    ) as HTMLElement;
    statusRow.appendChild(indicator);
    statusRow.appendChild(textSpan);
    container.appendChild(statusRow);

    if (status.last_ip) {
      const ipInfo = (
        <small style="color:#666;">
          {_("IP: ")}
          <code>{status.last_ip}</code>
        </small>
      ) as HTMLElement;
      container.appendChild(ipInfo);
    }

    if (status.last_update) {
      const updateInfo = (
        <small style="color:#666;">
          {_("Updated: ")}
          {status.last_update}
        </small>
      ) as HTMLElement;
      container.appendChild(updateInfo);
    }

    if (status.message && status.status === "error") {
      const errorMsg = (
        <small style="color:#F44336;" title={status.message}>
          {status.message.length > 40
            ? status.message.substring(0, 37) + "..."
            : status.message}
        </small>
      ) as HTMLElement;
      container.appendChild(errorMsg);
    }

    statusElements[section_id] = container;
    return container;
  };

  o = ss.option(form.DummyValue, "_provider", _("Provider"));
  o.modalonly = false;
  o.textvalue = (section_id: string) => {
    const provider = uci.get("portweaver", section_id, "dns_provider") || "";
    const providerObj = DNS_PROVIDERS.find((p) => p.value === provider);
    return providerObj ? providerObj.label : provider || "-";
  };

  o = ss.option(form.DummyValue, "_domains", _("Domains"));
  o.modalonly = false;
  o.textvalue = (section_id: string) => {
    const ipv4Domains = uci.get("portweaver", section_id, "ipv4_domains") || "";
    const ipv6Domains = uci.get("portweaver", section_id, "ipv6_domains") || "";
    const domains = [ipv4Domains, ipv6Domains]
      .filter(Boolean)
      .join(", ")
      .split(/[,\s]+/)
      .filter(Boolean);
    return domains.length > 0 ? domains.slice(0, 3).join(", ") : "-";
  };

  o = ss.option(form.Value, "name", _("Configuration Name"));
  o.modalonly = true;
  o.rmempty = false;
  o.datatype = "string";
  o.placeholder = "home";
  o.validate = (_section_id: string, value: string) => {
    if (!value || String(value).trim() === "")
      return _("Configuration name is required");
    return true;
  };

  o = ss.option(form.ListValue, "dns_provider", _("DNS Provider"));
  o.modalonly = true;
  o.rmempty = false;
  for (const provider of DNS_PROVIDERS) {
    o.value(provider.value, provider.label);
  }
  o.default = "cloudflare";

  o = ss.option(form.Value, "dns_id", _("DNS ID / API Key"));
  o.modalonly = true;
  o.rmempty = true;
  o.placeholder = "API Key or Account ID";
  o.description = _(
    "API Key, Account ID, or Access Key depending on provider",
  );

  o = ss.option(form.Value, "dns_secret", _("DNS Secret / Token"));
  o.modalonly = true;
  o.password = true;
  o.rmempty = true;
  o.placeholder = "API Token or Secret Key";
  o.description = _("API Token, Secret Key, or Password depending on provider");

  o = ss.option(form.Value, "dns_ext_param", _("Extended Parameters"));
  o.modalonly = true;
  o.rmempty = true;
  o.placeholder = "zone_id or additional parameters";
  o.description = _("Additional provider-specific parameters (e.g., Zone ID)");

  o = ss.option(form.ListValue, "ttl", _("TTL (Time To Live)"));
  o.modalonly = true;
  o.rmempty = true;
  o.default = "3600";
  for (const ttl of TTL_OPTIONS) {
    o.value(ttl.value, ttl.label);
  }

  o = ss.option(form.Flag, "ipv4_enable", _("Enable IPv4"));
  o.modalonly = true;
  o.default = "1";

  o = ss.option(form.ListValue, "ipv4_get_type", _("IPv4 Get Method"));
  o.modalonly = true;
  o.depends("ipv4_enable", "1");
  o.default = "url";
  for (const type of GET_TYPES) {
    o.value(type.value, type.label);
  }

  o = ss.option(form.Value, "ipv4_url", _("IPv4 URL"));
  o.modalonly = true;
  o.depends({ ipv4_enable: "1", ipv4_get_type: "url" });
  o.placeholder = "https://api.ipify.org";
  o.datatype = "string";

  o = ss.option(form.Value, "ipv4_net_interface", _("IPv4 Network Interface"));
  o.modalonly = true;
  o.depends({ ipv4_enable: "1", ipv4_get_type: "net_interface" });
  o.placeholder = "eth0";
  o.datatype = "string";

  o = ss.option(form.Value, "ipv4_cmd", _("IPv4 Command"));
  o.modalonly = true;
  o.depends({ ipv4_enable: "1", ipv4_get_type: "cmd" });
  o.placeholder = "curl -s https://api.ipify.org";
  o.datatype = "string";

  o = ss.option(form.TextValue, "ipv4_domains", _("IPv4 Domains"));
  o.modalonly = true;
  o.depends("ipv4_enable", "1");
  o.rows = 3;
  o.placeholder = "example.com\nwww.example.com";
  o.description = _("One domain per line or comma-separated");

  o = ss.option(form.Flag, "ipv6_enable", _("Enable IPv6"));
  o.modalonly = true;
  o.default = "0";

  o = ss.option(form.ListValue, "ipv6_get_type", _("IPv6 Get Method"));
  o.modalonly = true;
  o.depends("ipv6_enable", "1");
  o.default = "url";
  for (const type of GET_TYPES) {
    o.value(type.value, type.label);
  }

  o = ss.option(form.Value, "ipv6_url", _("IPv6 URL"));
  o.modalonly = true;
  o.depends({ ipv6_enable: "1", ipv6_get_type: "url" });
  o.placeholder = "https://api6.ipify.org";
  o.datatype = "string";

  o = ss.option(form.Value, "ipv6_net_interface", _("IPv6 Network Interface"));
  o.modalonly = true;
  o.depends({ ipv6_enable: "1", ipv6_get_type: "net_interface" });
  o.placeholder = "eth0";
  o.datatype = "string";

  o = ss.option(form.Value, "ipv6_cmd", _("IPv6 Command"));
  o.modalonly = true;
  o.depends({ ipv6_enable: "1", ipv6_get_type: "cmd" });
  o.placeholder = "curl -s https://api6.ipify.org";
  o.datatype = "string";

  o = ss.option(form.Value, "ipv6_reg", _("IPv6 Regex"));
  o.modalonly = true;
  o.depends("ipv6_enable", "1");
  o.rmempty = true;
  o.placeholder = "([0-9a-fA-F:]+)";
  o.description = _("Regular expression to extract IPv6 address from output");

  o = ss.option(form.TextValue, "ipv6_domains", _("IPv6 Domains"));
  o.modalonly = true;
  o.depends("ipv6_enable", "1");
  o.rows = 3;
  o.placeholder = "example.com\nwww.example.com";
  o.description = _("One domain per line or comma-separated");

  o = ss.option(form.Value, "webhook_url", _("Webhook URL"));
  o.modalonly = true;
  o.rmempty = true;
  o.placeholder = "https://example.com/webhook";
  o.description = _("Optional webhook to call after successful update");

  o = ss.option(form.TextValue, "webhook_body", _("Webhook Body"));
  o.modalonly = true;
  o.rmempty = true;
  o.rows = 3;
  o.placeholder = '{"ip": "{{ip}}", "domain": "{{domain}}"}';
  o.description = _("JSON body for webhook (supports {{ip}} and {{domain}})");
  o.depends({ webhook_url: /^.+$/ });

  o = ss.option(form.TextValue, "webhook_headers", _("Webhook Headers"));
  o.modalonly = true;
  o.rmempty = true;
  o.rows = 3;
  o.placeholder = "Authorization: Bearer token\nContent-Type: application/json";
  o.description = _("One header per line (Header: Value)");
  o.depends({ webhook_url: /^.+$/ });

  L.Poll.add(async () => {
    try {
      const result = await rpcClient.getDdnsStatuses();
      const statuses = result?.statuses || [];

      for (const status of statuses) {
        const oldStatus = ddnsStatuses[status.section];
        ddnsStatuses[status.section] = status;

        if (
          !oldStatus ||
          oldStatus.status !== status.status ||
          oldStatus.last_ip !== status.last_ip ||
          oldStatus.last_update !== status.last_update
        ) {
          const container = statusElements[status.section];
          if (container) {
            const statusColors: Record<string, string> = {
              success: "#4CAF50",
              updating: "#FFC107",
              error: "#F44336",
              disabled: "#9E9E9E",
              unknown: "#9E9E9E",
            };

            const statusLabels: Record<string, string> = {
              success: _("Success"),
              updating: _("Updating"),
              error: _("Error"),
              disabled: _("Disabled"),
              unknown: _("Unknown"),
            };

            const statusColor =
              statusColors[status.status] || statusColors.unknown;
            const statusText = statusLabels[status.status] || status.status;

            container.innerHTML = "";

            const statusRow = (
              <div style="display:flex; align-items:center;"></div>
            ) as HTMLElement;

            const indicator = (
              <span
                style={`display:inline-block; width:12px; height:12px; border-radius:50%; background-color:${statusColor}; margin-right:8px;`}
              ></span>
            ) as HTMLElement;

            const textSpan = (<span>{statusText}</span>) as HTMLElement;

            statusRow.appendChild(indicator);
            statusRow.appendChild(textSpan);
            container.appendChild(statusRow);

            if (status.last_ip) {
              const ipInfo = (
                <small style="color:#666;">
                  {_("IP: ")}
                  <code>{status.last_ip}</code>
                </small>
              ) as HTMLElement;
              container.appendChild(ipInfo);
            }

            if (status.last_update) {
              const updateInfo = (
                <small style="color:#666;">
                  {_("Updated: ")}
                  {status.last_update}
                </small>
              ) as HTMLElement;
              container.appendChild(updateInfo);
            }

            if (status.message && status.status === "error") {
              const errorMsg = (
                <small style="color:#F44336;" title={status.message}>
                  {status.message.length > 40
                    ? status.message.substring(0, 37) + "..."
                    : status.message}
                </small>
              ) as HTMLElement;
              container.appendChild(errorMsg);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Failed to fetch DDNS statuses:", err);
    }
  }, 5);
}
