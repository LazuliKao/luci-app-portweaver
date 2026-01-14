/**
 * LuCI TypeScript definitions
 * These types represent the LuCI framework APIs used in views
 */

declare namespace LuCI {
  namespace uci {
    interface SectionObject {
      [x: string]: string | number | boolean | string[];
      '.anonymous'?: boolean;
      '.index'?: number;
      '.name'?: string;
      '.type'?: string;
      '.create'?: string;
    };
  }
  interface View {
    load(): Promise<any>;
    render?(data?: any): HTMLElement;
    handleSave?(): Promise<void>;
    handleSaveApply?(): Promise<void>;
    handleReset?(): Promise<void>;
    extend(proto: Partial<View>): View;
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
    GridSection: any;
    DummyValue: any;
  }

  interface UI {
    addNotification(title?: string | null, message: string | HTMLElement, type?: 'info' | 'warning' | 'error'): void;
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
    sections(config: string, type?: string): Array<LuCI.uci.SectionObject>;
  }
  interface POLL {
    add(fn: () => Promise<any> | any, interval?: number): void;
  }
}

// Global LuCI objects available via LuCI 'require' lines
declare const L: {
  view: LuCI.View;
  form: LuCI.Form;
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
declare function _(text: string, ...args: any[]): string;

declare const widgets: any;
declare const fwmodel: { getZoneColorStyle(zone: string): string };