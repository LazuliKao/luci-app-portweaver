class FrpNodeSelector extends L.form.Value {
  private hiddenInput?: HTMLInputElement;
  renderWidget(
    section_id: string,
    _option_index: number,
    cfgvalue: string[] | string,
  ) {
    const frp_sections = L.uci.sections("portweaver", "frp_node") || [];
    const current_value: string[] = Array.isArray(cfgvalue)
      ? (cfgvalue as string[])
      : typeof cfgvalue === "string"
        ? String(cfgvalue).split(/\s+/).filter(Boolean)
        : [];
    const node_map: Record<string, string> = {};
    for (let i = 0; i < current_value.length; i++) {
      const parts = current_value[i].split(":");
      const node = parts[0];
      const port = parts[1] || "";
      node_map[node] = port;
    }
    const widget_id = this.cbid(section_id);
    // 存储所有元素引用
    const checkboxes: HTMLInputElement[] = [];
    const portInputs: Map<string, HTMLInputElement> = new Map();
    let hiddenInput: HTMLInputElement;
    const updateHandler = () => {
      const values: string[] = [];
      for (let j = 0; j < checkboxes.length; j++) {
        const cb = checkboxes[j];
        if (cb.checked) {
          const node = cb.getAttribute("data-node") as string;
          const port_inp = portInputs.get(node);
          const port = port_inp ? port_inp.value.trim() : "";
          if (port) {
            const p = parseInt(port, 10);
            if (Number.isNaN(p) || p < 1 || p > 65535) {
              if (port_inp)
                port_inp.style.setProperty("border-color", "red", "important");
            } else {
              if (port_inp) port_inp.style.borderColor = "";
            }
            values.push(`${node}:${port}`);
          } else {
            values.push(node);
          }
        }
      }
      hiddenInput.value = values.join(" ");
    };
    const container = (<div class="cbi-value-field"></div>) as HTMLElement;
    if (frp_sections.length === 0) {
      const emptyMsg = _(
        "No FRP nodes configured. Please add FRP nodes first.",
      );
      container.appendChild(<em style="color: #999;">{emptyMsg}</em>);
    } else {
      const table = (
        <table class="table" style="margin: 0; width: auto;"></table>
      ) as HTMLElement;
      for (let i = 0; i < frp_sections.length; i++) {
        const node_name = String(
          frp_sections[i].name || frp_sections[i][".name"],
        );
        if (!node_name) continue;
        const is_checked = Object.hasOwn(node_map, node_name);
        const port_value = node_map[node_name] || "";
        const checkbox = (
          <input
            type="checkbox"
            class="frp-node-checkbox"
            data-widget-id={widget_id}
            data-node={node_name}
            data-section={section_id}
            checked={is_checked}
            style="margin-right: 8px;"
          />
        ) as HTMLInputElement;
        const port_input = (
          <input
            type="text"
            class="frp-node-port"
            data-widget-id={widget_id}
            data-node={node_name}
            data-section={section_id}
            value={port_value}
            placeholder={_("default port")}
            style="min-width: 100px !important; width: calc(100% - 80px) !important; margin-left: 10px;"
            disabled={!is_checked}
          />
        ) as HTMLInputElement;
        // 存储元素引用
        checkboxes.push(checkbox);
        portInputs.set(node_name, port_input);
        const port_input_area = (
          <td
            style={`padding: 4px 8px; border: none;${is_checked ? "" : "display: none;"}`}
          >
            <span style="margin-right: 5px; color: #666;">{_("Port:")}</span>
            {port_input}
          </td>
        );
        checkbox.addEventListener("change", (ev) => {
          const element = ev.currentTarget as HTMLInputElement;
          port_input.disabled = !element.checked;
          port_input_area.style.display = element.checked ? "" : "none";
          if (!element.checked) port_input.value = "";
          updateHandler();
        });
        port_input.addEventListener("input", updateHandler);
        port_input.addEventListener("change", updateHandler);
        const row = (
          <tr>
            <td style="padding: 4px 8px; border: none;">
              {checkbox}
              <span style="cursor: pointer; font-weight: normal; margin: 0;">
                {node_name}
              </span>
            </td>
            {port_input_area}
          </tr>
        );
        // const row = E("tr", {}, [
        //   E("td", { style: "padding: 4px 8px; border: none;" }, [
        //     checkbox,
        //     E(
        //       "label",
        //       {
        //         style: "cursor: pointer; font-weight: normal; margin: 0;",
        //       },
        //       node_name,
        //     ),
        //   ]),
        //   port_input_area,
        // ]);
        table.appendChild(row);
      }
      container.appendChild(table);
    }
    hiddenInput = (
      <input
        type="hidden"
        id={widget_id}
        name={widget_id}
        value={current_value.join(" ")}
      />
    ) as HTMLInputElement;
    container.appendChild(hiddenInput);
    // 存储 hiddenInput 引用供 formvalue 方法使用
    this.hiddenInput = hiddenInput;
    const description = (
      <div class="cbi-value-description">
        {_(
          "Select FRP nodes and optionally specify custom ports. Leave port empty to use default.",
        )}
      </div>
    ) as HTMLElement;
    container.appendChild(description);
    return container;
  }
  cfgvalue(section_id: string) {
    const value = L.uci.get("portweaver", section_id, "frp_nodes");
    if (Array.isArray(value)) return value;
    if (typeof value === "string")
      return String(value).split(/\s+/).filter(Boolean);
    return [];
  }
  isChanged(section_id: string) {
    let cfg = this.cfgvalue(section_id);
    let form = this.formvalue(section_id);
    if (!Array.isArray(cfg)) cfg = [];
    if (!Array.isArray(form)) form = [];
    if (cfg.length !== form.length) return true;
    for (let i = 0; i < cfg.length; i++) {
      if (cfg[i] !== form[i]) return true;
    }
    return false;
  }
  formvalue(_section_id: string) {
    if (this.hiddenInput) {
      const result = this.hiddenInput.value.split(/\s+/).filter(Boolean);
      return result.length > 0 ? result : [];
    }
    return [];
  }
  write(section_id: string, formvalue: string[] | string) {
    if (formvalue && formvalue.length > 0) {
      return L.uci.set("portweaver", section_id, "frp_nodes", formvalue);
    } else {
      return L.uci.unset("portweaver", section_id, "frp_nodes");
    }
  }
  validate(section_id: string, value: any) {
    // 验证值的格式：应该是空或空格分隔的 "node:port" 对
    if (!value) {
      this.validationError = "";
      this.isValidFlag = true;
      return;
    }

    const valueStr = Array.isArray(value) ? value.join(" ") : String(value);
    const parts = valueStr.split(/\s+/).filter(Boolean);

    for (const part of parts) {
      const [node, port] = part.split(":");

      // 检查节点名称是否为空
      if (!node) {
        this.validationError = _("Invalid FRP node format");
        this.isValidFlag = false;
        return;
      }

      // 如果指定了端口，验证端口号
      if (port) {
        const portNum = parseInt(port, 10);
        if (Number.isNaN(portNum) || portNum < 1 || portNum > 65535) {
          this.validationError = _("Port must be a number between 1 and 65535");
          this.isValidFlag = false;
          return;
        }
      }
    }

    this.validationError = "";
    this.isValidFlag = true;
  }

  isValid(section_id: string): boolean {
    const value = this.formvalue(section_id);
    this.validate(section_id, value);
    return this.isValidFlag ?? true;
  }

  getValidationError(section_id: string): string {
    if (!this.isValid(section_id)) {
      return this.validationError || _("Validation failed");
    }
    return "";
  }

  private validationError: string = "";
  private isValidFlag: boolean = true;
}
export default FrpNodeSelector;
