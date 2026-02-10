export interface FrpProxyStats {
  proxies: FrpProxy[];
}

export interface FrpProxy {
  name: string;
  type: string;
  // frp: client/proxy/proxy_wrapper.go
  status:
    | "new"
    | "wait start"
    | "start error"
    | "running"
    | "check failed"
    | "closed"
    | "error";
  err: string;
  cfg: FrpConfig;
  remote_addr: string;
}

export interface FrpConfig {
  name: string;
  type: string;
  transport: FrpTransport;
  loadBalancer: FrpLoadBalancer;
  healthCheck: FrpHealthCheck;
  localIP: string;
  localPort: number;
  plugin: null;
  remotePort: number;
}

export interface FrpHealthCheck {
  type: string;
  intervalSeconds: number;
}

export interface FrpLoadBalancer {
  group: string;
}

export interface FrpTransport {
  useEncryption: boolean;
  useCompression: boolean;
  bandwidthLimit: string;
}
