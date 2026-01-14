/**
 * LuCI TypeScript definitions
 * These types represent the LuCI framework APIs used in views
 */

declare namespace LuCI {
  interface View {
    load(): Promise<any>;
    render(): HTMLElement;
    handleSave?(): Promise<void>;
    handleSaveApply?(): Promise<void>;
    handleReset?(): Promise<void>;
  }

  interface Form {
    Map: any;
    NamedSection: any;
    TypedSection: any;
    Value: any;
    Flag: any;
    ListValue: any;
    DynamicList: any;
    Button: any;
  }

  interface UI {
    addNotification(title: string, message: string, type?: 'info' | 'warning' | 'error'): void;
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
    add(config: string, type: string, name?: string): string;
    remove(config: string, section: string): void;
    save(): Promise<void>;
    apply(): Promise<void>;
  }
}

// Global LuCI objects available via LuCI 'require' lines
declare const L: {
  view: { new(): LuCI.View };
  form: LuCI.Form;
  ui: LuCI.UI;
  rpc: LuCI.RPC;
  uci: LuCI.UCI;
  Class: {
    extend(proto: any): any;
  };
};

// LuCI view helpers injected in runtime
declare const view: any;
declare const form: any;
declare const ui: LuCI.UI;
declare const uci: LuCI.UCI;
declare const rpc: LuCI.RPC;
declare const poll: { add(fn: () => Promise<any> | any, interval?: number): void };
declare const widgets: any;
declare const fwmodel: { getZoneColorStyle(zone: string): string };
declare const E: (...args: any[]) => HTMLElement;

// i18n translate function
declare function _(text: string, ...args: any[]): string;

export { L, LuCI, _, view, form, ui, uci, rpc, poll, widgets, fwmodel, E };
