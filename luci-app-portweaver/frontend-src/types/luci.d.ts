/**
 * LuCI TypeScript definitions
 * These types represent the LuCI framework APIs used in views
 */

declare namespace LuCI {
  namespace uci {
    interface SectionObject {
      [x: string]: string | number | boolean | string[];
      ".anonymous"?: boolean;
      ".index"?: number;
      ".name"?: string;
      ".type"?: string;
      ".create"?: string;
    }
  }
  declare class View<T extends {} = any> {
    load(): Promise<T>;
    render?(data?: T): Promise<Node> | Node;
    handleSave?(): Promise<void>;
    handleSaveApply?(): Promise<void>;
    handleReset?(): Promise<void>;
  }
  interface FS {
    write(path: string, content: string): Promise<void>;
    read_direct(path: string, format?: "text" | "json" | "blob"): Promise<any>;
    exec(
      command: string,
      args?: string[],
    ): Promise<{ stdout: string; stderr: string }>;
  }
  interface Form {
    Value: typeof LuCI.form.CBIValue;
    TextValue: typeof LuCI.form.CBIValue;
    SectionValue: typeof LuCI.form.CBIValue;
    NamedSection: typeof LuCI.form.CBIValue;
    TypedSection: typeof LuCI.form.CBIValue;
    Flag: typeof LuCI.form.CBIValue;
    ListValue: typeof LuCI.form.CBIValue;
    DynamicList: typeof LuCI.form.CBIValue;
    Button: typeof LuCI.form.CBIValue;
    GridSection: typeof LuCI.form.CBIValue;
    DummyValue: typeof LuCI.form.CBIValue;
    Map: typeof LuCI.form.CBIMap;
  }

  interface UI {
    addNotification(
      title?: string | null,
      message: string | HTMLElement,
      type?: "info" | "warning" | "error",
    ): void;
    showModal(title: string, content: HTMLElement | string): void;
    hideModal(): void;
  }

  interface RPC {
    declare(options: {
      object: string;
      method: string;
      params?: string[];
      expect?: any;
    }): (...args: any[]) => Promise<any>;
  }

  interface UCI {
    load(config: string): Promise<void>;
    get(config: string, section: string, option?: string): any;
    set(config: string, section: string, option: string, value: any): void;
    unset(config: string, section: string, option?: string): void;
    add(config: string, type: string, name?: string): string;
    remove(config: string, section: string): void;
    save(): Promise<void>;
    apply(): Promise<void>;
    sections(config: string, type?: string): Array<LuCI.uci.SectionObject>;
  }
  interface POLL {
    add(fn: () => Promise<any> | any, interval?: number): void;
  }
}

// Global LuCI objects available via LuCI 'require' lines
declare const L: {
  view: typeof LuCI.View & {
    extend<TN>(proto: Partial<View<TN>>): View<TN>;
  };
  form: LuCI.Form;
  fs: LuCI.FS;
  ui: LuCI.UI;
  rpc: LuCI.RPC;
  uci: LuCI.UCI;
  Poll: LuCI.POLL;
  toArray<T>(array: any): Array<T>;

  Class: {
    extend(proto: any): any;
  };
};

declare const E: (...args: any[]) => HTMLElement;

// i18n translate function
declare function _(
  text: string,
  ...args: any[]
): string & { format(...args: any[]): string };

declare const widgets: any;
declare const fwmodel: { getZoneColorStyle(zone: string): string };
