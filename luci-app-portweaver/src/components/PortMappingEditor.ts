export function createPortMappingEditor(form: any, uci: any, E: any, _: (t: string, ...a: any[]) => string) {
  return form.DummyValue.extend({
    parseMapping: function(str: string) {
      if (!str || typeof str !== 'string') return null;
      str = str.trim();
      var mapping = { listenPort: '', targetPort: '', frpNodes: [], protocol: 'tcp' } as {
        listenPort: string;
        targetPort: string;
        frpNodes: string[];
        protocol: 'tcp' | 'udp' | 'both';
      };
      var protocolMatch = str.match(/\/([a-z]+)$/);
      if (protocolMatch) {
        mapping.protocol = protocolMatch[1].toLowerCase() as any;
        str = str.substring(0, protocolMatch.index);
      }
      var frpMatch = str.match(/^(\[.+?\])+/);
      if (frpMatch) {
        var frpStr = frpMatch[0];
        var nodeMatches = frpStr.match(/\[([^\]]+)\]/g);
        if (nodeMatches) {
          nodeMatches.forEach(function(m) {
            var content = m.substring(1, m.length - 1);
            if (content.indexOf(':') !== -1 || /^[a-zA-Z0-9_-]+$/.test(content)) {
              if (content.match(/^\d+(-\d+)?$/) === null) {
                (mapping.frpNodes as string[]).push(content);
              }
            }
          });
        }
        str = str.substring(frpStr.length);
      }
      var ports = str.split(':');
      if (ports.length >= 1) mapping.listenPort = ports[0].trim().replace(/[\[\]]/g, '');
      if (ports.length >= 2) mapping.targetPort = ports[1].trim().replace(/[\[\]]/g, '');
      return mapping;
    },

    buildString: function(mapping: { listenPort: string; targetPort: string; frpNodes: string[]; protocol: string; }) {
      var result = '';
      if (mapping.frpNodes && mapping.frpNodes.length > 0) {
        mapping.frpNodes.forEach(function(node) { result += '[' + node + ']'; });
      }
      if (mapping.listenPort) {
        if (mapping.frpNodes && mapping.frpNodes.length > 0) result += '[' + mapping.listenPort + ']';
        else result += mapping.listenPort;
      }
      if (mapping.targetPort) result += ':' + mapping.targetPort;
      if (mapping.protocol) result += '/' + mapping.protocol;
      return result;
    },

    renderWidget: function(section_id: string, option_index: number, cfgvalue: string[] | string) {
      var frp_sections = uci.sections('portweaver', 'frp_node') || [];
      var current_values: string[] = Array.isArray(cfgvalue)
        ? (cfgvalue as string[])
        : (typeof cfgvalue === 'string' ? String(cfgvalue).split(/\s+/).filter(Boolean) : []);

      var widget_id = this.cbid(section_id);
      var self = this;
      var container = E('div', { 'class': 'cbi-value-field' });
      var mappings_wrapper = E('div', { 'id': 'portmapping-wrapper-' + section_id });

      var renderMappingRow = function(mapping_str: string, index: number) {
        var mapping = self.parseMapping(mapping_str) || { listenPort: '', targetPort: '', frpNodes: [], protocol: 'tcp' };
        var row_id = 'portmapping-row-' + section_id + '-' + index;
        var row = E('div', { 'id': row_id, 'class': 'portmapping-row', 'data-index': index, 'style': 'margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;' });

        var isTextMode = false;
        var modeToggleBtn = E('button', { 'type': 'button', 'class': 'btn btn-xs', 'style': 'margin-bottom: 10px; margin-right: 10px;' }, _('Text Edit'));

        var listenInput = E('input', { 'type': 'text', 'class': 'listen-port-input', 'data-index': index, 'data-section': section_id, 'value': mapping.listenPort, 'placeholder': _('8080 or 8080-8090'), 'style': 'width: 70px; min-width: 50px; margin-right: 10px;' });
        var targetInput = E('input', { 'type': 'text', 'class': 'target-port-input', 'data-index': index, 'data-section': section_id, 'value': mapping.targetPort, 'placeholder': _('80 or 80-90'), 'style': 'width: 70px; min-width: 50px; margin-right: 10px;' });
        var protocolSelect = E('select', { 'class': 'protocol-select', 'data-index': index, 'data-section': section_id, 'style': 'width: 100px; margin-right: 10px;' }, [
          E('option', { 'value': 'tcp', 'selected': mapping.protocol === 'tcp' ? 'selected' : null }, 'TCP'),
          E('option', { 'value': 'udp', 'selected': mapping.protocol === 'udp' ? 'selected' : null }, 'UDP'),
          E('option', { 'value': 'both', 'selected': mapping.protocol === 'both' ? 'selected' : null }, 'Both')
        ]);

        var textModeInput = E('input', { 'type': 'text', 'class': 'text-mode-input', 'value': mapping_str, 'placeholder': _('[8080][node1:9888]:80/tcp or 8080:80/tcp'), 'style': 'width: 100%; margin-bottom: 10px; padding: 5px;' });

        var frpContainer = E('div', { 'class': 'frp-nodes-select', 'style': 'margin-top: 10px; padding: 10px; background: #f0f0f0; border-radius: 3px; display: none;' });
        if (frp_sections.length > 0) {
          frpContainer.appendChild(E('label', { 'style': 'display: block; margin-bottom: 8px; font-weight: bold;' }, _('FRP Nodes (Optional):')));
          frp_sections.forEach(function(frp_section: any) {
            var node_name = frp_section['name'] || frp_section['.name'];
            if (!node_name) return;
            var is_checked = (mapping.frpNodes || []).some(function(n: string) { return n.split(':')[0] === node_name; });
            var port_value = '';
            if (is_checked) {
              var found = (mapping.frpNodes || []).find(function(n: string) { return n.split(':')[0] === node_name; });
              if (found) {
                var parts = found.split(':');
                port_value = parts.length > 1 ? parts[1] : '';
              }
            }
            var checkbox = E('input', { 'type': 'checkbox', 'class': 'frp-node-checkbox-pm', 'data-node': node_name, 'data-index': index, 'data-section': section_id, 'checked': is_checked ? 'checked' : null, 'style': 'margin-right: 5px;' });
            var port_input = E('input', { 'type': 'text', 'class': 'frp-node-port-pm', 'data-node': node_name, 'data-index': index, 'data-section': section_id, 'value': port_value, 'placeholder': _('default'), 'style': 'width: 80px; margin-right: 15px;', 'disabled': is_checked ? null : 'disabled' });
            var node_item = E('div', { 'style': 'margin-bottom: 5px;' }, [
              checkbox,
              E('label', { 'style': 'margin-right: 10px; cursor: pointer;' }, node_name),
              E('label', { 'style': 'margin-right: 5px;' }, _('Port:')),
              port_input
            ]);
            frpContainer.appendChild(node_item);
          });
        } else {
          frpContainer.appendChild(E('em', { 'style': 'color: #999;' }, _('No FRP nodes configured')));
        }

        var errorDiv = E('div', { 'class': 'portmapping-error', 'data-index': index, 'style': 'color: red; margin-top: 8px; min-height: 20px; font-size: 12px;' });
        var previewDiv = E('div', { 'class': 'portmapping-preview', 'data-index': index, 'style': 'margin-top: 8px; padding: 8px; background: #e8f4f8; border-left: 3px solid #0088cc; font-family: monospace; font-size: 12px;' }, _('Preview: ') + self.buildString(mapping));

        var updatePreview = function() {
          var listen = (listenInput as HTMLInputElement).value.trim();
          var target = (targetInput as HTMLInputElement).value.trim();
          var protocol = (protocolSelect as HTMLSelectElement).value;
          var frpNodes: string[] = [];
          var allFrpCheckboxes = row.querySelectorAll('input.frp-node-checkbox-pm');
          allFrpCheckboxes.forEach(function(cb: any) {
            if (cb.checked) {
              var node = cb.getAttribute('data-node') as string;
              var port_inp = row.querySelector('input.frp-node-port-pm[data-node="' + node + '"]') as HTMLInputElement | null;
              var port = port_inp ? port_inp.value.trim() : '';
              frpNodes.push(port ? node + ':' + port : node);
            }
          });
          var temp_mapping = { listenPort: listen, targetPort: target, frpNodes: frpNodes, protocol: protocol };
          var preview_str = self.buildString(temp_mapping);
          (previewDiv as HTMLElement).textContent = _('Preview: ') + preview_str;
          (textModeInput as HTMLInputElement).value = preview_str;
        };

        var updateHiddenValue = function() {
          var rows = mappings_wrapper.querySelectorAll('.portmapping-row');
          var values: string[] = [];
          rows.forEach(function(r: Element) {
            var listen = (r.querySelector('.listen-port-input') as HTMLInputElement).value.trim();
            var target = (r.querySelector('.target-port-input') as HTMLInputElement).value.trim();
            var protocol = (r.querySelector('.protocol-select') as HTMLSelectElement).value;
            var frpNodes: string[] = [];
            var checkboxes = r.querySelectorAll('input.frp-node-checkbox-pm');
            checkboxes.forEach(function(cb: any) {
              if (cb.checked) {
                var node = cb.getAttribute('data-node') as string;
                var port_inp = r.querySelector('input.frp-node-port-pm[data-node="' + node + '"]') as HTMLInputElement | null;
                var port = port_inp ? port_inp.value.trim() : '';
                frpNodes.push(port ? node + ':' + port : node);
              }
            });
            var temp = { listenPort: listen, targetPort: target, frpNodes: frpNodes, protocol: protocol };
            var str = self.buildString(temp);
            if (str && listen && target) values.push(str);
          });
          var hidden = document.getElementById('portmapping-hidden-' + section_id) as HTMLInputElement | null;
          if (hidden) hidden.value = values.join(' ');
        };

        (listenInput as HTMLInputElement).addEventListener('input', function() { updatePreview(); updateHiddenValue(); });
        (listenInput as HTMLInputElement).addEventListener('change', function() { updatePreview(); updateHiddenValue(); });
        (targetInput as HTMLInputElement).addEventListener('input', function() { updatePreview(); updateHiddenValue(); });
        (targetInput as HTMLInputElement).addEventListener('change', function() { updatePreview(); updateHiddenValue(); });
        (protocolSelect as HTMLSelectElement).addEventListener('change', function() { updatePreview(); updateHiddenValue(); });

        setTimeout(function() {
          var frpCheckboxes = row.querySelectorAll('input.frp-node-checkbox-pm');
          frpCheckboxes.forEach(function(cb: any) {
            cb.addEventListener('change', function(this: HTMLInputElement) {
              var node = this.getAttribute('data-node') as string;
              var port_inp = row.querySelector('input.frp-node-port-pm[data-node="' + node + '"]') as HTMLInputElement | null;
              if (port_inp) {
                port_inp.disabled = !this.checked;
                if (!this.checked) port_inp.value = '';
              }
              updatePreview();
              updateHiddenValue();
            });
          });
          var frpPortInputs = row.querySelectorAll('input.frp-node-port-pm');
          frpPortInputs.forEach(function(inp: any) {
            inp.addEventListener('input', function() { updatePreview(); updateHiddenValue(); });
            inp.addEventListener('change', function() { updatePreview(); updateHiddenValue(); });
          });
        }, 0);

        (textModeInput as HTMLInputElement).addEventListener('input', function(this: HTMLInputElement) {
          var parsed = self.parseMapping(this.value);
          if (parsed) {
            (listenInput as HTMLInputElement).value = parsed.listenPort;
            (targetInput as HTMLInputElement).value = parsed.targetPort;
            (protocolSelect as HTMLSelectElement).value = parsed.protocol;
            var allCheckboxes = row.querySelectorAll('input.frp-node-checkbox-pm');
            allCheckboxes.forEach(function(cb: any) {
              var node = cb.getAttribute('data-node');
              var is_checked = (parsed.frpNodes || []).some(function(n: string) { return n.split(':')[0] === node; });
              cb.checked = is_checked;
              var port_inp = row.querySelector('input.frp-node-port-pm[data-node="' + node + '"]') as HTMLInputElement | null;
              if (port_inp) {
                port_inp.disabled = !is_checked;
                if (is_checked) {
                  var found = (parsed.frpNodes || []).find(function(n: string) { return n.split(':')[0] === node; });
                  if (found) {
                    var parts = found.split(':');
                    port_inp.value = parts.length > 1 ? parts[1] : '';
                  }
                } else {
                  port_inp.value = '';
                }
              }
            });
            updateHiddenValue();
          }
        });

        modeToggleBtn.addEventListener('click', function(e: MouseEvent) {
          e.preventDefault();
          isTextMode = !isTextMode;
          if (isTextMode) {
            (titleRow as HTMLElement).style.display = 'none';
            (frpContainer as HTMLElement).style.display = 'none';
            (textModeInput as HTMLElement).style.display = 'block';
            (previewDiv as HTMLElement).style.display = 'none';
            (modeToggleBtn as HTMLElement).textContent = _('Visual Edit');
          } else {
            (titleRow as HTMLElement).style.display = 'flex';
            (frpContainer as HTMLElement).style.display = 'block';
            (textModeInput as HTMLElement).style.display = 'none';
            (previewDiv as HTMLElement).style.display = 'block';
            (modeToggleBtn as HTMLElement).textContent = _('Text Edit');
          }
        });

        var deleteBtn = E('button', { 'type': 'button', 'class': 'btn btn-sm btn-danger', 'data-index': index, 'data-section': section_id, 'style': 'margin-top: 10px; margin-left: 10px;' }, _('Delete'));
        deleteBtn.addEventListener('click', function(e: MouseEvent) { e.preventDefault(); (row as HTMLElement).remove(); updateHiddenValue(); });

        var titleRow = E('div', { 'style': 'display: flex; gap: 10px; align-items: center;' }, [
          E('label', { 'style': 'min-width: 80px; font-weight: bold;' }, _('Listen Port:')),
          listenInput,
          E('label', { 'style': 'min-width: 80px; font-weight: bold;' }, _('Target Port:')),
          targetInput,
          E('label', { 'style': 'min-width: 60px; font-weight: bold;' }, _('Protocol:')),
          protocolSelect
        ]);

        row.appendChild(modeToggleBtn);
        row.appendChild(deleteBtn);
        row.appendChild(E('br'));
        row.appendChild(titleRow);
        row.appendChild(textModeInput);
        row.appendChild(frpContainer);
        row.appendChild(errorDiv);
        row.appendChild(previewDiv);
        return row;
      };

      for (var i = 0; i < current_values.length; i++) {
        mappings_wrapper.appendChild(renderMappingRow(current_values[i], i));
      }

      var addBtn = E('button', { 'type': 'button', 'class': 'btn btn-sm btn-primary', 'style': 'margin-bottom: 10px;' }, _('Add Port Mapping'));
      addBtn.addEventListener('click', function(e: MouseEvent) {
        e.preventDefault();
        var rows = mappings_wrapper.querySelectorAll('.portmapping-row');
        var new_index = rows.length;
        mappings_wrapper.appendChild(renderMappingRow('', new_index));
      });

      container.appendChild(addBtn);
      container.appendChild(mappings_wrapper);

      var hidden = E('input', { 'type': 'hidden', 'id': 'portmapping-hidden-' + section_id, 'name': widget_id, 'value': current_values.join(' ') });
      container.appendChild(hidden);

      var description = E('div', { 'class': 'cbi-value-description' }, _('Configure port forwarding rules. Listen Port and Target Port support single port (8080) or port range (8080-8090).'));
      container.appendChild(description);

      return container;
    },

    cfgvalue: function(section_id: string) {
      var value = uci.get('portweaver', section_id, 'port_mapping');
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') return String(value).split(/\s+/).filter(Boolean);
      return [];
    },

    formvalue: function(section_id: string) {
      var hidden = document.getElementById('portmapping-hidden-' + section_id) as HTMLInputElement | null;
      if (hidden && hidden.value) return hidden.value.split(/\s+/).filter(Boolean);
      return null;
    },

    write: function(section_id: string, formvalue: string[] | null) {
      if (formvalue && formvalue.length > 0) {
        return uci.set('portweaver', section_id, 'port_mapping', formvalue);
      } else {
        return uci.unset('portweaver', section_id, 'port_mapping');
      }
    }
  });
}
