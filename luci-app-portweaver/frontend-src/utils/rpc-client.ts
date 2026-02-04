import type {
  PortWeaverStatus,
  ProjectStatus,
  FrpStatus,
  EventsResponse,
  DdnsGlobalStatus,
} from "../types/portweaver";
import type { InfoResponse } from "./../types/portweaver/index";
import type { DdnsStatusResponse } from "../types/portweaver/ddns";
import type { FrpProxyStats } from "../types/portweaver/frp";

export function createRpcClient(rpc: typeof L.rpc) {
  const getStatus = rpc.declare<PortWeaverStatus>({
    object: "portweaver",
    method: "get_status",
  });

  const listProjects = rpc.declare<{ projects: ProjectStatus[] }>({
    object: "portweaver",
    method: "list_projects",
  });

  const setEnabled = rpc.declare<void, [id: number, enabled: boolean]>({
    object: "portweaver",
    method: "set_enabled",
    params: ["id", "enabled"],
  });

  const getFrpStatus = rpc.declare<FrpStatus>({
    object: "portweaver",
    method: "get_frp_status",
  });
  const getFrpInfo = rpc.declare<InfoResponse, [id: string]>({
    object: "portweaver",
    method: "get_frp_info",
    params: ["id"],
  });

  const clearFrpLogs = rpc.declare<void, [id: string]>({
    object: "portweaver",
    method: "clear_frp_logs",
    params: ["id"],
  });

  const getFrpProxyStats = rpc.declare<FrpProxyStats, [id: string]>({
    object: "portweaver",
    method: "get_frp_proxy_stats",
    params: ["id"],
  });

  const getEvents = rpc.declare<EventsResponse>({
    object: "portweaver",
    method: "get_events",
  });

  const getDdnsStatus = rpc.declare<DdnsStatusResponse>({
    object: "portweaver",
    method: "get_ddns_status",
  });

  const getDdnsInfo = rpc.declare<InfoResponse, [name: string]>({
    object: "portweaver",
    method: "get_ddns_info",
    params: ["name"],
  });

  const getDdnsGlobalStatus = rpc.declare<DdnsGlobalStatus>({
    object: "portweaver",
    method: "get_ddns_global_status",
  });

  const clearDdnsLogs = rpc.declare<void, [name: string]>({
    object: "portweaver",
    method: "clear_ddns_logs",
    params: ["name"],
  });

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
    getDdnsGlobalStatus,
    clearDdnsLogs,
  };
}

export type RpcClient = ReturnType<typeof createRpcClient>;
export const rpcClient = createRpcClient(L.rpc);
