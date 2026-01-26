export interface PortWeaverStatus {
  status?: "running" | "stopped" | "degraded" | string;
  total_projects?: number;
  active_ports?: number;
  uptime?: number;
  total_bytes_in?: number;
  total_bytes_out?: number;
}

export interface ProjectStatus {
  enabled: boolean;
  status: string;
  startup_status?: string;
  error_code?: number;
  active_ports?: number;
  bytes_in?: number;
  bytes_out?: number;
}

export interface FrpStatus {
  frp_enabled: boolean;
  frp_version?: string;
}

export interface PortMapping {
  listenPort: string;
  targetPort: string;
  frpNodes: string[];
  protocol: "tcp" | "udp" | "both";
}
