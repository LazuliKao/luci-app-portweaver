import "./utils/jsx-factory";
import { Client, rpcClient } from "./modules/client";
import type { PortWeaverStatus, ProjectStatus } from "./types/portweaver";
import frp from "./modules/frp";
import config from "./modules/config";
import header from "./modules/header";

const form = L.form;
const uci = L.uci;
type UnwrapPromise<T> = T extends Promise<infer R> ? R : T;
export class main extends L.view {
  override async load() {
    return Promise.all([
      uci.load("portweaver"),
      uci.load("firewall"),
      rpcClient
        .getStatus()
        .then((res: PortWeaverStatus) => res || {})
        .catch((err: any) => {
          console.warn("ubus get_status failed:", err);
          return {} as PortWeaverStatus;
        }),
      rpcClient
        .listProjects()
        .then((res: { projects: ProjectStatus[] }) => res || { projects: [] })
        .catch((err: any) => {
          console.warn("ubus list_projects failed:", err);
          return { projects: [] } as { projects: ProjectStatus[] };
        }),
    ]);
  }

  override render(data: UnwrapPromise<ReturnType<typeof this.load>>) {
    const m = new form.Map(
      "portweaver",
      _("PortWeaver"),
      _("Port forwarding and NAT traversal configuration"),
    );
    const client = new Client([data[2], data[3]]);
    header(m, client);
    config(m, client);
    frp(m);
    return m.render();
  }
}
