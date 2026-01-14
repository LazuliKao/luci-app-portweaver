'use strict';
'require firewall as fwmodel';
'require tools.widgets as widgets';


// UNUSED EXPORTS: default

;// CONCATENATED MODULE: ./utils/jsx-factory.ts
function jsx_factory_createJsxElement(tag, props, ...children) {
    const flatChildren = [];
    const pushChild = (child)=>{
        if (Array.isArray(child)) {
            child.forEach(pushChild);
            return;
        }
        if (child === null || child === undefined || child === false) return;
        flatChildren.push(child);
    };
    children.forEach(pushChild);
    const childArg = flatChildren.length === 0 ? undefined : flatChildren.length === 1 ? flatChildren[0] : flatChildren;
    return E(tag, props || {}, childArg);
}
globalThis.createJsxElement = jsx_factory_createJsxElement;

;// CONCATENATED MODULE: ./utils/formatters.ts
function formatBytes(bytes = 0) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(2)} KiB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(2)} MiB`;
    return `${(bytes / 1073741824).toFixed(2)} GiB`;
}
function formatUptime(seconds = 0) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor(seconds % 86400 / 3600);
    const mins = Math.floor(seconds % 3600 / 60);
    const sec = seconds % 60;
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m${sec}s`;
}
function getErrorMessage(error_code) {
    if (error_code === undefined || error_code === 0) return null;
    const messages = {
        '0': 'OK',
        '-1': 'Memory allocation failed',
        '-2': 'Failed to bind to port',
        '-3': 'Address or port already in use (EADDRINUSE)',
        '-4': 'Permission denied - unable to bind to port (EACCES)',
        '-5': 'Invalid address format',
        '-98': 'Address already in use',
        '-91': 'Protocol wrong type for socket',
        '-92': 'Protocol not available',
        '-93': 'Protocol not supported',
        '-94': 'Socket type not supported',
        '-95': 'Operation not supported on transport endpoint',
        '-96': 'Protocol family not supported',
        '-97': 'Address family not supported by protocol',
        '-99': 'Cannot assign requested address',
        '-100': 'Network is down',
        '-101': 'Network is unreachable'
    };
    return messages[String(error_code)] || `Unknown error (code: ${error_code})`;
}

;// CONCATENATED MODULE: ./utils/rpc-client.ts
function createRpcClient(rpc) {
    const getStatus = rpc.declare({
        object: 'portweaver',
        method: 'get_status',
        expect: {}
    });
    const listProjects = rpc.declare({
        object: 'portweaver',
        method: 'list_projects',
        expect: {}
    });
    const setEnabled = rpc.declare({
        object: 'portweaver',
        method: 'set_enabled',
        params: [
            'id',
            'enabled'
        ],
        expect: {}
    });
    return {
        getStatus,
        listProjects,
        setEnabled
    };
}

;// CONCATENATED MODULE: ./components/StatusPanel.tsx

class StatusPanel {
    constructor(){}
    render(status) {
        const statusColor = {
            running: '#28a745',
            stopped: '#dc3545',
            degraded: '#ffc107'
        }[status.status || ''] || '#6c757d';
        return /*#__PURE__*/ createJsxElement("div", {
            style: "display: grid; grid-template-columns: repeat(3, 1fr); gap: 1em; margin-top: 0.5em;"
        }, this.card(_('Status'), /*#__PURE__*/ createJsxElement("strong", {
            style: `color: ${statusColor}; font-size: 1.1em; font-weight: 600;`,
            id: "status-value"
        }, status.status || '-')), this.card(_('Total Projects'), /*#__PURE__*/ createJsxElement("strong", {
            style: "font-size: 1.1em; font-weight: 600;",
            id: "total-projects-value"
        }, status.total_projects || 0)), this.card(_('Active Ports'), /*#__PURE__*/ createJsxElement("strong", {
            style: "font-size: 1.1em; font-weight: 600;",
            id: "active-ports-value"
        }, status.active_ports || 0)), this.card(_('Uptime'), /*#__PURE__*/ createJsxElement("strong", {
            style: "font-size: 1.1em; font-weight: 600;",
            id: "uptime-value"
        }, formatUptime(status.uptime || 0))), this.card(_('Traffic In'), /*#__PURE__*/ createJsxElement("strong", {
            style: "font-size: 1.1em; font-weight: 600;",
            id: "traffic-in-value"
        }, formatBytes(status.total_bytes_in || 0))), this.card(_('Traffic Out'), /*#__PURE__*/ createJsxElement("strong", {
            style: "font-size: 1.1em; font-weight: 600;",
            id: "traffic-out-value"
        }, formatBytes(status.total_bytes_out || 0))));
    }
    card(label, valueEl) {
        return /*#__PURE__*/ createJsxElement("div", {
            style: "border: 1px solid #dee2e6; padding: 0.8em; border-radius: 4px; background: transparent;"
        }, /*#__PURE__*/ createJsxElement("div", {
            style: "font-size: 0.85em; color: #6c757d; margin-bottom: 0.3em;"
        }, label), valueEl);
    }
}

;// CONCATENATED MODULE: ./components/FrpNodeSelector.tsx
function createFrpNodeSelector(form, uci) {
    return form.DummyValue.extend({
        renderWidget: function(section_id, option_index, cfgvalue) {
            var frp_sections = uci.sections('portweaver', 'frp_node') || [];
            var current_value = Array.isArray(cfgvalue) ? cfgvalue : typeof cfgvalue === 'string' ? String(cfgvalue).split(/\s+/).filter(Boolean) : [];
            var node_map = {};
            for(var i = 0; i < current_value.length; i++){
                var parts = current_value[i].split(':');
                var node = parts[0];
                var port = parts[1] || '';
                node_map[node] = port;
            }
            var widget_id = this.cbid(section_id);
            var updateHandler = function() {
                var wid = this.getAttribute('data-widget-id');
                var checkboxes = document.querySelectorAll('input.frp-node-checkbox[data-widget-id="' + wid + '"]');
                var values = [];
                for(var j = 0; j < checkboxes.length; j++){
                    var cb = checkboxes[j];
                    if (cb.checked) {
                        var node = cb.getAttribute('data-node');
                        var port_inp = document.querySelector('input.frp-node-port[data-widget-id="' + wid + '"][data-node="' + node + '"]');
                        var port = port_inp ? port_inp.value.trim() : '';
                        if (port) {
                            var p = parseInt(port, 10);
                            if (isNaN(p) || p < 1 || p > 65535) {
                                if (port_inp) port_inp.style.setProperty('border-color', 'red', 'important');
                                continue;
                            } else if (port_inp) port_inp.style.borderColor = '';
                            values.push(node + ':' + port);
                        } else values.push(node);
                    }
                }
                var hidden = document.querySelector('input[id="' + wid + '"]');
                if (hidden) hidden.value = values.join(' ');
            };
            var container = E('div', {
                'class': 'cbi-value-field'
            });
            if (frp_sections.length === 0) container.appendChild(E('em', {
                'style': 'color: #999;'
            }, _('No FRP nodes configured. Please add FRP nodes first.')));
            else {
                var table = E('table', {
                    'class': 'table',
                    'style': 'margin: 0; width: auto;'
                });
                for(var i = 0; i < frp_sections.length; i++){
                    var node_name = frp_sections[i]['name'] || frp_sections[i]['.name'];
                    if (!node_name) continue;
                    var is_checked = Object.prototype.hasOwnProperty.call(node_map, node_name);
                    var port_value = node_map[node_name] || '';
                    var checkbox = E('input', {
                        'type': 'checkbox',
                        'class': 'frp-node-checkbox',
                        'data-widget-id': widget_id,
                        'data-node': node_name,
                        'data-section': section_id,
                        'checked': is_checked ? 'checked' : null,
                        'style': 'margin-right: 8px;'
                    });
                    var port_input = E('input', {
                        'type': 'text',
                        'class': 'frp-node-port',
                        'data-widget-id': widget_id,
                        'data-node': node_name,
                        'data-section': section_id,
                        'value': port_value,
                        'placeholder': _('default port'),
                        'style': 'min-width: 100px !important; width: calc(100% - 80px) !important; margin-left: 10px;',
                        'disabled': is_checked ? null : 'disabled'
                    });
                    checkbox.addEventListener('change', function() {
                        var wid = this.getAttribute('data-widget-id');
                        var node = this.getAttribute('data-node');
                        var port_inp = document.querySelector('input.frp-node-port[data-widget-id="' + wid + '"][data-node="' + node + '"]');
                        if (port_inp) {
                            port_inp.disabled = !this.checked;
                            if (!this.checked) port_inp.value = '';
                        }
                        updateHandler.call(this);
                    });
                    port_input.addEventListener('input', updateHandler);
                    port_input.addEventListener('change', updateHandler);
                    var row = E('tr', {}, [
                        E('td', {
                            'style': 'padding: 4px 8px; border: none;'
                        }, [
                            checkbox,
                            E('label', {
                                'style': 'cursor: pointer; font-weight: normal; margin: 0;'
                            }, node_name)
                        ]),
                        E('td', {
                            'style': 'padding: 4px 8px; border: none;'
                        }, [
                            E('label', {
                                'style': 'margin-right: 5px; color: #666;'
                            }, _('Port:')),
                            port_input
                        ])
                    ]);
                    table.appendChild(row);
                }
                container.appendChild(table);
            }
            var hidden = E('input', {
                'type': 'hidden',
                'id': widget_id,
                'name': widget_id,
                'value': current_value.join(' ')
            });
            container.appendChild(hidden);
            var description = E('div', {
                'class': 'cbi-value-description'
            }, _('Select FRP nodes and optionally specify custom ports. Leave port empty to use default.'));
            container.appendChild(description);
            return container;
        },
        cfgvalue: function(section_id) {
            var value = uci.get('portweaver', section_id, 'frp_nodes');
            if (Array.isArray(value)) return value;
            if (typeof value === 'string') return String(value).split(/\s+/).filter(Boolean);
            return [];
        },
        formvalue: function(section_id) {
            var widget_id = this.cbid(section_id);
            var hidden = document.getElementById(widget_id);
            if (hidden && hidden.value) return hidden.value.split(/\s+/).filter(Boolean);
            return null;
        },
        write: function(section_id, formvalue) {
            if (formvalue && formvalue.length > 0) return uci.set('portweaver', section_id, 'frp_nodes', formvalue);
            else return uci.unset('portweaver', section_id, 'frp_nodes');
        }
    });
}

;// CONCATENATED MODULE: ./components/PortMappingEditor.tsx
function createPortMappingEditor(form, uci) {
    return form.DummyValue.extend({
        parseMapping: function(str) {
            if (!str || typeof str !== 'string') return null;
            str = str.trim();
            var mapping = {
                listenPort: '',
                targetPort: '',
                frpNodes: [],
                protocol: 'tcp'
            };
            var protocolMatch = str.match(/\/([a-z]+)$/);
            if (protocolMatch) {
                mapping.protocol = protocolMatch[1].toLowerCase();
                str = str.substring(0, protocolMatch.index);
            }
            var i = 0;
            while(str[i] === '['){
                var end = str.indexOf(']', i);
                if (end === -1) break;
                var content = str.substring(i + 1, end);
                if (content.indexOf(':') !== -1 || /[a-zA-Z_-]/.test(content)) {
                    mapping.frpNodes.push(content);
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
            var rest = str.substring(i);
            if (!mapping.listenPort) {
                var parts0 = rest.split(':');
                if (parts0.length >= 1) mapping.listenPort = parts0[0].trim().replace(/[\[\]]/g, '');
                if (parts0.length >= 2) mapping.targetPort = parts0[1].trim().replace(/[\[\]]/g, '');
            } else if (rest.startsWith(':')) mapping.targetPort = rest.substring(1).trim().replace(/[\[\]]/g, '');
            return mapping;
        },
        buildString: function(mapping) {
            var result = '';
            if (mapping.frpNodes && mapping.frpNodes.length > 0) mapping.frpNodes.forEach(function(node) {
                result += '[' + node + ']';
            });
            if (mapping.listenPort) {
                if (mapping.frpNodes && mapping.frpNodes.length > 0) result += '[' + mapping.listenPort + ']';
                else result += mapping.listenPort;
            }
            if (mapping.targetPort) result += ':' + mapping.targetPort;
            if (mapping.protocol) result += '/' + mapping.protocol;
            return result;
        },
        renderWidget: function(section_id, _option_index, cfgvalue) {
            const frp_sections = uci.sections('portweaver', 'frp_node') || [];
            const current_values = Array.isArray(cfgvalue) ? cfgvalue : typeof cfgvalue === 'string' ? String(cfgvalue).split(/\s+/).filter(Boolean) : [];
            const widget_id = this.cbid(section_id);
            const self = this;
            const mappings_wrapper = /*#__PURE__*/ createJsxElement("div", {
                id: `portmapping-wrapper-${section_id}`
            });
            const updateHiddenValue = ()=>{
                const rows = mappings_wrapper.querySelectorAll('.portmapping-row');
                const values = [];
                rows.forEach((r)=>{
                    const listen = r.querySelector('.listen-port-input').value.trim();
                    const target = r.querySelector('.target-port-input').value.trim();
                    const protocol = r.querySelector('.protocol-select').value;
                    const frpNodes = [];
                    const checkboxes = r.querySelectorAll('input.frp-node-checkbox-pm');
                    checkboxes.forEach((cb)=>{
                        if (cb.checked) {
                            const node = cb.getAttribute('data-node');
                            const port_inp = r.querySelector('input.frp-node-port-pm[data-node="' + node + '"]');
                            const port = port_inp ? port_inp.value.trim() : '';
                            frpNodes.push(port ? node + ':' + port : node);
                        }
                    });
                    const temp = {
                        listenPort: listen,
                        targetPort: target,
                        frpNodes: frpNodes,
                        protocol: protocol
                    };
                    const str = self.buildString(temp);
                    if (str && listen && target) values.push(str);
                });
                const hidden = document.getElementById('portmapping-hidden-' + section_id);
                if (hidden) hidden.value = values.join(' ');
            };
            const renderMappingRow = (mapping_str, index)=>{
                const mapping = self.parseMapping(mapping_str) || {
                    listenPort: '',
                    targetPort: '',
                    frpNodes: [],
                    protocol: 'tcp'
                };
                const row_id = 'portmapping-row-' + section_id + '-' + index;
                let isTextMode = false;
                const listenInput = /*#__PURE__*/ createJsxElement("input", {
                    type: "text",
                    class: "listen-port-input",
                    "data-index": index,
                    "data-section": section_id,
                    value: mapping.listenPort,
                    placeholder: _('8080 or 8080-8090'),
                    style: "width: 70px; min-width: 50px; margin-right: 10px;"
                });
                const targetInput = /*#__PURE__*/ createJsxElement("input", {
                    type: "text",
                    class: "target-port-input",
                    "data-index": index,
                    "data-section": section_id,
                    value: mapping.targetPort,
                    placeholder: _('80 or 80-90'),
                    style: "width: 70px; min-width: 50px; margin-right: 10px;"
                });
                const protocolSelect = /*#__PURE__*/ createJsxElement("select", {
                    class: "protocol-select",
                    "data-index": index,
                    "data-section": section_id,
                    style: "width: 100px; margin-right: 10px;"
                }, /*#__PURE__*/ createJsxElement("option", {
                    value: "tcp",
                    selected: mapping.protocol === 'tcp' ? 'selected' : null
                }, "TCP"), /*#__PURE__*/ createJsxElement("option", {
                    value: "udp",
                    selected: mapping.protocol === 'udp' ? 'selected' : null
                }, "UDP"), /*#__PURE__*/ createJsxElement("option", {
                    value: "both",
                    selected: mapping.protocol === 'both' ? 'selected' : null
                }, "Both"));
                const textModeInput = /*#__PURE__*/ createJsxElement("input", {
                    type: "text",
                    class: "text-mode-input",
                    value: mapping_str,
                    placeholder: _('[8080][node1:9888]:80/tcp or 8080:80/tcp'),
                    style: "width: 100%; margin-bottom: 10px; padding: 5px; display: none;"
                });
                const previewDiv = /*#__PURE__*/ createJsxElement("div", {
                    class: "portmapping-preview",
                    "data-index": index,
                    style: "margin-top: 8px; padding: 8px; background: #e8f4f8; border-left: 3px solid #0088cc; font-family: monospace; font-size: 12px;"
                }, _('Preview: '), self.buildString(mapping));
                const updatePreview = ()=>{
                    const listen = listenInput.value.trim();
                    const target = targetInput.value.trim();
                    const protocol = protocolSelect.value;
                    const frpNodes = [];
                    const allFrpCheckboxes = row.querySelectorAll('input.frp-node-checkbox-pm');
                    allFrpCheckboxes.forEach((cb)=>{
                        if (cb.checked) {
                            const node = cb.getAttribute('data-node');
                            const port_inp = row.querySelector('input.frp-node-port-pm[data-node="' + node + '"]');
                            const port = port_inp ? port_inp.value.trim() : '';
                            frpNodes.push(port ? node + ':' + port : node);
                        }
                    });
                    const temp_mapping = {
                        listenPort: listen,
                        targetPort: target,
                        frpNodes: frpNodes,
                        protocol: protocol
                    };
                    const preview_str = self.buildString(temp_mapping);
                    previewDiv.textContent = _('Preview: ') + preview_str;
                    textModeInput.value = preview_str;
                };
                const frpContainer = /*#__PURE__*/ createJsxElement("div", {
                    class: "frp-nodes-select",
                    style: "margin-top: 10px; padding: 10px; background: #f0f0f0; border-radius: 3px; display: block;"
                });
                if (frp_sections.length > 0) {
                    frpContainer.appendChild(/*#__PURE__*/ createJsxElement("label", {
                        style: "display: block; margin-bottom: 8px; font-weight: bold;"
                    }, _('FRP Nodes (Optional):')));
                    frp_sections.forEach((frp_section)=>{
                        const node_name = frp_section['name'] || frp_section['.name'];
                        if (!node_name) return;
                        const is_checked = (mapping.frpNodes || []).some((n)=>n.split(':')[0] === node_name);
                        const found = (mapping.frpNodes || []).find((n)=>n.split(':')[0] === node_name);
                        const port_value = found ? found.split(':')[1] || '' : '';
                        const checkbox = /*#__PURE__*/ createJsxElement("input", {
                            type: "checkbox",
                            class: "frp-node-checkbox-pm",
                            "data-node": node_name,
                            "data-index": index,
                            "data-section": section_id,
                            checked: is_checked ? 'checked' : null,
                            style: "margin-right: 5px;"
                        });
                        const port_input = /*#__PURE__*/ createJsxElement("input", {
                            type: "text",
                            class: "frp-node-port-pm",
                            "data-node": node_name,
                            "data-index": index,
                            "data-section": section_id,
                            value: port_value,
                            placeholder: _('default'),
                            style: "width: 80px; margin-right: 15px;",
                            disabled: is_checked ? null : 'disabled'
                        });
                        checkbox.onchange = (ev)=>{
                            const inputEl = ev.currentTarget;
                            if (!inputEl) return;
                            port_input.disabled = !inputEl.checked;
                            if (!inputEl.checked) {
                                port_input.value = '';
                                port_input.style.borderColor = '';
                            }
                            updatePreview();
                            updateHiddenValue();
                        };
                        const handlePortChange = ()=>{
                            const port = port_input.value.trim();
                            if (port) {
                                const p = parseInt(port, 10);
                                if (isNaN(p) || p < 1 || p > 65535) port_input.style.setProperty('border-color', 'red', 'important');
                                else port_input.style.borderColor = '';
                            } else port_input.style.borderColor = '';
                            updatePreview();
                            updateHiddenValue();
                        };
                        port_input.oninput = handlePortChange;
                        port_input.onchange = handlePortChange;
                        frpContainer.appendChild(/*#__PURE__*/ createJsxElement("div", {
                            style: "margin-bottom: 5px;"
                        }, checkbox, /*#__PURE__*/ createJsxElement("label", {
                            style: "margin-right: 10px; cursor: pointer;"
                        }, node_name), /*#__PURE__*/ createJsxElement("label", {
                            style: "margin-right: 5px;"
                        }, _('Port:')), port_input));
                    });
                } else frpContainer.appendChild(/*#__PURE__*/ createJsxElement("em", {
                    style: "color: #999;"
                }, _('No FRP nodes configured')));
                const errorDiv = /*#__PURE__*/ createJsxElement("div", {
                    class: "portmapping-error",
                    "data-index": index,
                    style: "color: red; margin-top: 8px; min-height: 20px; font-size: 12px;"
                });
                const titleRow = /*#__PURE__*/ createJsxElement("div", {
                    style: "display: flex; gap: 10px; align-items: center;"
                }, /*#__PURE__*/ createJsxElement("label", {
                    style: "min-width: 80px; font-weight: bold;"
                }, _('Listen Port:')), listenInput, /*#__PURE__*/ createJsxElement("label", {
                    style: "min-width: 80px; font-weight: bold;"
                }, _('Target Port:')), targetInput, /*#__PURE__*/ createJsxElement("label", {
                    style: "min-width: 60px; font-weight: bold;"
                }, _('Protocol:')), protocolSelect);
                const modeToggleBtn = /*#__PURE__*/ createJsxElement("button", {
                    type: "button",
                    class: "btn btn-xs",
                    style: "margin-bottom: 10px; margin-right: 10px;"
                }, _('Text Edit'));
                const deleteBtn = /*#__PURE__*/ createJsxElement("button", {
                    type: "button",
                    class: "btn btn-sm btn-danger",
                    "data-index": index,
                    "data-section": section_id,
                    style: "margin-top: 10px; margin-left: 10px;"
                }, _('Delete'));
                const row = /*#__PURE__*/ createJsxElement("div", {
                    id: row_id,
                    class: "portmapping-row",
                    "data-index": index,
                    style: "margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;"
                }, modeToggleBtn, deleteBtn, /*#__PURE__*/ createJsxElement("br", null), titleRow, textModeInput, frpContainer, errorDiv, previewDiv);
                const updatePreviewAndHidden = ()=>{
                    updatePreview();
                    updateHiddenValue();
                };
                listenInput.oninput = updatePreviewAndHidden;
                listenInput.onchange = updatePreviewAndHidden;
                targetInput.oninput = updatePreviewAndHidden;
                targetInput.onchange = updatePreviewAndHidden;
                protocolSelect.onchange = updatePreviewAndHidden;
                textModeInput.oninput = (ev)=>{
                    const inputEl = ev.currentTarget;
                    if (!inputEl) return;
                    const parsed = self.parseMapping(inputEl.value);
                    if (parsed) {
                        listenInput.value = parsed.listenPort;
                        targetInput.value = parsed.targetPort;
                        protocolSelect.value = parsed.protocol;
                        const allCheckboxes = row.querySelectorAll('input.frp-node-checkbox-pm');
                        allCheckboxes.forEach((cb)=>{
                            const node = cb.getAttribute('data-node');
                            const is_checked = (parsed.frpNodes || []).some((n)=>n.split(':')[0] === node);
                            cb.checked = is_checked;
                            const port_inp = row.querySelector('input.frp-node-port-pm[data-node="' + node + '"]');
                            if (port_inp) {
                                port_inp.disabled = !is_checked;
                                if (is_checked) {
                                    const foundNode = (parsed.frpNodes || []).find((n)=>n.split(':')[0] === node);
                                    if (foundNode) {
                                        const parts = foundNode.split(':');
                                        port_inp.value = parts.length > 1 ? parts[1] : '';
                                    }
                                } else port_inp.value = '';
                            }
                        });
                        updateHiddenValue();
                    }
                };
                modeToggleBtn.onclick = function(e) {
                    e.preventDefault();
                    isTextMode = !isTextMode;
                    titleRow.style.display = isTextMode ? 'none' : 'flex';
                    frpContainer.style.display = isTextMode ? 'none' : 'block';
                    textModeInput.style.display = isTextMode ? 'block' : 'none';
                    previewDiv.style.display = isTextMode ? 'none' : 'block';
                    modeToggleBtn.textContent = isTextMode ? _('Visual Edit') : _('Text Edit');
                };
                deleteBtn.onclick = function(e) {
                    e.preventDefault();
                    row.remove();
                    updateHiddenValue();
                };
                return row;
            };
            for(let i = 0; i < current_values.length; i++)mappings_wrapper.appendChild(renderMappingRow(current_values[i], i));
            const addBtn = /*#__PURE__*/ createJsxElement("button", {
                type: "button",
                class: "btn btn-sm btn-primary",
                style: "margin-bottom: 10px;"
            }, _('Add Port Mapping'));
            addBtn.onclick = function(e) {
                e.preventDefault();
                const rows = mappings_wrapper.querySelectorAll('.portmapping-row');
                const new_index = rows.length;
                mappings_wrapper.appendChild(renderMappingRow('', new_index));
            };
            const hidden = /*#__PURE__*/ createJsxElement("input", {
                type: "hidden",
                id: `portmapping-hidden-${section_id}`,
                name: widget_id,
                value: current_values.join(' ')
            });
            const container = /*#__PURE__*/ createJsxElement("div", {
                class: "cbi-value-field"
            }, addBtn, mappings_wrapper, hidden, /*#__PURE__*/ createJsxElement("div", {
                class: "cbi-value-description"
            }, _('Configure port forwarding rules. Listen Port and Target Port support single port (8080) or port range (8080-8090).')));
            return container;
        },
        cfgvalue: function(section_id) {
            var value = uci.get('portweaver', section_id, 'port_mapping');
            if (Array.isArray(value)) return value;
            if (typeof value === 'string') return String(value).split(/\s+/).filter(Boolean);
            return [];
        },
        formvalue: function(section_id) {
            var hidden = document.getElementById('portmapping-hidden-' + section_id);
            if (hidden && hidden.value) return hidden.value.split(/\s+/).filter(Boolean);
            return null;
        },
        write: function(section_id, formvalue) {
            if (formvalue && formvalue.length > 0) return uci.set('portweaver', section_id, 'port_mapping', formvalue);
            else return uci.unset('portweaver', section_id, 'port_mapping');
        }
    });
}

;// CONCATENATED MODULE: ./main.tsx






const main_rpc = L.rpc;
const view = L.view;
const main_form = L.form;
const ui = L.ui;
const main_uci = L.uci;
const poll = L.Poll;
const rpcClient = createRpcClient(main_rpc);
/* export default */ const main = (view.extend({
    load: function() {
        return Promise.all([
            main_uci.load('portweaver'),
            main_uci.load('firewall'),
            rpcClient.getStatus().then(function(res) {
                return res || {};
            }).catch(function(err) {
                console.warn('ubus get_status failed:', err);
                return {};
            }),
            rpcClient.listProjects().then(function(res) {
                return res || {
                    projects: []
                };
            }).catch(function(err) {
                console.warn('ubus list_projects failed:', err);
                return {
                    projects: []
                };
            })
        ]);
    },
    render: function(data) {
        var m, s, o;
        var globalStatus = data[2] || {};
        var projectStatuses = data[3] ? data[3].projects || [] : [];
        var getProjectIndex = function(section_id) {
            var sections = main_uci.sections('portweaver', 'project');
            for(var i = 0; i < sections.length; i++){
                if (sections[i]['.name'] === section_id) return i;
            }
            return -1;
        };
        var getProjectStatus = function(section_id) {
            var idx = getProjectIndex(section_id);
            return idx >= 0 && projectStatuses && projectStatuses[idx] ? projectStatuses[idx] : null;
        };
        function renderStatusElements(status, _section_id) {
            if (!status) return [
                E('span', {
                    'style': 'color: gray;'
                }, _('N/A'))
            ];
            var startupFailed = status.startup_status === 'failed';
            var statusColor = status.status === 'running' && !startupFailed ? 'green' : '#dc3545';
            var errorMessage = null;
            if (startupFailed && status.error_code !== undefined && status.error_code !== 0) errorMessage = getErrorMessage(status.error_code);
            var statusBadgeAttrs = {
                'class': 'ifacebadge',
                'style': ''
            };
            if (errorMessage) {
                statusBadgeAttrs.title = errorMessage;
                statusBadgeAttrs.style += ' cursor: help;';
            }
            var statusElements = [
                E('div', {}, [
                    E('span', statusBadgeAttrs, [
                        E('strong', {
                            style: 'font-size: 1em; font-weight: 600; color: ' + statusColor + ';'
                        }, startupFailed ? 'failed' : status.status || 'unknown')
                    ])
                ])
            ];
            if (errorMessage && status.status !== 'stopped') statusElements.push(E('small', {
                'style': 'color: #dc3545; margin-top: 0.3em;'
            }, [
                "\u26A0 " + errorMessage
            ]));
            else {
                let elements = [];
                if ((status.active_ports || 0) > 0) {
                    elements.push(E('span', {}, _('Ports: ') + (status.active_ports || 0)));
                    elements.push(E('br'));
                }
                if ((status.bytes_in || 0) && (status.bytes_out || 0)) elements.push(E('span', {}, "\u2193 " + formatBytes(status.bytes_in || 0) + " \u2191 " + formatBytes(status.bytes_out || 0)));
                statusElements.push(E('small', {}, elements));
            }
            return statusElements;
        }
        m = new main_form.Map('portweaver', _('PortWeaver'), _('Port forwarding and NAT traversal configuration'));
        // Setup auto-refresh
        poll.add(function() {
            var updateText = function(id, value) {
                var elem = document.getElementById(id);
                if (elem) elem.textContent = String(value);
            };
            return Promise.all([
                rpcClient.getStatus(),
                rpcClient.listProjects()
            ]).then(function(results) {
                globalStatus = results[0] || {};
                projectStatuses = results[1] && results[1].projects ? results[1].projects : [];
                var statusElem = document.getElementById('status-value');
                var statusColors = {
                    'running': 'green',
                    'stopped': 'red',
                    'degraded': 'orange'
                };
                if (statusElem) {
                    statusElem.textContent = globalStatus.status || '-';
                    statusElem.style.color = statusColors[globalStatus.status || ''] || 'gray';
                }
                updateText('total-projects-value', globalStatus.total_projects || 0);
                updateText('active-ports-value', globalStatus.active_ports || 0);
                updateText('uptime-value', formatUptime(globalStatus.uptime || 0));
                updateText('traffic-in-value', formatBytes(globalStatus.total_bytes_in || 0));
                updateText('traffic-out-value', formatBytes(globalStatus.total_bytes_out || 0));
                (function() {
                    var sections = main_uci.sections('portweaver', 'project') || [];
                    for(var i = 0; i < sections.length; i++){
                        var section_id = sections[i]['.name'];
                        var status = getProjectStatus(section_id);
                        var section = document.getElementById('project-status-' + section_id);
                        if (!section) continue;
                        var newStatusElements = renderStatusElements(status, section_id);
                        section.replaceWith(E('div', {
                            'id': 'project-status-' + section_id
                        }, newStatusElements));
                    }
                })();
            }).catch(function(err) {
                console.warn('Auto-refresh failed:', err);
            });
        }, 3);
        // Global settings section
        s = m.section(main_form.NamedSection, 'global', 'global', _('Global Settings'));
        o = s.option(main_form.Flag, 'enabled', _('Enable PortWeaver'));
        o.default = '1';
        o.rmempty = false;
        // Runtime status display (component)
        o = s.option(main_form.DummyValue, '_runtime_status', _('Runtime Status'));
        o.rawhtml = true;
        o.cfgvalue = function() {
            var panel = new StatusPanel();
            return panel.render(globalStatus);
        };
        // Helper to toggle runtime enable via RPC
        var runtimeToggle = function(section_id) {
            var idx = getProjectIndex(section_id);
            if (idx < 0) {
                ui.addNotification(null, E('p', _('Could not determine project index')), 'error');
                return Promise.resolve();
            }
            var status = getProjectStatus(section_id);
            var newEnabled = !(status && status.enabled);
            return rpcClient.setEnabled(idx, !!newEnabled).then(function() {
                ui.addNotification(null, E('p', _('Runtime state updated to: ') + (newEnabled ? _('enabled') : _('disabled'))), 'info');
                return Promise.all([
                    rpcClient.getStatus(),
                    rpcClient.listProjects()
                ]).then(function(results) {
                    globalStatus = results[0] || {};
                    projectStatuses = results[1] && results[1].projects ? results[1].projects : [];
                    location.reload();
                });
            }).catch(function(err) {
                ui.addNotification(null, E('p', _('Failed to toggle runtime state: ') + (err?.message || String(err))), 'error');
            });
        };
        window.portweaverToggle = runtimeToggle;
        // Port forwarding rules section
        s = m.section(main_form.GridSection, 'project', _('Port Forwarding Projects'), _('Configure port forwarding projects for PortWeaver'));
        s.anonymous = true;
        s.addremove = true;
        s.sortable = true;
        s.cloneable = true;
        s.sectiontitle = function(section_id) {
            return main_uci.get('portweaver', section_id, 'remark') || _('Unnamed project');
        };
        // Runtime status indicator column
        o = s.option(main_form.DummyValue, '_runtime_status', _('Status'));
        o.modalonly = false;
        o.textvalue = function(section_id) {
            var status = getProjectStatus(section_id);
            return E('div', {
                'id': 'project-status-' + section_id
            }, renderStatusElements(status, section_id));
        };
        // Runtime toggle column
        o = s.option(main_form.Button, '_runtime_toggle', _('Toggle'));
        o.modalonly = false;
        o.editable = true;
        o.inputtitle = function(section_id) {
            var status = getProjectStatus(section_id);
            return status && status.enabled ? _('Disable') : _('Enable');
        };
        o.onclick = function(_ev, section_id) {
            return window.portweaverToggle(section_id);
        };
        o = s.option(main_form.Flag, 'enabled', _('Enabled'));
        o.modalonly = false;
        o.default = '1';
        o.editable = true;
        // Preview column
        o = s.option(main_form.DummyValue, '_preview', _('Overview'));
        o.modalonly = false;
        o.textvalue = function(section_id) {
            var protocol = main_uci.get('portweaver', section_id, 'protocol') || 'tcp';
            var family = main_uci.get('portweaver', section_id, 'family') || 'any';
            var listen_port = main_uci.get('portweaver', section_id, 'listen_port') || '';
            var target_address = main_uci.get('portweaver', section_id, 'target_address') || '';
            var target_port = main_uci.get('portweaver', section_id, 'target_port') || '';
            var port_mappings = L.toArray(main_uci.get('portweaver', section_id, 'port_mapping'));
            var src_zones = L.toArray(main_uci.get('portweaver', section_id, 'src_zone'));
            var dest_zones = L.toArray(main_uci.get('portweaver', section_id, 'dest_zone'));
            var proto_text = {
                'both': _('TCP and UDP'),
                'tcp': 'TCP',
                'udp': 'UDP'
            }[protocol] || String(protocol).toUpperCase();
            var family_text = {
                'any': _('IPv4 and IPv6'),
                'ipv4': 'IPv4',
                'ipv6': 'IPv6'
            }[family] || family;
            var lines = [];
            lines.push(E('span', {}, [
                _('Incoming '),
                E('var', {}, family_text),
                _(' protocol '),
                E('var', {}, proto_text)
            ]));
            if (src_zones.length > 0) {
                var src_badges = src_zones.map(function(z) {
                    return E('span', {
                        'class': 'zonebadge',
                        'style': fwmodel.getZoneColorStyle(z)
                    }, [
                        E('strong', {}, z || E('em', _('any zone')))
                    ]);
                });
                lines.push(E('br'));
                lines.push(E('span', {}, [
                    _('From '),
                    ...src_badges
                ]));
            }
            if (port_mappings.length > 0) {
                lines.push(E('br'));
                lines.push(E('span', {}, [
                    E('strong', {
                        style: 'color: #09c;'
                    }, _('Multi-Port')),
                    _(' - '),
                    E('var', {}, port_mappings.length),
                    _(' mapping(s)')
                ]));
                var first = port_mappings[0];
                lines.push(E('br'));
                lines.push(E('span', {}, [
                    _('e.g. '),
                    E('var', {}, first)
                ]));
            } else if (listen_port) {
                lines.push(E('br'));
                lines.push(E('span', {}, [
                    _('Port '),
                    E('var', {}, listen_port)
                ]));
            }
            lines.push(E('br'));
            lines.push(E('span', {}, [
                E('var', {
                    'data-tooltip': 'Forward'
                }, _('Forward')),
                _(' to ')
            ]));
            if (dest_zones.length > 0) {
                var dest_badges = dest_zones.map(function(z) {
                    return E('span', {
                        'class': 'zonebadge',
                        'style': fwmodel.getZoneColorStyle(z)
                    }, [
                        E('strong', {}, z || E('em', _('any zone')))
                    ]);
                });
                lines.push(...dest_badges);
                lines.push(_(' '));
            }
            if (target_address) lines.push(E('span', {}, [
                _('IP '),
                E('var', {}, target_address)
            ]));
            if (port_mappings.length === 0 && target_port) lines.push(E('span', {}, [
                _(' port '),
                E('var', {}, target_port)
            ]));
            return E('small', {}, lines);
        };
        // Modal configuration fields
        o = s.option(main_form.Value, 'remark', _('Remark'));
        o.modalonly = true;
        o.rmempty = false;
        o.datatype = 'string';
        o.validate = function(_section_id, value) {
            if (!value || String(value).trim() === '') return _('This field is required');
            return true;
        };
        o.placeholder = 'My Project';
        o = s.option(main_form.Flag, 'enabled', _('Enabled'));
        o.modalonly = true;
        o.default = '1';
        o = s.option(widgets.ZoneSelect, 'src_zone', _('Source Zones'));
        o.modalonly = true;
        o.multiple = true;
        o.nocreate = false;
        o.allowlocal = false;
        o.default = 'wan';
        o.rmempty = true;
        o = s.option(widgets.ZoneSelect, 'dest_zone', _('Destination Zones'));
        o.modalonly = true;
        o.multiple = true;
        o.nocreate = false;
        o.allowlocal = false;
        o.default = 'lan';
        o.rmempty = true;
        o = s.option(main_form.ListValue, 'family', _('Address Family'));
        o.modalonly = true;
        o.value('any', _('IPv4 and IPv6'));
        o.value('ipv4', 'IPv4');
        o.value('ipv6', 'IPv6');
        o.default = 'any';
        o = s.option(main_form.Value, 'target_address', _('Target Address'));
        o.modalonly = true;
        o.rmempty = false;
        o.datatype = 'host';
        o.placeholder = '192.168.1.100';
        o.validate = function(_section_id, value) {
            if (!value || String(value).trim() === '') return _('This field is required');
            return true;
        };
        // Port mode switcher
        o = s.option(main_form.Flag, 'use_port_mappings', _('Use Port Mappings Mode'));
        o.modalonly = true;
        o.rmempty = true;
        o.default = '0';
        o.description = _('Enable to configure multiple port mappings or port ranges. Disable for single port mode.');
        // Single port mode
        o = s.option(main_form.ListValue, 'protocol', _('Protocol'));
        o.modalonly = true;
        o.value('both', _('TCP and UDP'));
        o.value('tcp', 'TCP');
        o.value('udp', 'UDP');
        o.default = 'tcp';
        o.depends('use_port_mappings', '0');
        // FRP node selector component factory
        const FrpNodeSelector = createFrpNodeSelector(main_form, main_uci);
        o = s.option(FrpNodeSelector, 'frp_nodes', _('FRP Tunnels'));
        o.modalonly = true;
        o.rmempty = true;
        o.depends('use_port_mappings', '0');
        o.depends('enable_app_forward', '1');
        // Port Mapping Editor component factory
        const PortMappingEditor = createPortMappingEditor(main_form, main_uci);
        o = s.option(PortMappingEditor, 'port_mapping', _('Port Mappings'));
        o.modalonly = true;
        o.depends('use_port_mappings', '1');
        o = s.option(main_form.Value, 'listen_port', _('Listen Port'));
        o.modalonly = true;
        o.datatype = 'port';
        o.placeholder = '8080';
        o.depends('use_port_mappings', '0');
        o.validate = function(section_id, value) {
            var use_mappings = main_uci.get('portweaver', section_id, 'use_port_mappings');
            if (use_mappings !== '1') {
                if (!value || String(value).trim() === '') return _('This field is required in single port mode');
            }
            return true;
        };
        o = s.option(main_form.Value, 'target_port', _('Target Port'));
        o.modalonly = true;
        o.datatype = 'port';
        o.placeholder = '80';
        o.depends('use_port_mappings', '0');
        o.validate = function(section_id, value) {
            var use_mappings = main_uci.get('portweaver', section_id, 'use_port_mappings');
            if (use_mappings !== '1') {
                if (!value || String(value).trim() === '') return _('This field is required in single port mode');
            }
            return true;
        };
        o = s.option(main_form.Flag, 'open_firewall_port', _('Open Firewall Port'));
        o.modalonly = true;
        o.default = '1';
        o = s.option(main_form.Flag, 'enable_app_forward', _('Enable App Level Forward'));
        o.modalonly = true;
        o.default = '0';
        o = s.option(main_form.Flag, 'reuseaddr', _('Reuse Address'));
        o.modalonly = true;
        o.default = '1';
        o.depends('enable_app_forward', '1');
        o = s.option(main_form.Flag, 'enable_stats', _('Enable Statistics'), _("Collect traffic statistics (bytes_in/bytes_out) using zero-cost atomic counters. NOTE: Mutually exclusive with firewall forwarding - enabling stats will disable add_firewall_forward."));
        o.modalonly = true;
        o.default = '0';
        o.depends('enable_app_forward', '1');
        o = s.option(main_form.Flag, 'add_firewall_forward', _('Add Firewall Forward'));
        o.modalonly = true;
        o.default = '1';
        o.depends({
            'enable_app_forward': '0'
        });
        o.depends({
            'enable_app_forward': '1',
            'enable_stats': '0'
        });
        // FRP Node Management section
        s = m.section(main_form.GridSection, 'frp_node', _('FRP Node Management'), _('Configure FRP nodes for port forwarding tunneling'));
        s.anonymous = true;
        s.addremove = true;
        s.sortable = true;
        s.cloneable = true;
        s.sectiontitle = function(section_id) {
            return main_uci.get('portweaver', section_id, 'name') || section_id || _('Unnamed node');
        };
        o = s.option(main_form.Value, 'name', _('Node Name'));
        o.modalonly = true;
        o.rmempty = false;
        o.datatype = 'string';
        o.placeholder = 'node1';
        o.validate = function(_section_id, value) {
            if (!value || String(value).trim() === '') return _('Node name is required');
            if (!/^[a-zA-Z0-9_-]+$/.test(String(value).trim())) return _('Node name must contain only alphanumeric characters, underscore, or hyphen');
            return true;
        };
        o = s.option(main_form.Value, 'server', _('FRP Server Address'));
        o.modalonly = true;
        o.rmempty = false;
        o.datatype = 'host';
        o.placeholder = '1.2.3.4';
        o.validate = function(_section_id, value) {
            if (!value || String(value).trim() === '') return _('Server address is required');
            return true;
        };
        o = s.option(main_form.Value, 'port', _('FRP Server Port'));
        o.modalonly = true;
        o.rmempty = false;
        o.datatype = 'port';
        o.placeholder = '7000';
        o.validate = function(_section_id, value) {
            if (!value || String(value).trim() === '') return _('Server port is required');
            var port = parseInt(value, 10);
            if (isNaN(port) || port < 1 || port > 65535) return _('Port must be between 1 and 65535');
            return true;
        };
        o = s.option(main_form.Value, 'token', _('Authentication Token'));
        o.modalonly = true;
        o.password = true;
        o.rmempty = true;
        o.placeholder = 'optional token for authentication';
        return m.render();
    }
}));


return main;