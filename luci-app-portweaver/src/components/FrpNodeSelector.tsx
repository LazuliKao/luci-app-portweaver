export function createFrpNodeSelector(form: any, uci: any) {
  return form.DummyValue.extend({
    renderWidget: function (section_id: string, option_index: number, cfgvalue: string[] | string) {
      let frp_sections = uci.sections('portweaver', 'frp_node') || [];
      let current_value: string[] = Array.isArray(cfgvalue)
        ? (cfgvalue as string[])
        : (typeof cfgvalue === 'string' ? String(cfgvalue).split(/\s+/).filter(Boolean) : []);

      let node_map: Record<string, string> = {};
      for (let i = 0; i < current_value.length; i++) {
        let parts = current_value[i].split(':');
        let node = parts[0];
        let port = parts[1] || '';
        node_map[node] = port;
      }

      let widget_id = this.cbid(section_id);

      let updateHandler = function (this: HTMLElement) {
        let wid = this.getAttribute('data-widget-id') as string;
        let checkboxes = document.querySelectorAll('input.frp-node-checkbox[data-widget-id="' + wid + '"]');
        let values: string[] = [];
        for (let j = 0; j < checkboxes.length; j++) {
          let cb = checkboxes[j] as HTMLInputElement;
          if (cb.checked) {
            let node = cb.getAttribute('data-node') as string;
            let port_inp = document.querySelector('input.frp-node-port[data-widget-id="' + wid + '"][data-node="' + node + '"]') as HTMLInputElement | null;
            let port = port_inp ? port_inp.value.trim() : '';
            if (port) {
              let p = parseInt(port, 10);
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
        let hidden = document.querySelector('input[id="' + wid + '"]') as HTMLInputElement | null;
        if (hidden) hidden.value = values.join(' ');
      };

      let container = E('div', { 'class': 'cbi-value-field' });

      if (frp_sections.length === 0) {
        container.appendChild(E('em', { 'style': 'color: #999;' }, _('No FRP nodes configured. Please add FRP nodes first.')));
      } else {
        let table = E('table', { 'class': 'table', 'style': 'margin: 0; width: auto;' });
        for (let i = 0; i < frp_sections.length; i++) {
          let node_name = frp_sections[i]['name'] || frp_sections[i]['.name'];
          if (!node_name) continue;
          let is_checked = Object.prototype.hasOwnProperty.call(node_map, node_name);
          let port_value = node_map[node_name] || '';

          let checkbox = E('input', {
            'type': 'checkbox',
            'class': 'frp-node-checkbox',
            'data-widget-id': widget_id,
            'data-node': node_name,
            'data-section': section_id,
            'checked': is_checked ? 'checked' : null,
            'style': 'margin-right: 8px;'
          });

          let port_input = E('input', {
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

          checkbox.addEventListener('change', function (this: HTMLInputElement) {
            let wid = this.getAttribute('data-widget-id') as string;
            let node = this.getAttribute('data-node') as string;
            let port_inp = document.querySelector('input.frp-node-port[data-widget-id="' + wid + '"][data-node="' + node + '"]') as HTMLInputElement | null;
            if (port_inp) {
              port_inp.disabled = !this.checked;
              if (!this.checked) port_inp.value = '';
            }
            updateHandler.call(this);
          });

          port_input.addEventListener('input', updateHandler);
          port_input.addEventListener('change', updateHandler);

          let row = E('tr', {}, [
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

      let hidden =
        <input
          type="hidden"
          id={widget_id}
          name={widget_id}
          value={current_value.join(' ')}
        >
        </input>
      container.appendChild(hidden);

      let description = <div class="cbi-value-description">
        {_('Select FRP nodes and optionally specify custom ports. Leave port empty to use default.')}
      </div>
      container.appendChild(description);

      return container;
    },

    cfgvalue: function (section_id: string) {
      let value = uci.get('portweaver', section_id, 'frp_nodes');
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') return String(value).split(/\s+/).filter(Boolean);
      return [];
    },

    formvalue: function (section_id: string) {
      let widget_id = this.cbid(section_id);
      let hidden = document.getElementById(widget_id) as HTMLInputElement | null;
      if (hidden && hidden.value) return hidden.value.split(/\s+/).filter(Boolean);
      return null;
    },

    write: function (section_id: string, formvalue: string[] | null) {
      if (formvalue && formvalue.length > 0) {
        return uci.set('portweaver', section_id, 'frp_nodes', formvalue);
      } else {
        return uci.unset('portweaver', section_id, 'frp_nodes');
      }
    }
  });
}