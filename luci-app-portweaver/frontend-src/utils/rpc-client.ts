import type { PortWeaverStatus, ProjectStatus } from "../types/portweaver";

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

  return { getStatus, listProjects, setEnabled };
}
