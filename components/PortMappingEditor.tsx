import { createFrpNodeSelector } from "./FrpNodeSelector";
import ValidatedInput from "./ValidatedInput";
import * as PortMappingUtils from "../utils/port-mapping";
class PortMappingEditor extends L.form.Value {
  private hiddenInput?: HTMLInputElement;
  private errorDivRefs: HTMLElement[] = [];
  renderWidget(section_id: string, _option_index: number, cfgvalue: string[]) {
    void _option_index;

    this.errorDivRefs = [];
    const current_values: string[] = cfgvalue || [];

    const widget_id = this.cbid(section_id);
    const mappings_wrapper = (
      <div style="position: relative; display: grid; gap: 8px;"></div>
    ) as HTMLElement;
    const dropIndicator = (
      <div style="position: absolute; left: 0; right: 0; height: 0; border-top: 2px dashed #09c; pointer-events: none; display: none; z-index: 1;"></div>
    ) as HTMLElement;

    type MappingRowRef = {
      element: HTMLElement;
      orderLabel: HTMLElement;
      errorElement: HTMLElement;
      listenInput: HTMLInputElement;
      targetInput: HTMLInputElement;
      protocolSelect: HTMLSelectElement;
      getSelectedNodes: () => string[];
    };

    const rowRefs: MappingRowRef[] = [];
    let draggedRow: HTMLElement | null = null;
    let dropTarget: HTMLElement | null = null;
    let dropBefore = true;
    let pointerId: number | null = null;

    const updateHiddenValue = (): void => {
      const values: string[] = [];
      for (const ref of rowRefs) {
        const listen = ref.listenInput.value.trim();
        const target = ref.targetInput.value.trim();
        const protocol = ref.protocolSelect.value;
        const frpNodes = ref.getSelectedNodes();

        const temp = {
          listenPort: listen,
          targetPort: target,
          frpNodes: frpNodes,
          protocol: protocol,
        };
        const str = PortMappingUtils.build(temp);
        // Keep incomplete rows in the form value so validation can report them
        // instead of silently dropping them on the next input or blur event.
        if (listen || target) values.push(str);
      }

      if (this.hiddenInput) this.hiddenInput.value = values.join(" ");
    };

    const refreshRowOrder = (): void => {
      const refsByElement = new Map(
        rowRefs.map((ref) => [ref.element, ref] as const),
      );
      const orderedRefs: MappingRowRef[] = [];

      for (const child of Array.from(mappings_wrapper.children)) {
        const ref = refsByElement.get(child as HTMLElement);
        if (ref) orderedRefs.push(ref);
      }

      rowRefs.splice(0, rowRefs.length, ...orderedRefs);
      rowRefs.forEach((ref, index) => {
        const dataIndex = String(index);
        ref.orderLabel.textContent = String(index + 1);
        ref.element.dataset.index = dataIndex;
        ref.errorElement.dataset.index = dataIndex;
        ref.listenInput.dataset.index = dataIndex;
        ref.targetInput.dataset.index = dataIndex;
        ref.protocolSelect.dataset.index = dataIndex;
      });
      updateHiddenValue();
    };

    const clearDropIndicator = (): void => {
      dropTarget = null;
      dropIndicator.style.display = "none";
    };

    const setDropTarget = (target: HTMLElement, clientY: number): void => {
      dropTarget = target;
      const targetIndex = rowRefs.findIndex((ref) => ref.element === target);
      const previousRow = rowRefs[targetIndex - 1]?.element;
      const nextRow = rowRefs[targetIndex + 1]?.element;
      const targetBounds = target.getBoundingClientRect();
      const wrapperBounds = mappings_wrapper.getBoundingClientRect();
      dropBefore = clientY < targetBounds.top + targetBounds.height / 2;

      const indicatorY = dropBefore
        ? previousRow
          ? (previousRow.getBoundingClientRect().bottom + targetBounds.top) / 2
          : targetBounds.top
        : nextRow
          ? (targetBounds.bottom + nextRow.getBoundingClientRect().top) / 2
          : targetBounds.bottom;

      dropIndicator.style.top = `${indicatorY - wrapperBounds.top}px`;
      dropIndicator.style.display = "block";
    };

    const finishDrag = (): void => {
      if (draggedRow) draggedRow.style.opacity = "";
      draggedRow = null;
      pointerId = null;
      clearDropIndicator();
    };

    const renderMappingRow = (
      mapping_str: string,
      index: number,
    ): {
      element: HTMLElement;
      orderLabel: HTMLElement;
      errorElement: HTMLElement;
      listenInput: HTMLInputElement;
      targetInput: HTMLInputElement;
      protocolSelect: HTMLSelectElement;
      getSelectedNodes: () => string[];
    } => {
      const mapping = PortMappingUtils.parse(mapping_str) || {
        listenPort: "",
        targetPort: "",
        frpNodes: [],
        protocol: "tcp",
      };
      const initialTextModeValue = mapping_str
        ? PortMappingUtils.build(mapping)
        : "";
      const row_id = `portmapping-row-${section_id}-${index}`;
      let isTextMode = true;

      const listenInput = (
        <ValidatedInput
          type="text"
          className="listen-port-input"
          value={mapping.listenPort}
          placeholder={_("8080 or 8080-8090")}
          style="width: 100%; min-width: 0; margin: 0;"
          dataAttributes={{ index: String(index), section: section_id }}
          onValidate={(value) => {
            if (!value.trim()) return false;
            return PortMappingUtils.isPortOrRange(value.trim());
          }}
        />
      ) as HTMLInputElement;
      listenInput.id = `${row_id}-listen`;

      const targetInput = (
        <ValidatedInput
          type="text"
          className="target-port-input"
          value={mapping.targetPort}
          placeholder={_("80 or 80-90")}
          style="width: 100%; min-width: 0; margin: 0;"
          dataAttributes={{ index: String(index), section: section_id }}
          onValidate={(value) => {
            if (!value.trim()) return false;
            return PortMappingUtils.isPortOrRange(value.trim());
          }}
        />
      ) as HTMLInputElement;
      targetInput.id = `${row_id}-target`;

      const protocolSelect = (
        <select
          id={`${row_id}-protocol`}
          class="protocol-select"
          data-index={index}
          data-section={section_id}
          style="width: 100%; min-width: 0; margin: 0;"
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
        <ValidatedInput
          type="text"
          className="text-mode-input"
          value={initialTextModeValue}
          placeholder={_("[8080][node1:9888]:80/tcp or 8080:80/tcp")}
          style="flex: 1 1 120px; min-width: 100px; width: auto; margin: 0; padding: 5px; display: none;"
          validateOn="blur"
          onValidate={(value) => {
            const parsed = PortMappingUtils.parse(value);
            return !!parsed && !PortMappingUtils.validate(parsed);
          }}
        />
      ) as HTMLInputElement;

      const previewDiv = (
        <div
          class="portmapping-preview"
          data-index={index}
          style="margin-top: 6px; padding: 6px; border-left: 3px solid #0088cc; font-family: monospace; font-size: 12px;"
        >
          {_("Preview: %s").format(PortMappingUtils.build(mapping))}
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
        const preview_str = PortMappingUtils.build(temp_mapping);
        previewDiv.textContent = _("Preview: %s").format(preview_str);
        if (!isTextMode) {
          textModeInput.value = preview_str;
        }
      };

      // 使用动态的 FRP 节点选择器组件来保证与文本模式的数据同步
      let selectorContainer: HTMLElement = null as any;
      let getSelectedNodes: () => string[] = null as any;

      const initOrUpdateFrp = (nodes: string[]) => {
        const selector = createFrpNodeSelector({
          selectedNodes: nodes,
          onChange: () => {
            validateAndUpdate();
          },
          checkboxClass: "frp-node-checkbox-pm",
          portInputClass: "frp-node-port-pm",
        });

        selectorContainer?.parentNode?.replaceChild(
          selector.container,
          selectorContainer,
        );

        selectorContainer = selector.container;
        getSelectedNodes = selector.getSelectedNodes;
      };

      initOrUpdateFrp(mapping.frpNodes || []);

      const frpContainer = (
        <div class="frp-nodes-select" style="display: block; margin-top: 6px;">
          <span style="display: block; margin-bottom: 6px; font-weight: bold;">
            {_("FRP Nodes (Optional):")}
          </span>
        </div>
      ) as HTMLElement;

      frpContainer.appendChild(selectorContainer);

      const errorDiv = (
        <div
          class="portmapping-error"
          data-index={index}
          style="color: red; margin-top: 6px; font-size: 12px; display: none;"
        ></div>
      ) as HTMLElement;

      this.errorDivRefs.push(errorDiv);

      const titleRow = (
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; align-items: end; margin-top: 10px;">
          <label
            htmlFor={`${row_id}-listen`}
            style="display: grid; gap: 5px; font-weight: bold;"
          >
            <span>{_("Listen Port:")}</span>
            {listenInput}
          </label>
          <label
            htmlFor={`${row_id}-target`}
            style="display: grid; gap: 5px; font-weight: bold;"
          >
            <span>{_("Target Port:")}</span>
            {targetInput}
          </label>
          <label
            htmlFor={`${row_id}-protocol`}
            style="display: grid; gap: 5px; font-weight: bold;"
          >
            <span>{_("Protocol:")}</span>
            {protocolSelect}
          </label>
        </div>
      ) as HTMLElement;

      const modeToggleBtn = (
        <button
          type="button"
          class="btn cbi-button cbi-button-edit"
          style="margin: 0; white-space: nowrap;"
        >
          {_("Text Edit")}
        </button>
      );

      const deleteBtn = (
        <button
          type="button"
          class="btn cbi-button cbi-button-remove"
          data-index={index}
          data-section={section_id}
        >
          {_("Delete")}
        </button>
      );

      const orderLabel = (
        <span
          title={_("Mapping order")}
          style="display: inline-flex; align-items: center; justify-content: center; flex: 0 0 24px; width: 24px; height: 24px; border-radius: 999px; background: rgba(127, 127, 127, 0.18); font-size: 12px; font-weight: bold;"
        >
          {String(index + 1)}
        </span>
      ) as HTMLElement;

      const dragHandle = (
        <button
          type="button"
          class="cbi-button drag-handle center"
          draggable={true}
          aria-label={_("Drag to reorder")}
          title={_("Drag to reorder")}
          style="cursor:move; user-select:none; -webkit-user-select:none; touch-action:none; display:inline-block;"
        >
          ☰
        </button>
      ) as HTMLButtonElement;

      const buttonRow = (
        <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
          {dragHandle}
          {orderLabel}
          {textModeInput}
          <div style="display: flex; gap: 8px; align-items: center; margin-left: auto;">
            {modeToggleBtn}
            {deleteBtn}
          </div>
        </div>
      ) as HTMLElement;

      const row = (
        <div
          id={row_id}
          class="portmapping-row"
          data-index={index}
          style="padding: 10px 12px; border: 1px solid rgba(127, 127, 127, 0.35); border-radius: 6px; background: rgba(127, 127, 127, 0.04); transition: opacity 120ms ease;"
        >
          {buttonRow}
          {titleRow}
          {frpContainer}
          {errorDiv}
          {previewDiv}
        </div>
      ) as HTMLElement;

      const validateAndUpdate = (): void => {
        const listen = listenInput.value.trim();
        const target = targetInput.value.trim();

        errorDiv.textContent = "";
        errorDiv.style.display = "none";

        const validationError = PortMappingUtils.validate({
          listenPort: listen,
          targetPort: target,
          frpNodes: getSelectedNodes(),
          protocol: protocolSelect.value,
        });
        const hasError = !!validationError;

        if (hasError) {
          errorDiv.textContent = validationError;
          errorDiv.style.display = "block";
        }

        if (!hasError) {
          updatePreview();
        }

        updateHiddenValue();
      };

      listenInput.oninput = validateAndUpdate;
      listenInput.onchange = validateAndUpdate;
      targetInput.oninput = validateAndUpdate;
      targetInput.onchange = validateAndUpdate;
      protocolSelect.onchange = validateAndUpdate;

      const syncFromTextMode = () => {
        const parsed = PortMappingUtils.parse(textModeInput.value);
        if (parsed) {
          const tempListenHandler = listenInput.oninput;
          const tempTargetHandler = targetInput.oninput;
          const tempProtocolHandler = protocolSelect.onchange;

          listenInput.oninput = null;
          targetInput.oninput = null;
          protocolSelect.onchange = null;

          listenInput.value = parsed.listenPort;
          targetInput.value = parsed.targetPort;
          protocolSelect.value = parsed.protocol as any;

          initOrUpdateFrp(parsed.frpNodes || []);

          listenInput.oninput = tempListenHandler;
          targetInput.oninput = tempTargetHandler;
          protocolSelect.onchange = tempProtocolHandler;

          validateAndUpdate();
        }
      };

      textModeInput.oninput = syncFromTextMode;
      textModeInput.onblur = (ev: Event) => {
        const inputEl = ev.currentTarget as HTMLInputElement | null;
        if (!inputEl) return;

        errorDiv.textContent = "";
        errorDiv.style.display = "none";

        const parsed = PortMappingUtils.parse(inputEl.value);
        const validationError = parsed
          ? PortMappingUtils.validate(parsed)
          : _("Invalid port mapping format");
        if (parsed && !validationError) {
          const unifiedStr = PortMappingUtils.build(parsed);
          if (unifiedStr && unifiedStr !== inputEl.value) {
            inputEl.value = unifiedStr;
          }
          syncFromTextMode();
        } else {
          errorDiv.textContent = validationError;
          errorDiv.style.display = "block";
        }
      };
      function setDisplay(element: HTMLElement, display: string) {
        element.style.setProperty("display", display, "important");
      }
      function updateVis() {
        setDisplay(titleRow, isTextMode ? "none" : "grid");
        setDisplay(frpContainer, isTextMode ? "none" : "block");
        setDisplay(textModeInput, isTextMode ? "block" : "none");
        setDisplay(previewDiv, isTextMode ? "none" : "block");
        modeToggleBtn.textContent = isTextMode
          ? _("Visual Edit")
          : _("Text Edit");
      }
      updateVis();
      modeToggleBtn.onclick = (e: MouseEvent) => {
        e.preventDefault();
        // If switching FROM text mode TO visual mode, sync before switching
        if (isTextMode) {
          syncFromTextMode();
        }
        isTextMode = !isTextMode;
        updateVis();
        // If switching FROM visual mode TO text mode, ensure text input is updated
        if (isTextMode) {
          const listen = listenInput.value.trim();
          const target = targetInput.value.trim();
          const protocol = protocolSelect.value;
          const frpNodes = getSelectedNodes();
          const preview_str = PortMappingUtils.build({
            listenPort: listen,
            targetPort: target,
            frpNodes: frpNodes,
            protocol: protocol,
          });
          textModeInput.value = preview_str;
          previewDiv.textContent = _("Preview: %s").format(preview_str);
        }
      };

      dragHandle.ondragstart = (e: DragEvent) => {
        draggedRow = row;
        row.style.opacity = "0.55";
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", row_id);
        }
      };

      dragHandle.ondragend = () => {
        refreshRowOrder();
        finishDrag();
      };

      row.ondragover = (e: DragEvent) => {
        if (!draggedRow || draggedRow === row) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        setDropTarget(row, e.clientY);
      };

      row.ondragleave = (e: DragEvent) => {
        if (!row.contains(e.relatedTarget as Node | null)) clearDropIndicator();
      };

      row.ondrop = (e: DragEvent) => {
        if (!draggedRow || draggedRow === row) return;
        e.preventDefault();
        mappings_wrapper.insertBefore(
          draggedRow,
          dropBefore ? row : row.nextSibling,
        );
        refreshRowOrder();
        finishDrag();
      };

      const updateDropTargetForY = (clientY: number): void => {
        if (!draggedRow) return;

        for (const ref of rowRefs) {
          const bounds = ref.element.getBoundingClientRect();
          if (
            ref.element !== draggedRow &&
            clientY >= bounds.top &&
            clientY <= bounds.bottom
          ) {
            setDropTarget(ref.element, clientY);
            return;
          }
        }
        clearDropIndicator();
      };

      const commitDrop = (): void => {
        if (draggedRow && dropTarget && draggedRow !== dropTarget) {
          mappings_wrapper.insertBefore(
            draggedRow,
            dropBefore ? dropTarget : dropTarget.nextSibling,
          );
          refreshRowOrder();
        }
        finishDrag();
      };

      dragHandle.onpointerdown = (e: PointerEvent) => {
        e.preventDefault();
        pointerId = e.pointerId;
        draggedRow = row;
        row.style.opacity = "0.55";
        if (dragHandle.setPointerCapture)
          dragHandle.setPointerCapture(e.pointerId);
      };

      dragHandle.onpointermove = (e: PointerEvent) => {
        if (pointerId !== e.pointerId || !draggedRow) return;
        e.preventDefault();
        updateDropTargetForY(e.clientY);
      };

      dragHandle.onpointerup = (e: PointerEvent) => {
        if (pointerId !== e.pointerId) return;
        e.preventDefault();
        commitDrop();
      };

      dragHandle.onpointercancel = () => finishDrag();

      if (!window.PointerEvent) {
        const getActiveTouch = (touches: TouchList): Touch | null => {
          for (let i = 0; i < touches.length; i++) {
            const touch = touches.item(i);
            if (touch?.identifier === pointerId) return touch;
          }
          return null;
        };

        dragHandle.ontouchstart = (e: TouchEvent) => {
          const touch = e.changedTouches.item(0);
          if (!touch) return;
          e.preventDefault();
          pointerId = touch.identifier;
          draggedRow = row;
          row.style.opacity = "0.55";
        };

        dragHandle.ontouchmove = (e: TouchEvent) => {
          const touch = getActiveTouch(e.touches);
          if (!touch || !draggedRow) return;
          e.preventDefault();
          updateDropTargetForY(touch.clientY);
        };

        dragHandle.ontouchend = (e: TouchEvent) => {
          const touch = getActiveTouch(e.changedTouches);
          if (!touch) return;
          e.preventDefault();
          commitDrop();
        };

        dragHandle.ontouchcancel = () => finishDrag();
      }

      deleteBtn.onclick = (e: MouseEvent) => {
        e.preventDefault();
        row.remove();
        // 从 rowRefs 中移除当前行的引用
        const idx = rowRefs.findIndex(
          (ref) =>
            ref.listenInput === listenInput &&
            ref.targetInput === targetInput &&
            ref.protocolSelect === protocolSelect,
        );
        if (idx !== -1) {
          rowRefs.splice(idx, 1);
          const errorIndex = this.errorDivRefs.indexOf(errorDiv);
          if (errorIndex !== -1) this.errorDivRefs.splice(errorIndex, 1);
        }
        refreshRowOrder();
      };

      return {
        element: row,
        orderLabel,
        errorElement: errorDiv,
        listenInput,
        targetInput,
        protocolSelect,
        getSelectedNodes: () => getSelectedNodes(),
      };
    };

    for (let i = 0; i < current_values.length; i++) {
      const rowData = renderMappingRow(current_values[i], i);
      rowRefs.push(rowData);
      mappings_wrapper.appendChild(rowData.element);
    }
    mappings_wrapper.appendChild(dropIndicator);
    refreshRowOrder();

    const addBtn = (
      <button
        type="button"
        class="btn btn-sm btn-primary"
        style="width: 100%; margin-top: 2px;"
      >
        {_("Add Port Mapping")}
      </button>
    ) as HTMLButtonElement;

    addBtn.onclick = (e: MouseEvent) => {
      e.preventDefault();
      const new_index = rowRefs.length;
      const rowData = renderMappingRow("", new_index);
      rowRefs.push(rowData);
      mappings_wrapper.insertBefore(rowData.element, dropIndicator);
      refreshRowOrder();
    };

    const hiddenInput = (
      <input type="hidden" name={widget_id} value={current_values.join(" ")} />
    );

    this.hiddenInput = hiddenInput as HTMLInputElement;
    updateHiddenValue();
    const container = (
      <div class="cbi-value-field">
        {mappings_wrapper}
        {addBtn}
        {hiddenInput}
        <div class="cbi-value-description">
          {_(
            "Configure port forwarding rules. Listen Port and Target Port support single port (8080) or port range (8080-8090). Drag the handle to reorder mappings.",
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
  isChanged(section_id: string): boolean {
    const cfg = this.cfgvalue(section_id) || [];
    const form = this.formvalue(section_id) || [];
    if (cfg.length !== form.length) return true;
    for (let i = 0; i < cfg.length; i++) {
      if (cfg[i] !== form[i]) return true;
    }
    return false;
  }
  formvalue(_section_id: string) {
    if (this.hiddenInput?.value) {
      const parts = this.hiddenInput.value.split(/\s+/).filter(Boolean);
      return Array.from(new Set(parts));
    }
    return null;
  }
  write(section_id: string, formvalue: string | string[]): null {
    if (formvalue && formvalue.length > 0) {
      L.uci.set("portweaver", section_id, "port_mapping", formvalue);
    } else {
      L.uci.unset("portweaver", section_id, "port_mapping");
    }
    return null;
  }
  validate = (_section_id: string, value: unknown): string | boolean => {
    // 验证端口映射格式
    if (!value) {
      this.validationError = "";
      this.isValidFlag = true;
      return true;
    }

    const valueStr = Array.isArray(value) ? value.join(" ") : String(value);
    const mappings = valueStr.split(/\s+/).filter(Boolean);

    for (const mappingStr of mappings) {
      const parsed = PortMappingUtils.parse(mappingStr);

      if (!parsed) {
        this.validationError = _("Invalid port mapping format");
        this.isValidFlag = false;
        return _("Invalid port mapping format");
      }

      const validationError = PortMappingUtils.validate(parsed);
      if (validationError) {
        this.validationError = validationError;
        this.isValidFlag = false;
        return validationError;
      }
    }

    this.validationError = "";
    this.isValidFlag = true;
    return true;
  };
  isValid(section_id: string): boolean {
    for (const errorEl of this.errorDivRefs) {
      const isVisible = errorEl.style.display !== "none";
      const hasText = errorEl.textContent && errorEl.textContent.trim() !== "";

      if (isVisible && hasText) {
        this.validationError = errorEl.textContent || _("Validation failed");
        this.isValidFlag = false;
        return false;
      }
    }

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
