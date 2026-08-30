export type PortMapping = {
  listenPort: string;
  targetPort: string;
  frpNodes: string[];
  protocol: string;
};

export function parse(value: string): PortMapping | null {
  if (!value || typeof value !== "string") return null;

  let remaining = value.trim();
  const mapping: PortMapping = {
    listenPort: "",
    targetPort: "",
    frpNodes: [],
    protocol: "tcp",
  };
  const protocolMatch = remaining.match(/\/([a-z]+)$/);
  if (protocolMatch) {
    mapping.protocol = protocolMatch[1].toLowerCase();
    remaining = remaining.substring(0, protocolMatch.index);
  }

  let index = 0;
  while (remaining[index] === "[") {
    const end = remaining.indexOf("]", index);
    if (end === -1) break;

    const content = remaining.substring(index + 1, end);
    if (content.includes(":") || /[a-zA-Z_-]/.test(content)) {
      mapping.frpNodes.push(content);
      index = end + 1;
      continue;
    }
    if (/^\d+(?:-\d+)?$/.test(content)) {
      mapping.listenPort = content;
      index = end + 1;
    }
    break;
  }

  const portPart = remaining.substring(index);
  if (!mapping.listenPort) {
    const [listenPort, targetPort] = portPart.split(":");
    mapping.listenPort = listenPort?.trim().replace(/[[\]]/g, "") || "";
    mapping.targetPort = targetPort?.trim().replace(/[[\]]/g, "") || "";
  } else if (portPart.startsWith(":")) {
    mapping.targetPort = portPart.substring(1).trim().replace(/[[\]]/g, "");
  }

  return normalize(mapping);
}

export function normalize(mapping: PortMapping): PortMapping {
  // An omitted target port forwards to the matching listen port.
  return mapping.listenPort && !mapping.targetPort
    ? { ...mapping, targetPort: mapping.listenPort }
    : mapping;
}

export function build(mapping: PortMapping): string {
  let result = "";
  for (const node of mapping.frpNodes) result += `[${node}]`;
  if (mapping.listenPort) {
    result +=
      mapping.frpNodes.length > 0
        ? `[${mapping.listenPort}]`
        : mapping.listenPort;
  }
  if (mapping.targetPort && mapping.targetPort !== mapping.listenPort)
    result += `:${mapping.targetPort}`;
  if (mapping.protocol) result += `/${mapping.protocol}`;
  return result;
}

export function validate(mapping: PortMapping): string {
  if (!mapping.listenPort && !mapping.targetPort && !mapping.frpNodes.length)
    return "";

  const normalizedMapping = normalize(mapping);
  if (!normalizedMapping.listenPort) return _("Listen port is required");
  if (!isPortOrRange(normalizedMapping.listenPort))
    return _(
      "Invalid listen port format. Use port (8080) or range (8080-8090)",
    );
  if (!normalizedMapping.targetPort) return _("Target port is required");
  if (!isPortOrRange(normalizedMapping.targetPort))
    return _("Invalid target port format. Use port (80) or range (80-90)");

  if (
    portRangeSize(normalizedMapping.listenPort) !==
    portRangeSize(normalizedMapping.targetPort)
  )
    return _("Listen port range and target port range must have the same size");

  for (const nodeValue of normalizedMapping.frpNodes) {
    const [node, port] = nodeValue.split(":");
    if (!node) return _("Invalid FRP node format");
    if (port) {
      const portNumber = parseInt(port, 10);
      if (Number.isNaN(portNumber) || portNumber < 1 || portNumber > 65535)
        return _("FRP node port must be between 1 and 65535");
    }
  }

  if (!["tcp", "udp", "both"].includes(normalizedMapping.protocol))
    return _("Protocol must be `tcp`, `udp`, or `both`");

  return "";
}

export function isPortOrRange(value: string): boolean {
  if (/^\d+$/.test(value)) {
    const port = parseInt(value, 10);
    return port >= 1 && port <= 65535;
  }
  if (/^\d+-\d+$/.test(value)) {
    const [start, end] = value.split("-").map((part) => parseInt(part, 10));
    return (
      start >= 1 && start <= 65535 && end >= 1 && end <= 65535 && start <= end
    );
  }
  return false;
}

function portRangeSize(value: string): number {
  if (/^\d+$/.test(value)) return 1;
  const [start, end] = value.split("-").map((part) => parseInt(part, 10));
  return end - start + 1;
}
