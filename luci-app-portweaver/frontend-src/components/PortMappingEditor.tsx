import { createFrpNodeSelector } from "./FrpNodeSelector";
class PortMappingEditor extends L.form.Value {
  private hiddenInput?: HTMLInputElement;
  parseMapping(str: string) {
    if (!str || typeof str !== "string") return null;
    str = str.trim();
    const mapping = {
      listenPort: "",
      targetPort: "",
      frpNodes: [],
      protocol: "tcp",
    } as {
      listenPort: string;
      targetPort: string;
      frpNodes: string[];
      protocol: "tcp" | "udp" | "both";
    };
    const protocolMatch = str.match(/\/([a-z]+)$/);
    if (protocolMatch) {
      mapping.protocol = protocolMatch[1].toLowerCase() as any;
      str = str.substring(0, protocolMatch.index);
    }
    let i = 0;
    while (str[i] === "[") {
      const end = str.indexOf("]", i);
      if (end === -1) break;
      const content = str.substring(i + 1, end);
      if (content.indexOf(":") !== -1 || /[a-zA-Z_-]/.test(content)) {
        (mapping.frpNodes as string[]).push(content);
        i = end + 1;
        continue;
      }
      if (content.match(/^\d+(?:-\d+)?$/)) {
        mapping.listenPort = content;
        i = end + 1;
        break;
      }
      break;
    }
    const rest = str.substring(i);
    if (!mapping.listenPort) {
      const parts0 = rest.split(":");
      if (parts0.length >= 1)
        mapping.listenPort = parts0[0].trim().replace(/[[\]]/g, "");
      if (parts0.length >= 2)
        mapping.targetPort = parts0[1].trim().replace(/[[\]]/g, "");
    } else {
      if (rest.startsWith(":")) {
        mapping.targetPort = rest.substring(1).trim().replace(/[[\]]/g, "");
      }
    }
    return mapping;
  }
  buildString(mapping: {
    listenPort: string;
    targetPort: string;
    frpNodes: string[];
    protocol: string;
  }) {
    let result = "";
    if (mapping.frpNodes && mapping.frpNodes.length > 0) {
      mapping.frpNodes.forEach((node) => {
        result += `[${node}]`;
      });
    }
    if (mapping.listenPort) {
      if (mapping.frpNodes && mapping.frpNodes.length > 0)
        result += `[${mapping.listenPort}]`;
      else result += mapping.listenPort;
    }
    if (mapping.targetPort) result += `:${mapping.targetPort}`;
    if (mapping.protocol) result += `/${mapping.protocol}`;
    return result;
  }
  renderWidget(
    section_id: string,
    _option_index: number,
    cfgvalue: string[] | string,
  ) {
    void _option_index;
    const frp_sections = L.uci.sections("portweaver", "frp_node") || [];
    const current_values: string[] = Array.isArray(cfgvalue)
      ? (cfgvalue as string[])
      : typeof cfgvalue === "string"
        ? String(cfgvalue).split(/\s+/).filter(Boolean)
        : [];

    const widget_id = this.cbid(section_id);
    const mappings_wrapper = (
      <div id={`portmapping-wrapper-${section_id}`}></div>
    ) as HTMLElement;

    const updateHiddenValue = (): void => {
      const rows = mappings_wrapper.querySelectorAll(".portmapping-row");
      const values: string[] = [];
      rows.forEach((r: Element) => {
        const listen = (
          r.querySelector(".listen-port-input") as HTMLInputElement
        ).value.trim();
        const target = (
          r.querySelector(".target-port-input") as HTMLInputElement
        ).value.trim();
        const protocol = (
          r.querySelector(".protocol-select") as HTMLSelectElement
        ).value;
        const frpNodes: string[] = [];
        const checkboxes = r.querySelectorAll("input.frp-node-checkbox-pm");
        checkboxes.forEach((cb: any) => {
          if (cb.checked) {
            const node = cb.getAttribute("data-node") as string;
            const port_inp = r.querySelector(
              `input.frp-node-port-pm[data-node="${node}"]`,
            ) as HTMLInputElement | null;
            const port = port_inp ? port_inp.value.trim() : "";
            frpNodes.push(port ? `${node}:${port}` : node);
          }
        });
        const temp = {
          listenPort: listen,
          targetPort: target,
          frpNodes: frpNodes,
          protocol: protocol,
        };
        const str = this.buildString(temp);
        if (str && listen && target) values.push(str);
      });

      if (this.hiddenInput) this.hiddenInput.value = values.join(" ");
    };

    const renderMappingRow = (
      mapping_str: string,
      index: number,
    ): HTMLElement => {
      const mapping = this.parseMapping(mapping_str) || {
        listenPort: "",
        targetPort: "",
        frpNodes: [],
        protocol: "tcp",
      };
      const row_id = `portmapping-row-${section_id}-${index}`;
      let isTextMode = false;

      const listenInput = (
        <input
          type="text"
          class="listen-port-input"
          data-index={index}
          data-section={section_id}
          value={mapping.listenPort}
          placeholder={_("8080 or 8080-8090")}
          style="width: 70px; min-width: 50px; margin-right: 10px;"
        />
      ) as HTMLInputElement;

      const targetInput = (
        <input
          type="text"
          class="target-port-input"
          data-index={index}
          data-section={section_id}
          value={mapping.targetPort}
          placeholder={_("80 or 80-90")}
          style="width: 70px; min-width: 50px; margin-right: 10px;"
        />
      ) as HTMLInputElement;

      const protocolSelect = (
        <select
          class="protocol-select"
          data-index={index}
          data-section={section_id}
          style="width: 100px; margin-right: 10px;"
        >
          <option value="tcp" selected={mapping.protocol === "tcp"}>
            TCP
          </option>
          <option value="udp" selected={mapping.protocol === "udp"}>
            UDP
          </option>
          <option value="both" selected={mapping.protocol === "both"}>
            Both
          </option>
        </select>
      ) as HTMLSelectElement;

      const textModeInput = (
        <input
          type="text"
          class="text-mode-input"
          value={mapping_str}
          placeholder={_("[8080][node1:9888]:80/tcp or 8080:80/tcp")}
          style="width: 100%; margin-bottom: 10px; padding: 5px; display: none;"
        />
      ) as HTMLInputElement;

      const previewDiv = (
        <div
          class="portmapping-preview"
          data-index={index}
          style="margin-top: 8px; padding: 8px; background: #e8f4f8; border-left: 3px solid #0088cc; font-family: monospace; font-size: 12px;"
        >
          {_("Preview: ")}
          {this.buildString(mapping)}
        </div>
      ) as HTMLElement;

      const updatePreview = (): void => {
        const listen = listenInput.value.trim();
        const target = targetInput.value.trim();
        const protocol = protocolSelect.value;
        const frpNodes = getSelectedNodes();
        const temp_mapping = {
          listenPort: listen,
          targetPort: target,
          frpNodes: frpNodes,
          protocol: protocol,
        };
        const preview_str = this.buildString(temp_mapping);
        previewDiv.textContent = _("Preview: ") + preview_str;
        textModeInput.value = preview_str;
      };

      // 使用复用的 FRP 节点选择器组件
      const { container: selectorContainer, getSelectedNodes } =
        createFrpNodeSelector({
          selectedNodes: mapping.frpNodes || [],
          onChange: () => {
            updatePreview();
            updateHiddenValue();
          },
          checkboxClass: "frp-node-checkbox-pm",
          portInputClass: "frp-node-port-pm",
          containerStyle:
            "margin-top: 10px; padding: 10px; background: #f0f0f0; border-radius: 3px;",
        });

      const frpContainer = (
        <div class="frp-nodes-select" style="display: block;">
          <span style="display: block; margin-bottom: 8px; font-weight: bold;">
            {_("FRP Nodes (Optional):")}
          </span>
        </div>
      ) as HTMLElement;

      frpContainer.appendChild(selectorContainer);

      const errorDiv = (
        <div
          class="portmapping-error"
          data-index={index}
          style="color: red; margin-top: 8px; min-height: 20px; font-size: 12px;"
        ></div>
      ) as HTMLElement;

      const titleRow = (
        <div style="display: flex; gap: 10px; align-items: center;">
          <span style="min-width: 80px; font-weight: bold;">
            {_("Listen Port:")}
          </span>
          {listenInput}
          <span style="min-width: 80px; font-weight: bold;">
            {_("Target Port:")}
          </span>
          {targetInput}
          <span style="min-width: 60px; font-weight: bold;">
            {_("Protocol:")}
          </span>
          {protocolSelect}
        </div>
      ) as HTMLElement;

      const modeToggleBtn = (
        <button
          type="button"
          class="btn btn-xs"
          style="margin-bottom: 10px; margin-right: 10px;"
        >
          {_("Text Edit")}
        </button>
      );

      const deleteBtn = (
        <button
          type="button"
          class="btn btn-sm btn-danger"
          data-index={index}
          data-section={section_id}
          style="margin-top: 10px; margin-left: 10px;"
        >
          {_("Delete")}
        </button>
      );

      const row = (
        <div
          id={row_id}
          class="portmapping-row"
          data-index={index}
          style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;"
        >
          {modeToggleBtn}
          {deleteBtn}
          <br />
          {titleRow}
          {textModeInput}
          {frpContainer}
          {errorDiv}
          {previewDiv}
        </div>
      ) as HTMLElement;

      const updatePreviewAndHidden = (): void => {
        updatePreview();
        updateHiddenValue();
      };

      listenInput.oninput = updatePreviewAndHidden;
      listenInput.onchange = updatePreviewAndHidden;
      targetInput.oninput = updatePreviewAndHidden;
      targetInput.onchange = updatePreviewAndHidden;
      protocolSelect.onchange = updatePreviewAndHidden;

      textModeInput.oninput = (ev: Event) => {
        const inputEl = ev.currentTarget as HTMLInputElement | null;
        if (!inputEl) return;
        const parsed = this.parseMapping(inputEl.value);
        if (parsed) {
          listenInput.value = parsed.listenPort;
          targetInput.value = parsed.targetPort;
          protocolSelect.value = parsed.protocol as any;

          // 更新 FRP 节点选择器的状态
          const allCheckboxes = selectorContainer.querySelectorAll(
            "input.frp-node-checkbox-pm",
          );
          allCheckboxes.forEach((cb: any) => {
            const node = cb.getAttribute("data-node");
            const is_checked = (parsed.frpNodes || []).some(
              (n: string) => n.split(":")[0] === node,
            );
            cb.checked = is_checked;

            const port_inp = selectorContainer.querySelector(
              `input.frp-node-port-pm[data-node="${node}"]`,
            ) as HTMLInputElement | null;
            if (port_inp) {
              port_inp.disabled = !is_checked;
              const port_td = port_inp.closest("td");
              if (port_td) {
                port_td.style.display = is_checked ? "" : "none";
              }

              if (is_checked) {
                const foundNode = (parsed.frpNodes || []).find(
                  (n: string) => n.split(":")[0] === node,
                );
                if (foundNode) {
                  const parts = foundNode.split(":");
                  port_inp.value = parts.length > 1 ? parts[1] : "";
                }
              } else {
                port_inp.value = "";
              }
            }
          });
          updateHiddenValue();
        }
      };

      modeToggleBtn.onclick = (e: MouseEvent) => {
        e.preventDefault();
        isTextMode = !isTextMode;
        titleRow.style.display = isTextMode ? "none" : "flex";
        frpContainer.style.display = isTextMode ? "none" : "block";
        textModeInput.style.display = isTextMode ? "block" : "none";
        previewDiv.style.display = isTextMode ? "none" : "block";
        modeToggleBtn.textContent = isTextMode
          ? _("Visual Edit")
          : _("Text Edit");
      };

      deleteBtn.onclick = (e: MouseEvent) => {
        e.preventDefault();
        row.remove();
        updateHiddenValue();
      };

      return row;
    };

    for (let i = 0; i < current_values.length; i++) {
      mappings_wrapper.appendChild(renderMappingRow(current_values[i], i));
    }

    const addBtn = (
      <button
        type="button"
        class="btn btn-sm btn-primary"
        style="margin-bottom: 10px;"
      >
        {_("Add Port Mapping")}
      </button>
    ) as HTMLButtonElement;

    addBtn.onclick = (e: MouseEvent) => {
      e.preventDefault();
      const rows = mappings_wrapper.querySelectorAll(".portmapping-row");
      const new_index = rows.length;
      mappings_wrapper.appendChild(renderMappingRow("", new_index));
    };

    const hiddenInput = (
      <input type="hidden" name={widget_id} value={current_values.join(" ")} />
    );

    this.hiddenInput = hiddenInput as HTMLInputElement;
    const container = (
      <div class="cbi-value-field">
        {addBtn}
        {mappings_wrapper}
        {hiddenInput}
        <div class="cbi-value-description">
          {_(
            "Configure port forwarding rules. Listen Port and Target Port support single port (8080) or port range (8080-8090).",
          )}
        </div>
      </div>
    );

    return container;
  }
  cfgvalue(section_id: string) {
    const value = L.uci.get("portweaver", section_id, "port_mapping");
    if (Array.isArray(value)) return value;
    if (typeof value === "string")
      return String(value).split(/\s+/).filter(Boolean);
    return [];
  }
  formvalue(section_id: string) {
    if (this.hiddenInput?.value)
      return this.hiddenInput.value.split(/\s+/).filter(Boolean);
    return null;
  }
  write(section_id: string, formvalue: string | string[]) {
    if (formvalue && formvalue.length > 0) {
      return L.uci.set("portweaver", section_id, "port_mapping", formvalue);
    } else {
      return L.uci.unset("portweaver", section_id, "port_mapping");
    }
  }

  validate(section_id: string, value: any) {
    // 验证端口映射格式
    if (!value) {
      this.validationError = "";
      this.isValidFlag = true;
      return;
    }

    const valueStr = Array.isArray(value) ? value.join(" ") : String(value);
    const mappings = valueStr.split(/\s+/).filter(Boolean);

    for (const mappingStr of mappings) {
      const parsed = this.parseMapping(mappingStr);
      
      if (!parsed) {
        this.validationError = _("Invalid port mapping format");
        this.isValidFlag = false;
        return;
      }

      // 验证监听端口
      if (!parsed.listenPort) {
        this.validationError = _("Listen port is required");
        this.isValidFlag = false;
        return;
      }

      if (!this.validatePortOrRange(parsed.listenPort)) {
        this.validationError = _("Invalid listen port format. Use port (8080) or range (8080-8090)");
        this.isValidFlag = false;
        return;
      }

      // 验证目标端口
      if (!parsed.targetPort) {
        this.validationError = _("Target port is required");
        this.isValidFlag = false;
        return;
      }

      if (!this.validatePortOrRange(parsed.targetPort)) {
        this.validationError = _("Invalid target port format. Use port (80) or range (80-90)");
        this.isValidFlag = false;
        return;
      }

      // 验证端口范围匹配
      const listenPorts = this.parsePortRange(parsed.listenPort);
      const targetPorts = this.parsePortRange(parsed.targetPort);
      
      if (listenPorts.length !== targetPorts.length) {
        this.validationError = _("Listen port range and target port range must have the same size");
        this.isValidFlag = false;
        return;
      }

      // 验证 FRP 节点
      if (parsed.frpNodes && parsed.frpNodes.length > 0) {
        for (const nodeStr of parsed.frpNodes) {
          const [node, port] = nodeStr.split(":");
          
          if (!node) {
            this.validationError = _("Invalid FRP node format");
            this.isValidFlag = false;
            return;
          }

          if (port) {
            const portNum = parseInt(port, 10);
            if (Number.isNaN(portNum) || portNum < 1 || portNum > 65535) {
              this.validationError = _("FRP node port must be between 1 and 65535");
              this.isValidFlag = false;
              return;
            }
          }
        }
      }

      // 验证协议
      if (parsed.protocol && !["tcp", "udp", "both"].includes(parsed.protocol)) {
        this.validationError = _("Protocol must be tcp, udp, or both");
        this.isValidFlag = false;
        return;
      }
    }

    this.validationError = "";
    this.isValidFlag = true;
  }

  private validatePortOrRange(portStr: string): boolean {
    // 验证单个端口或端口范围
    if (!portStr) return false;
    
    // 单个端口
    if (/^\d+$/.test(portStr)) {
      const port = parseInt(portStr, 10);
      return port >= 1 && port <= 65535;
    }
    
    // 端口范围
    if (/^\d+-\d+$/.test(portStr)) {
      const [start, end] = portStr.split("-").map(p => parseInt(p, 10));
      return start >= 1 && start <= 65535 && 
             end >= 1 && end <= 65535 && 
             start <= end;
    }
    
    return false;
  }

  private parsePortRange(portStr: string): number[] {
    // 解析端口或端口范围，返回端口数组
    if (/^\d+$/.test(portStr)) {
      return [parseInt(portStr, 10)];
    }
    
    if (/^\d+-\d+$/.test(portStr)) {
      const [start, end] = portStr.split("-").map(p => parseInt(p, 10));
      const ports: number[] = [];
      for (let i = start; i <= end; i++) {
        ports.push(i);
      }
      return ports;
    }
    
    return [];
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
export default PortMappingEditor;
