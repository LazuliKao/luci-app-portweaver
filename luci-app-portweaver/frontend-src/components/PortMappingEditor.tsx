export function createPortMappingEditor(form: any, uci: any) {
  return form.Value.extend({
    parseMapping: function (str: string) {
      if (!str || typeof str !== "string") return null;
      str = str.trim();
      let mapping = {
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
      let protocolMatch = str.match(/\/([a-z]+)$/);
      if (protocolMatch) {
        mapping.protocol = protocolMatch[1].toLowerCase() as any;
        str = str.substring(0, protocolMatch.index);
      }
      let i = 0;
      while (str[i] === "[") {
        let end = str.indexOf("]", i);
        if (end === -1) break;
        let content = str.substring(i + 1, end);
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
      let rest = str.substring(i);
      if (!mapping.listenPort) {
        let parts0 = rest.split(":");
        if (parts0.length >= 1)
          mapping.listenPort = parts0[0].trim().replace(/[\[\]]/g, "");
        if (parts0.length >= 2)
          mapping.targetPort = parts0[1].trim().replace(/[\[\]]/g, "");
      } else {
        if (rest.startsWith(":")) {
          mapping.targetPort = rest
            .substring(1)
            .trim()
            .replace(/[\[\]]/g, "");
        }
      }
      return mapping;
    },

    buildString: function (mapping: {
      listenPort: string;
      targetPort: string;
      frpNodes: string[];
      protocol: string;
    }) {
      let result = "";
      if (mapping.frpNodes && mapping.frpNodes.length > 0) {
        mapping.frpNodes.forEach(function (node) {
          result += "[" + node + "]";
        });
      }
      if (mapping.listenPort) {
        if (mapping.frpNodes && mapping.frpNodes.length > 0)
          result += "[" + mapping.listenPort + "]";
        else result += mapping.listenPort;
      }
      if (mapping.targetPort) result += ":" + mapping.targetPort;
      if (mapping.protocol) result += "/" + mapping.protocol;
      return result;
    },

    renderWidget: function (
      section_id: string,
      _option_index: number,
      cfgvalue: string[] | string,
    ) {
      void _option_index;
      const frp_sections = uci.sections("portweaver", "frp_node") || [];
      const current_values: string[] = Array.isArray(cfgvalue)
        ? (cfgvalue as string[])
        : typeof cfgvalue === "string"
          ? String(cfgvalue).split(/\s+/).filter(Boolean)
          : [];

      const widget_id = this.cbid(section_id);
      const self = this;
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
                'input.frp-node-port-pm[data-node="' + node + '"]',
              ) as HTMLInputElement | null;
              const port = port_inp ? port_inp.value.trim() : "";
              frpNodes.push(port ? node + ":" + port : node);
            }
          });
          const temp = {
            listenPort: listen,
            targetPort: target,
            frpNodes: frpNodes,
            protocol: protocol,
          };
          const str = self.buildString(temp);
          if (str && listen && target) values.push(str);
        });
        const hidden = document.getElementById(
          "portmapping-hidden-" + section_id,
        ) as HTMLInputElement | null;
        if (hidden) hidden.value = values.join(" ");
      };

      const renderMappingRow = (
        mapping_str: string,
        index: number,
      ): HTMLElement => {
        const mapping = self.parseMapping(mapping_str) || {
          listenPort: "",
          targetPort: "",
          frpNodes: [],
          protocol: "tcp",
        };
        const row_id = "portmapping-row-" + section_id + "-" + index;
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
            {self.buildString(mapping)}
          </div>
        ) as HTMLElement;

        const updatePreview = (): void => {
          const listen = listenInput.value.trim();
          const target = targetInput.value.trim();
          const protocol = protocolSelect.value;
          const frpNodes: string[] = [];
          const allFrpCheckboxes = row.querySelectorAll(
            "input.frp-node-checkbox-pm",
          );
          allFrpCheckboxes.forEach((cb: any) => {
            if (cb.checked) {
              const node = cb.getAttribute("data-node") as string;
              const port_inp = row.querySelector(
                'input.frp-node-port-pm[data-node="' + node + '"]',
              ) as HTMLInputElement | null;
              const port = port_inp ? port_inp.value.trim() : "";
              frpNodes.push(port ? node + ":" + port : node);
            }
          });
          const temp_mapping = {
            listenPort: listen,
            targetPort: target,
            frpNodes: frpNodes,
            protocol: protocol,
          };
          const preview_str = self.buildString(temp_mapping);
          previewDiv.textContent = _("Preview: ") + preview_str;
          textModeInput.value = preview_str;
        };

        const frpContainer = (
          <div
            class="frp-nodes-select"
            style="margin-top: 10px; padding: 10px; background: #f0f0f0; border-radius: 3px; display: block;"
          ></div>
        ) as HTMLElement;

        if (frp_sections.length > 0) {
          frpContainer.appendChild(
            <label style="display: block; margin-bottom: 8px; font-weight: bold;">
              {_("FRP Nodes (Optional):")}
            </label>,
          );

          frp_sections.forEach((frp_section: any) => {
            const node_name = frp_section["name"] || frp_section[".name"];
            if (!node_name) return;
            const is_checked = (mapping.frpNodes || []).some(
              (n: string) => n.split(":")[0] === node_name,
            );
            const found = (mapping.frpNodes || []).find(
              (n: string) => n.split(":")[0] === node_name,
            );
            const port_value = found ? found.split(":")[1] || "" : "";
            const checkbox = (
              <input
                type="checkbox"
                class="frp-node-checkbox-pm"
                data-node={node_name}
                data-index={index}
                data-section={section_id}
                checked={is_checked}
                style="margin-right: 5px;"
              />
            ) as HTMLInputElement;

            const port_input = (
              <input
                type="text"
                class="frp-node-port-pm"
                data-node={node_name}
                data-index={index}
                data-section={section_id}
                value={port_value}
                placeholder={_("default")}
                style="width: 80px; margin-right: 15px;"
                {...(is_checked ? {} : { hidden: true })}
              />
            ) as HTMLInputElement;

            checkbox.onchange = (ev: Event) => {
              const inputEl = ev.currentTarget as HTMLInputElement | null;
              if (!inputEl) return;
              port_input.hidden = !inputEl.checked;
              if (!inputEl.checked) {
                port_input.value = "";
                port_input.style.borderColor = "";
              }
              updatePreview();
              updateHiddenValue();
            };

            const handlePortChange = (): void => {
              const port = port_input.value.trim();
              if (port) {
                const p = parseInt(port, 10);
                if (isNaN(p) || p < 1 || p > 65535) {
                  port_input.style.setProperty(
                    "border-color",
                    "red",
                    "important",
                  );
                } else {
                  port_input.style.borderColor = "";
                }
              } else {
                port_input.style.borderColor = "";
              }
              updatePreview();
              updateHiddenValue();
            };

            port_input.oninput = handlePortChange;
            port_input.onchange = handlePortChange;

            frpContainer.appendChild(
              <div style="margin-bottom: 5px;">
                {checkbox}
                <label style="margin-right: 10px; cursor: pointer;">
                  {node_name}
                </label>
                <label style="margin-right: 5px;">{_("Port:")}</label>
                {port_input}
              </div>,
            );
          });
        } else {
          frpContainer.appendChild(
            <em style="color: #999;">{_("No FRP nodes configured")}</em>,
          );
        }

        const errorDiv = (
          <div
            class="portmapping-error"
            data-index={index}
            style="color: red; margin-top: 8px; min-height: 20px; font-size: 12px;"
          ></div>
        ) as HTMLElement;

        const titleRow = (
          <div style="display: flex; gap: 10px; align-items: center;">
            <label style="min-width: 80px; font-weight: bold;">
              {_("Listen Port:")}
            </label>
            {listenInput}
            <label style="min-width: 80px; font-weight: bold;">
              {_("Target Port:")}
            </label>
            {targetInput}
            <label style="min-width: 60px; font-weight: bold;">
              {_("Protocol:")}
            </label>
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
          const parsed = self.parseMapping(inputEl.value);
          if (parsed) {
            listenInput.value = parsed.listenPort;
            targetInput.value = parsed.targetPort;
            protocolSelect.value = parsed.protocol as any;
            const allCheckboxes = row.querySelectorAll(
              "input.frp-node-checkbox-pm",
            );
            allCheckboxes.forEach((cb: any) => {
              const node = cb.getAttribute("data-node");
              const is_checked = (parsed.frpNodes || []).some(
                (n: string) => n.split(":")[0] === node,
              );
              cb.checked = is_checked;
              const port_inp = row.querySelector(
                'input.frp-node-port-pm[data-node="' + node + '"]',
              ) as HTMLInputElement | null;
              if (port_inp) {
                port_inp.hidden = !is_checked;
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

        modeToggleBtn.onclick = function (e: MouseEvent) {
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

        deleteBtn.onclick = function (e: MouseEvent) {
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

      addBtn.onclick = function (e: MouseEvent) {
        e.preventDefault();
        const rows = mappings_wrapper.querySelectorAll(".portmapping-row");
        const new_index = rows.length;
        mappings_wrapper.appendChild(renderMappingRow("", new_index));
      };

      const hidden = (
        <input
          type="hidden"
          id={`portmapping-hidden-${section_id}`}
          name={widget_id}
          value={current_values.join(" ")}
        />
      );

      const container = (
        <div class="cbi-value-field">
          {addBtn}
          {mappings_wrapper}
          {hidden}
          <div class="cbi-value-description">
            {_(
              "Configure port forwarding rules. Listen Port and Target Port support single port (8080) or port range (8080-8090).",
            )}
          </div>
        </div>
      );

      return container;
    },

    cfgvalue: function (section_id: string) {
      let value = uci.get("portweaver", section_id, "port_mapping");
      if (Array.isArray(value)) return value;
      if (typeof value === "string")
        return String(value).split(/\s+/).filter(Boolean);
      return [];
    },

    formvalue: function (section_id: string) {
      let hidden = document.getElementById(
        "portmapping-hidden-" + section_id,
      ) as HTMLInputElement | null;
      if (hidden && hidden.value)
        return hidden.value.split(/\s+/).filter(Boolean);
      return null;
    },

    write: function (section_id: string, formvalue: string[] | null) {
      console.log(
        "Writing port mapping for section:",
        section_id,
        "with value:",
        formvalue,
      );

      if (formvalue && formvalue.length > 0) {
        return uci.set("portweaver", section_id, "port_mapping", formvalue);
      } else {
        return uci.unset("portweaver", section_id, "port_mapping");
      }
    },
  });
}
