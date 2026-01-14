export function createFrpNodeSelector(form: any, uci: any, E: any, _: (t: string, ...a: any[]) => string) {
  return form.DummyValue.extend({
    renderWidget: function(section_id: string, option_index: number, cfgvalue: string[] | string) {
      var frp_sections = uci.sections('portweaver', 'frp_node') || [];
      var current_value: string[] = Array.isArray(cfgvalue)
        ? (cfgvalue as string[])
        : (typeof cfgvalue === 'string' ? String(cfgvalue).split(/\s+/).filter(Boolean) : []);

      var node_map: Record<string, string> = {};
      for (var i = 0; i < current_value.length; i++) {
        var parts = current_value[i].split(':');
        var node = parts[0];
        var port = parts[1] || '';
        node_map[node] = port;
      }

      var widget_id = this.cbid(section_id);
      var container = E('div', { 'class': 'cbi-value-field' });

      if (frp_sections.length === 0) {
        container.appendChild(E('em', { 'style': 'color: #999;' }, _('No FRP nodes configured. Please add FRP nodes first.')));
      } else {
        var table = E('table', { 'class': 'table', 'style': 'margin: 0; width: auto;' });
        for (var i = 0; i < frp_sections.length; i++) {
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

          var updateHandler = function(this: HTMLElement) {
            var widget_id = this.getAttribute('data-widget-id') as string;
            var checkboxes = document.querySelectorAll('input.frp-node-checkbox[data-widget-id="' + widget_id + '"]');
            var values: string[] = [];
            for (var j = 0; j < checkboxes.length; j++) {
              var cb = checkboxes[j] as HTMLInputElement;
              if (cb.checked) {
                var node = cb.getAttribute('data-node') as string;
                var port_inp = document.querySelector('input.frp-node-port[data-widget-id="' + widget_id + '"][data-node="' + node + '"]') as HTMLInputElement | null;
                var port = port_inp ? port_inp.value.trim() : '';
                if (port) {
                  var p = parseInt(port, 10);
                  if (isNaN(p) || p < 1 || p > 65535) {
                    if (port_inp) port_inp.style.setProperty('border-color', 'red', 'important');
                    continue;
                  } else {
                    if (port_inp) port_inp.style.borderColor = '';
                  }
                  values.push(node + ':' + port);
                } else {
                  values.push(node);
                }
              }
            }
            var hidden = document.querySelector('input[id="' + widget_id + '"]') as HTMLInputElement | null;
            if (hidden) hidden.value = values.join(' ');
          };

          checkbox.addEventListener('change', function(this: HTMLInputElement) {
            var widget_id = this.getAttribute('data-widget-id') as string;
            var node = this.getAttribute('data-node') as string;
            var port_inp = document.querySelector('input.frp-node-port[data-widget-id="' + widget_id + '"][data-node="' + node + '"]') as HTMLInputElement | null;
            if (port_inp) {
              port_inp.disabled = !this.checked;
              if (!this.checked) port_inp.value = '';
            }
            updateHandler.call(this);
          });

          port_input.addEventListener('input', updateHandler);
          port_input.addEventListener('change', updateHandler);

          var row = E('tr', {}, [
            E('td', { 'style': 'padding: 4px 8px; border: none;' }, [
              checkbox,
              E('label', { 'style': 'cursor: pointer; font-weight: normal; margin: 0;' }, node_name)
            ]),
            E('td', { 'style': 'padding: 4px 8px; border: none;' }, [
              E('label', { 'style': 'margin-right: 5px; color: #666;' }, _('Port:')),
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

      var description = E('div', { 'class': 'cbi-value-description' },
        _('Select FRP nodes and optionally specify custom ports. Leave port empty to use default.'));
      container.appendChild(description);

      return container;
    },

    cfgvalue: function(section_id: string) {
      var value = uci.get('portweaver', section_id, 'frp_nodes');
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') return String(value).split(/\s+/).filter(Boolean);
      return [];
    },

    formvalue: function(section_id: string) {
      var widget_id = this.cbid(section_id);
      var hidden = document.getElementById(widget_id) as HTMLInputElement | null;
      if (hidden && hidden.value) return hidden.value.split(/\s+/).filter(Boolean);
      return null;
    },

    write: function(section_id: string, formvalue: string[] | null) {
      if (formvalue && formvalue.length > 0) {
        return uci.set('portweaver', section_id, 'frp_nodes', formvalue);
      } else {
        return uci.unset('portweaver', section_id, 'frp_nodes');
      }
    }
  });
}
