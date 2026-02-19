import type {
  PortWeaverStatus,
  ProjectStatus,
  FrpStatus,
  EventsResponse,
  DdnsGlobalStatus,
} from "../types/portweaver";
import type { InfoResponse } from "./../types/portweaver/index";
import type { DdnsStatusResponse } from "../types/portweaver/ddns";
import type { FrpcProxyStats } from "../types/portweaver/frpc";
import type { FrpsProxyStats } from "../types/portweaver/frps";

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
  const getFrpcInfo = rpc.declare<InfoResponse, [id: string]>({
    object: "portweaver",
    method: "get_frpc_info",
    params: ["id"],
  });

  const clearFrpcLogs = rpc.declare<void, [id: string]>({
    object: "portweaver",
    method: "clear_frpc_logs",
    params: ["id"],
  });

  const getFrpcProxyStats = rpc.declare<FrpcProxyStats, [id: string]>({
    object: "portweaver",
    method: "get_frpc_proxy_stats",
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

  const getFrpsInfo = rpc.declare<InfoResponse, [id: string]>({
    object: "portweaver",
    method: "get_frps_info",
    params: ["id"],
  });

  const clearFrpsLogs = rpc.declare<void, [id: string]>({
    object: "portweaver",
    method: "clear_frps_logs",
    params: ["id"],
  });

  const getFrpsProxyStats = rpc.declare<FrpsProxyStats[], [id: string]>({
    object: "portweaver",
    method: "get_frps_proxy_stats",
    params: ["id"],
  });

  return {
    getStatus,
    listProjects,
    setEnabled,
    getFrpStatus,
    getFrpcInfo,
    getFrpcProxyStats,
    clearFrpcLogs,
    getEvents,
    getDdnsStatus,
    getDdnsInfo,
    getDdnsGlobalStatus,
    clearDdnsLogs,
    getFrpsInfo,
    clearFrpsLogs,
    getFrpsProxyStats,
  };
}

export type RpcClient = ReturnType<typeof createRpcClient>;
export const rpcClient = createRpcClient(L.rpc);
