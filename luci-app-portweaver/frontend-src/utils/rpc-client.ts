import type {
  PortWeaverStatus,
  ProjectStatus,
  FrpStatus,
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
  }) as (id: string) => Promise<{ status: string; last_error: string; logs: string[] }>;

  const clearFrpLogs = rpc.declare({
    object: "portweaver",
    method: "clear_frp_logs",
    params: ["id"],
    expect: {},
  }) as (id: string) => Promise<any>;

  return { getStatus, listProjects, setEnabled, getFrpStatus, getFrpInfo, clearFrpLogs };
}
