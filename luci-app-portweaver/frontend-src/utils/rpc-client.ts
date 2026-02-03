import type {
  PortWeaverStatus,
  ProjectStatus,
  FrpStatus,
  EventsResponse,
  DdnsStatus,
  DdnsInfo,
} from "../types/portweaver";

export function createRpcClient(rpc: any) {
  const getStatus = rpc.declare({
    object: "portweaver",
    method: "get_status",
    expect: {},
  }) as () => Promise<PortWeaverStatus>;

  const listProjects = rpc.declare({
    object: "portweaver",
    method: "list_projects",
    expect: {},
  }) as () => Promise<{ projects: ProjectStatus[] }>;

  const setEnabled = rpc.declare({
    object: "portweaver",
    method: "set_enabled",
    params: ["id", "enabled"],
    expect: {},
  }) as (id: number, enabled: boolean) => Promise<any>;

  const getFrpStatus = rpc.declare({
    object: "portweaver",
    method: "get_frp_status",
    expect: {},
  }) as () => Promise<FrpStatus>;

  const getFrpInfo = rpc.declare({
    object: "portweaver",
    method: "get_frp_info",
    params: ["id"],
    expect: {},
  }) as (
    id: string,
  ) => Promise<{ status: string; last_error: string; logs: string[] }>;

  const clearFrpLogs = rpc.declare({
    object: "portweaver",
    method: "clear_frp_logs",
    params: ["id"],
    expect: {},
  }) as (id: string) => Promise<any>;

  const getFrpProxyStats = rpc.declare({
    object: "portweaver",
    method: "get_frp_proxy_stats",
    params: ["id"],
    expect: {},
  }) as (id: string) => Promise<FrpClientStats>;

  const getEvents = rpc.declare({
    object: "portweaver",
    method: "get_events",
    expect: {},
  }) as () => Promise<EventsResponse>;

  const getDdnsStatus = rpc.declare({
    object: "portweaver",
    method: "get_ddns_status",
    expect: {},
  }) as () => Promise<{ statuses: DdnsStatus[] }>;

  const getDdnsInfo = rpc.declare({
    object: "portweaver",
    method: "get_ddns_info",
    params: ["name"],
    expect: {},
  }) as (name: string) => Promise<DdnsInfo>;

  const clearDdnsLogs = rpc.declare({
    object: "portweaver",
    method: "clear_ddns_logs",
    params: ["name"],
    expect: {},
  }) as (name: string) => Promise<any>;

  return {
    getStatus,
    listProjects,
    setEnabled,
    getFrpStatus,
    getFrpInfo,
    getFrpProxyStats,
    clearFrpLogs,
    getEvents,
    getDdnsStatus,
    getDdnsInfo,
    clearDdnsLogs,
  };
}
