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

export interface FrpcStatus {
  enabled: boolean;
  version?: string;
  status?: string;
  last_error?: string;
  client_count?: number;
}

export interface FrpsStatus {
  enabled: boolean;
  version?: string;
  status?: string;
  last_error?: string;
  client_count?: number;
  proxy_count?: number;
  server_count?: number;
}

export interface FrpStatus {
  frp_enabled?: boolean;
  frp_version?: string;
  frpc?: FrpcStatus;
  frps?: FrpsStatus;
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

export interface DdnsGlobalStatus {
  ddns_enabled: boolean;
  ddns_version: string | null;
}
