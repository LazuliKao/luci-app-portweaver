export interface PortWeaverStatus {
  status?: "running" | "stopped" | "degraded" | string;
  total_projects?: number;
  active_ports?: number;
  uptime?: number;
  total_bytes_in?: number;
  total_bytes_out?: number;
}

/** Statistics for a single forwarder (port) */
export interface ForwarderStats {
  protocol: string;
  local_port: number;
  bytes_in: number;
  bytes_out: number;
}

export interface ProjectStatus {
  id?: number;
  remark?: string;
  enabled: boolean;
  status: string;
  startup_status?: string;
  error_code?: number;
  active_ports?: number;
  bytes_in?: number;
  bytes_out?: number;
  /** Per-port statistics */
  forwarders?: ForwarderStats[];
}

export interface FrpStatus {
  frp_enabled: boolean;
  frp_version?: string;
  /** Current FRP client status: connected, connecting, error, stopped */
  frp_status?: string;
  /** Last error message from FRP client */
  last_error?: string;
  /** Number of active FRP clients */
  client_count?: number;
}

/** Full FRP proxy status including all available fields */
export interface FrpProxyStats {
  name: string;
  type: string;
  status: string;
  err: string;
  remote_addr: string;
  cfg: {
    name: string;
    type: string;
    local_ip: string;
    local_port: number;
    remote_port: number;
    use_encryption: boolean;
    use_compression: boolean;
    bandwidth_limit: string;
    [key: string]: any;
  };
}

/** Response containing all proxies for a client */
export interface FrpClientStats {
  proxies: FrpProxyStats[];
}

/** A single event in the activity log */
export interface ActivityEvent {
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Event type: project_started, project_stopped, frp_error, etc. */
  type: string;
  /** Event message */
  message: string;
  /** Project ID (-1 if not applicable) */
  project_id: number;
}

/** Response from get_events API */
export interface EventsResponse {
  events: ActivityEvent[];
}

export interface PortMapping {
  listenPort: string;
  targetPort: string;
  frpNodes: string[];
  protocol: "tcp" | "udp" | "both";
}

/** DDNS status for a single configuration */
export interface DdnsStatus {
  section: string;
  name: string;
  provider: string;
  status: "success" | "updating" | "error" | "disabled" | "unknown";
  last_update?: string;
  last_ip?: string;
  message?: string;
}

/** DDNS detailed information including logs */
export interface DdnsInfo {
  status: string;
  last_error: string;
  logs: string[];
}

/** Response from get_ddns_info UBUS endpoint */
export interface DdnsInfoResponse {
  status: string;
  last_error: string;
  logs: string[];
}
