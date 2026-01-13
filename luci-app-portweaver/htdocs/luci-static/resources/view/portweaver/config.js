'use strict';
'require view';
'require form';
'require uci';
'require firewall as fwmodel';
'require tools.widgets as widgets';
'require rpc';
'require poll';
'require ui';

var callPortWeaverStatus = rpc.declare({
	object: 'portweaver',
	method: 'get_status',
	expect: {}
});

var callPortWeaverListProjects = rpc.declare({
	object: 'portweaver',
	method: 'list_projects',
	expect: {}
});

var callPortWeaverSetEnabled = rpc.declare({
	object: 'portweaver',
	method: 'set_enabled',
	params: ['id', 'enabled'],
	expect: {}
});

return view.extend({
	load: function () {
		return Promise.all([
			uci.load('portweaver'),
			uci.load('firewall'),
			callPortWeaverStatus().then(function (res) {
				return res;
			}).catch(function (err) {
				console.warn('ubus get_status failed:', err);
				return {};
			}),
			callPortWeaverListProjects().then(function (res) {
				return res || { projects: [] };
			}).catch(function (err) {
				console.warn('ubus list_projects failed:', err);
				return { projects: [] };
			})
		]);
	},

	render: function (data) {
		var m, s, o;
		var globalStatus = data[2] || {};
		var projectStatuses = data[3] ? (data[3].projects || []) : [];

		var formatBytes = function (bytes) {
			if (bytes < 1024) return bytes + ' B';
			if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KiB';
			if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MiB';
			return (bytes / 1073741824).toFixed(2) + ' GiB';
		};
		var formatUptime = function (seconds) {
			let days = Math.floor(seconds / 86400);
			let hours = Math.floor((seconds % 86400) / 3600);
			let mins = Math.floor((seconds % 3600) / 60);
			let sec = seconds % 60;
			if (days > 0) return days + 'd ' + hours + 'h';
			if (hours > 0) return hours + 'h ' + mins + 'm';
			return mins + 'm' + sec + 's';
		};
		var getErrorMessage = function (error_code) {
			var messages = {
				0: 'OK',
				'-1': 'Memory allocation failed',
				'-2': 'Failed to bind to port',
				'-3': 'Address or port already in use (EADDRINUSE)',
				'-4': 'Permission denied - unable to bind to port (EACCES)',
				'-5': 'Invalid address format',
				'-98': 'Address already in use',
				'-91': "Protocol wrong type for socket",
				'-92': "Protocol not available",
				'-93': "Protocol not supported",
				'-94': "Socket type not supported",
				'-95': "Operation not supported on transport endpoint",
				'-96': "Protocol family not supported",
				'-97': "Address family not supported by protocol",
				'-98': "Address already in use",
				'-99': "Cannot assign requested address",
				'-100': "Network is down",
				'-101': "Network is unreachable",
			};
			return messages[String(error_code)] || 'Unknown error (code: ' + error_code + ')';
		};

		var getProjectIndex = function (section_id) {
			var sections = uci.sections('portweaver', 'project');
			for (var i = 0; i < sections.length; i++) {
				if (sections[i]['.name'] === section_id) return i;
			}
			return -1;
		};

		var getProjectStatus = function (section_id) {
			var idx = getProjectIndex(section_id);
			return (idx >= 0 && projectStatuses && projectStatuses[idx]) ? projectStatuses[idx] : null;
		};

		function renderStatusElements(status, section_id) {
			if (!status) {
				return [
					E('span', { 'style': 'color: gray;' }, _('N/A'))
				]
			}
			var startupFailed = status.startup_status === 'failed';
			var statusColor = (status.status === 'running' && !startupFailed) ? 'green' : '#dc3545';
			var errorMessage = null;
			if (startupFailed && status.error_code !== undefined && status.error_code !== 0) {
				errorMessage = getErrorMessage(status.error_code);
			}

			var statusBadgeAttrs = {
				'class': 'ifacebadge',
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
						}, startupFailed ? 'failed' : (status.status || 'unknown'))
					])
				])
			];

			if (errorMessage && status.status !== 'stopped') {
				statusElements.push(
					E('small', { 'style': 'color: #dc3545; margin-top: 0.3em;' }, [
						'⚠ ' + errorMessage
					])
				);
			} else {
				let elements = [];
				if (status.active_ports > 0) {
					elements.push(E('span', {}, _('Ports: ') + (status.active_ports || 0)));
					elements.push(E('br'));
				}
				if (status.bytes_in && status.bytes_out) {
					elements.push(E('span', {}, '↓ ' + formatBytes(status.bytes_in || 0) + ' ↑ ' + formatBytes(status.bytes_out || 0)));
				}
				statusElements.push(
					E('small', {}, elements)
				);
			}

			return statusElements;
		}
		m = new form.Map('portweaver', _('PortWeaver'),
			_('Port forwarding and NAT traversal configuration'));

		// Setup auto-refresh
		poll.add(function () {
			var updateText = function (id, value) {
				var elem = document.getElementById(id);
				if (elem) elem.textContent = value;
			};

			return Promise.all([
				callPortWeaverStatus(),
				callPortWeaverListProjects()
			]).then(function (results) {
				globalStatus = results[0] || {};
				projectStatuses = (results[1] && results[1].projects) ? results[1].projects : [];

				// Update DOM elements
				var statusElem = document.getElementById('status-value');
				var statusColors = { 'running': 'green', 'stopped': 'red', 'degraded': 'orange' };
				if (statusElem) {
					statusElem.textContent = globalStatus.status || '-';
					statusElem.style.color = statusColors[globalStatus.status] || 'gray';
				}

				updateText('total-projects-value', globalStatus.total_projects || 0);
				updateText('active-ports-value', globalStatus.active_ports || 0);
				updateText('uptime-value', formatUptime(globalStatus.uptime || 0));
				updateText('traffic-in-value', formatBytes(globalStatus.total_bytes_in || 0));
				updateText('traffic-out-value', formatBytes(globalStatus.total_bytes_out || 0));

				// Update per-project status DOMs so bytes/ports reflect real-time changes
				(function () {
					var sections = uci.sections('portweaver', 'project') || [];
					for (var i = 0; i < sections.length; i++) {
						var section_id = sections[i]['.name'];
						var status = getProjectStatus(section_id);
						var section = document.getElementById('project-status-' + section_id);
						if (!section) continue;
						// Re-render status elements
						var newStatusElements = renderStatusElements(status, section_id);
						section.replaceWith(E('div', { 'id': 'project-status-' + section_id }, newStatusElements));
					}
				})();
			}).catch(function (err) {
				console.warn('Auto-refresh failed:', err);
			});
		}, 3);

		// Global settings section
		s = m.section(form.NamedSection, 'global', 'global', _('Global Settings'));

		o = s.option(form.Flag, 'enabled', _('Enable PortWeaver'));
		o.default = '1';
		o.rmempty = false;

		// Runtime status display
		o = s.option(form.DummyValue, '_runtime_status', _('Runtime Status'));
		o.rawhtml = true;
		o.cfgvalue = function () {
			var statusColor = {
				'running': '#28a745',
				'stopped': '#dc3545',
				'degraded': '#ffc107'
			}[globalStatus.status] || '#6c757d';

			return E('div', { 'style': 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 1em; margin-top: 0.5em;' }, [
				E('div', { 'style': 'border: 1px solid #dee2e6; padding: 0.8em; border-radius: 4px; background: transparent;' }, [
					E('div', { 'style': 'font-size: 0.85em; color: #6c757d; margin-bottom: 0.3em;' }, _('Status')),
					E('strong', {
						'style': 'color: ' + statusColor + '; font-size: 1.1em; font-weight: 600;',
						'id': 'status-value'
					}, globalStatus.status || '-')
				]),
				E('div', { 'style': 'border: 1px solid #dee2e6; padding: 0.8em; border-radius: 4px; background: transparent;' }, [
					E('div', { 'style': 'font-size: 0.85em; color: #6c757d; margin-bottom: 0.3em;' }, _('Total Projects')),
					E('strong', { 'style': 'font-size: 1.1em; font-weight: 600;', 'id': 'total-projects-value' }, globalStatus.total_projects || 0)
				]),
				E('div', { 'style': 'border: 1px solid #dee2e6; padding: 0.8em; border-radius: 4px; background: transparent;' }, [
					E('div', { 'style': 'font-size: 0.85em; color: #6c757d; margin-bottom: 0.3em;' }, _('Active Ports')),
					E('strong', { 'style': 'font-size: 1.1em; font-weight: 600;', 'id': 'active-ports-value' }, globalStatus.active_ports || 0)
				]),
				E('div', { 'style': 'border: 1px solid #dee2e6; padding: 0.8em; border-radius: 4px; background: transparent;' }, [
					E('div', { 'style': 'font-size: 0.85em; color: #6c757d; margin-bottom: 0.3em;' }, _('Uptime')),
					E('strong', { 'style': 'font-size: 1.1em; font-weight: 600;', 'id': 'uptime-value' }, formatUptime(globalStatus.uptime || 0))
				]),
				E('div', { 'style': 'border: 1px solid #dee2e6; padding: 0.8em; border-radius: 4px; background: transparent;' }, [
					E('div', { 'style': 'font-size: 0.85em; color: #6c757d; margin-bottom: 0.3em;' }, _('Traffic In')),
					E('strong', { 'style': 'font-size: 1.1em; font-weight: 600;', 'id': 'traffic-in-value' }, formatBytes(globalStatus.total_bytes_in || 0))
				]),
				E('div', { 'style': 'border: 1px solid #dee2e6; padding: 0.8em; border-radius: 4px; background: transparent;' }, [
					E('div', { 'style': 'font-size: 0.85em; color: #6c757d; margin-bottom: 0.3em;' }, _('Traffic Out')),
					E('strong', { 'style': 'font-size: 1.1em; font-weight: 600;', 'id': 'traffic-out-value' }, formatBytes(globalStatus.total_bytes_out || 0))
				])
			]);
		};

		// Helper to toggle runtime enable via RPC (used by per-row buttons)
		var runtimeToggle = function (section_id) {
			var idx = getProjectIndex(section_id);
			if (idx < 0) {
				ui.addNotification(null, E('p', _('Could not determine project index')), 'error');
				return;
			}
			var status = getProjectStatus(section_id);
			var newEnabled = !(status && status.enabled);
			return callPortWeaverSetEnabled(idx, newEnabled).then(function (res) {
				ui.addNotification(null, E('p', _('Runtime state updated to: ') + (newEnabled ? _('enabled') : _('disabled'))), 'info');
				return Promise.all([callPortWeaverStatus(), callPortWeaverListProjects()]).then(function (results) {
					globalStatus = results[0] || {};
					projectStatuses = (results[1] && results[1].projects) ? results[1].projects : [];
					location.reload();
				});
			}).catch(function (err) {
				ui.addNotification(null, E('p', _('Failed to toggle runtime state: ') + (err.message || err)), 'error');
			});
		};
		// Expose for inline onclick handlers
		window.portweaverToggle = runtimeToggle;


		// Port forwarding rules section
		s = m.section(form.GridSection, 'project', _('Port Forwarding Projects'),
			_('Configure port forwarding projects for PortWeaver'));
		s.anonymous = true;
		s.addremove = true;
		s.sortable = true;
		s.cloneable = true;

		s.sectiontitle = function (section_id) {
			return uci.get('portweaver', section_id, 'remark') || _('Unnamed project');
		};

		// Runtime status indicator column (leftmost)
		o = s.option(form.DummyValue, '_runtime_status', _('Status'));
		o.modalonly = false;
		o.textvalue = function (section_id) {
			var status = getProjectStatus(section_id);

			// Provide a container with stable IDs so we can update it from the poll callback
			return E('div', { 'id': 'project-status-' + section_id }, renderStatusElements(status, section_id));
		};

		// Runtime toggle column - properly renders action buttons
		o = s.option(form.Button, '_runtime_toggle', _('Toggle'));
		o.modalonly = false;
		o.editable = true;
		o.inputtitle = function (section_id) {
			var status = getProjectStatus(section_id);
			return (status && status.enabled) ? _('Disable') : _('Enable');
		};
		o.onclick = function (ev, section_id) {
			return window.portweaverToggle(section_id);
		};

		o = s.option(form.Flag, 'enabled', _('Enabled'));
		o.modalonly = false;
		o.default = '1';
		o.editable = true;

		// Preview column
		o = s.option(form.DummyValue, '_preview', _('Overview'));
		o.modalonly = false;
		o.textvalue = function (section_id) {
			var protocol = uci.get('portweaver', section_id, 'protocol') || 'tcp';
			var family = uci.get('portweaver', section_id, 'family') || 'any';
			var listen_port = uci.get('portweaver', section_id, 'listen_port') || '';
			var target_address = uci.get('portweaver', section_id, 'target_address') || '';
			var target_port = uci.get('portweaver', section_id, 'target_port') || '';
			var port_mappings = L.toArray(uci.get('portweaver', section_id, 'port_mapping'));
			var src_zones = L.toArray(uci.get('portweaver', section_id, 'src_zone'));
			var dest_zones = L.toArray(uci.get('portweaver', section_id, 'dest_zone'));

			var proto_text = {
				'both': _('TCP and UDP'),
				'tcp': 'TCP',
				'udp': 'UDP'
			}[protocol] || protocol.toUpperCase();

			var family_text = {
				'any': _('IPv4 and IPv6'),
				'ipv4': 'IPv4',
				'ipv6': 'IPv6'
			}[family] || family;

			var lines = [];

			// Protocol and family line
			lines.push(E('span', {}, [
				_('Incoming '),
				E('var', {}, family_text),
				_(' protocol '),
				E('var', {}, proto_text)
			]));

			// Source zones line
			if (src_zones.length > 0) {
				var src_badges = src_zones.map(function (z) {
					return E('span', {
						'class': 'zonebadge',
						'style': fwmodel.getZoneColorStyle(z)
					}, [E('strong', {}, z || E('em', _('any zone')))]);
				});
				lines.push(E('br'));
				lines.push(E('span', {}, [_('From '), ...src_badges]));
			}

			// Port display - check mode
			if (port_mappings.length > 0) {
				// Multi-port mode
				lines.push(E('br'));
				lines.push(E('span', {}, [
					E('strong', { style: 'color: #09c;' }, _('Multi-Port')),
					_(' - '),
					E('var', {}, port_mappings.length),
					_(' mapping(s)')
				]));
				// Show first mapping as example
				var first = port_mappings[0];
				lines.push(E('br'));
				lines.push(E('span', {}, [
					_('e.g. '),
					E('var', {}, first)
				]));
			} else if (listen_port) {
				// Single port mode
				lines.push(E('br'));
				lines.push(E('span', {}, [
					_('Port '),
					E('var', {}, listen_port)
				]));
			}

			// Forward to line
			lines.push(E('br'));
			lines.push(E('span', {}, [
				E('var', { 'data-tooltip': 'Forward' }, _('Forward')),
				_(' to ')
			]));

			// Destination zones
			if (dest_zones.length > 0) {
				var dest_badges = dest_zones.map(function (z) {
					return E('span', {
						'class': 'zonebadge',
						'style': fwmodel.getZoneColorStyle(z)
					}, [E('strong', {}, z || E('em', _('any zone')))]);
				});
				lines.push(...dest_badges);
				lines.push(_(' '));
			}

			// Target address and port
			if (target_address) {
				lines.push(E('span', {}, [
					_('IP '),
					E('var', {}, target_address)
				]));
			}
			if (port_mappings.length === 0 && target_port) {
				lines.push(E('span', {}, [
					_(' port '),
					E('var', {}, target_port)
				]));
			}

			return E('small', {}, lines);
		};

		// Modal configuration fields
		o = s.option(form.Value, 'remark', _('Remark'));
		o.modalonly = true;
		o.rmempty = false;
		o.datatype = 'string';
		o.validate = function (section_id, value) {
			if (!value || String(value).trim() === '')
				return _('This field is required');
			return true;
		};
		o.placeholder = 'My Project';

		o = s.option(form.Flag, 'enabled', _('Enabled'));
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

		o = s.option(form.ListValue, 'family', _('Address Family'));
		o.modalonly = true;
		o.value('any', _('IPv4 and IPv6'));
		o.value('ipv4', 'IPv4');
		o.value('ipv6', 'IPv6');
		o.default = 'any';

		o = s.option(form.Value, 'target_address', _('Target Address'));
		o.modalonly = true;
		o.rmempty = false;
		o.datatype = 'host';
		o.placeholder = '192.168.1.100';
		o.validate = function (section_id, value) {
			if (!value || String(value).trim() === '')
				return _('This field is required');
			return true;
		};

		// Port mode switcher
		o = s.option(form.Flag, 'use_port_mappings', _('Use Port Mappings Mode'));
		o.modalonly = true;
		o.rmempty = true;
		o.default = '0';
		o.description = _('Enable to configure multiple port mappings or port ranges. Disable for single port mode.');

		// Single port mode
		o = s.option(form.ListValue, 'protocol', _('Protocol'));
		o.modalonly = true;
		o.value('both', _('TCP and UDP'));
		o.value('tcp', 'TCP');
		o.value('udp', 'UDP');
		o.default = 'tcp';
		o.depends('use_port_mappings', '0');

		// Custom FRP node selector with checkboxes and port inputs
		var FrpNodeSelector = form.DummyValue.extend({
			renderWidget: function(section_id, option_index, cfgvalue) {
				var frp_sections = uci.sections('portweaver', 'frp_node') || [];
				var current_value = cfgvalue || [];
				
				// Parse current values: ["node1:8080", "node2:9000"]
				if (typeof current_value === 'string') {
					current_value = current_value.split(/\s+/).filter(function(v) { return v; });
				}
				
				var node_map = {};
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
						
						var is_checked = node_map.hasOwnProperty(node_name);
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
						
						var updateHandler = function() {
							var widget_id = this.getAttribute('data-widget-id');
							var checkboxes = document.querySelectorAll('input.frp-node-checkbox[data-widget-id="' + widget_id + '"]');
							var values = [];
							
							for (var j = 0; j < checkboxes.length; j++) {
								if (checkboxes[j].checked) {
									var node = checkboxes[j].getAttribute('data-node');
									var port_inp = document.querySelector('input.frp-node-port[data-widget-id="' + widget_id + '"][data-node="' + node + '"]');
									var port = port_inp ? port_inp.value.trim() : '';
									
									if (port) {
										// Validate port
										var p = parseInt(port, 10);
										if (isNaN(p) || p < 1 || p > 65535) {
											port_inp.style.setProperty('border-color', 'red', 'important');
											continue;
										} else {
											port_inp.style.borderColor = '';
										}
										values.push(node + ':' + port);
									} else {
										values.push(node);
									}
								}
							}
							
							// Store in hidden input that LuCI can track
							var hidden = document.querySelector('input[id="' + widget_id + '"]');
							if (hidden) {
								hidden.value = values.join(' ');
							}
						};
						
						checkbox.addEventListener('change', function() {
							var widget_id = this.getAttribute('data-widget-id');
							var node = this.getAttribute('data-node');
							var port_inp = document.querySelector('input.frp-node-port[data-widget-id="' + widget_id + '"][data-node="' + node + '"]');
							if (port_inp) {
								port_inp.disabled = !this.checked;
								if (!this.checked) {
									port_inp.value = '';
								}
							}
							updateHandler.call(this);
						});
						
						port_input.addEventListener('input', updateHandler);
						port_input.addEventListener('change', updateHandler);
						
						var row = E('tr', {}, [
							E('td', { 'style': 'padding: 4px 8px; border: none;' }, [
								checkbox,
								E('label', {
									'style': 'cursor: pointer; font-weight: normal; margin: 0;'
								}, node_name)
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
				
				// Hidden input with proper ID for form tracking
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

			cfgvalue: function(section_id) {
				var value = uci.get('portweaver', section_id, 'frp_nodes');
				if (Array.isArray(value)) {
					return value;
				} else if (typeof value === 'string') {
					return value.split(/\s+/).filter(function(v) { return v; });
				}
				return [];
			},

			formvalue: function(section_id) {
				var widget_id = this.cbid(section_id);
				var hidden = document.getElementById(widget_id);
				if (hidden && hidden.value) {
					return hidden.value.split(/\s+/).filter(function(v) { return v; });
				}
				return null;
			},

			write: function(section_id, formvalue) {
				if (formvalue && formvalue.length > 0) {
					return uci.set('portweaver', section_id, 'frp_nodes', formvalue);
				} else {
					return uci.unset('portweaver', section_id, 'frp_nodes');
				}
			}
		});

		o = s.option(FrpNodeSelector, 'frp_nodes', _('FRP Tunnels'));
		o.modalonly = true;
		o.rmempty = true;
		o.depends('use_port_mappings', '0');
		o.depends('enable_app_forward', '1');

		o = s.option(form.Value, 'listen_port', _('Listen Port'));
		o.modalonly = true;
		o.datatype = 'port';
		o.placeholder = '8080';
		o.depends('use_port_mappings', '0');
		o.validate = function (section_id, value) {
			var use_mappings = uci.get('portweaver', section_id, 'use_port_mappings');
			if (use_mappings !== '1') {
				if (!value || String(value).trim() === '')
					return _('This field is required in single port mode');
			}
			return true;
		};

		o = s.option(form.Value, 'target_port', _('Target Port'));
		o.modalonly = true;
		o.datatype = 'port';
		o.placeholder = '80';
		o.depends('use_port_mappings', '0');
		o.validate = function (section_id, value) {
			var use_mappings = uci.get('portweaver', section_id, 'use_port_mappings');
			if (use_mappings !== '1') {
				if (!value || String(value).trim() === '')
					return _('This field is required in single port mode');
			}
			return true;
		};

		// Multi-port mode - Dynamic list
		o = s.option(form.DynamicList, 'port_mapping', _('Port Mappings'));
		o.modalonly = true;
		o.depends('use_port_mappings', '1');
		o.placeholder = '[8080][node1:9888]:80/tcp';
		o.description = _('Format: [listen_port][frp_node:port]...:target_port/protocol or listen_port[:target_port][/protocol]. Examples: "[8080][node1:9888][node2:9999]:80/tcp" (with FRP), "8080-8090:80-90/udp" (port range), "[8080]:80/tcp" (single port with FRP), "443:8443/tcp" (single port), "80" (defaults to tcp, target_port same as listen_port)');
		o.validate = function (section_id, value) {
			if (!value || value.trim() === '') return true;

			// Helper function to validate a single port or port range
			function validatePortSpec(spec) {
				spec = spec.trim();
				if (!spec) return false;

				// Check if it's a port range (e.g., "8080-8090")
				if (spec.indexOf('-') !== -1) {
					var range = spec.split('-');
					if (range.length !== 2) return false;
					var start = parseInt(range[0], 10);
					var end = parseInt(range[1], 10);
					if (isNaN(start) || isNaN(end)) return false;
					if (start < 1 || start > 65535 || end < 1 || end > 65535) return false;
					if (start > end) return false;
				} else {
					// Single port
					var port = parseInt(spec, 10);
					if (isNaN(port) || port < 1 || port > 65535) return false;
				}
				return true;
			}

			// Helper function to validate FRP node:port format
			function validateFrpNode(spec) {
				spec = spec.trim();
				if (!spec) return false;
				var colon_idx = spec.indexOf(':');
				if (colon_idx === -1) {
					// Node name without port
					return /^[a-zA-Z0-9_-]+$/.test(spec);
				}
				var node_name = spec.substring(0, colon_idx).trim();
				var port_str = spec.substring(colon_idx + 1).trim();
				if (!node_name || !/^[a-zA-Z0-9_-]+$/.test(node_name)) return false;
				var port = parseInt(port_str, 10);
				if (isNaN(port) || port < 1 || port > 65535) return false;
				return true;
			}

			// Parse FRP nodes from format: [node1:port1][node2:port2]...
			var frp_nodes = [];
			var work_str = value.trim();
			var listen_port_idx = -1;

			while (work_str.charAt(0) === '[') {
				var close_idx = work_str.indexOf(']');
				if (close_idx === -1) {
					return _('Invalid bracket format: unmatched "[" or "]"');
				}
				var content = work_str.substring(1, close_idx).trim();
				work_str = work_str.substring(close_idx + 1).trim();

				if (content.indexOf(':') !== -1) {
					// FRP node
					if (!validateFrpNode(content)) {
						return _('Invalid FRP node format: "') + content + _('. Expected format: "node_name:port"');
					}
					frp_nodes.push(content);
				} else {
					// Listen port
					if (!validatePortSpec(content)) {
						return _('Invalid listen port in brackets: "') + content + _('". Must be a port number (1-65535) or range (e.g., "8080-8090")');
					}
					listen_port_idx = frp_nodes.length; // Mark position of listen port
				}
			}

			// Split by '/' to extract protocol
			var parts = work_str.split('/');
			if (parts.length > 2) return _('Invalid format: too many "/" separators');

			// Validate protocol if present
			if (parts.length === 2) {
				var proto = parts[1].trim().toLowerCase();
				if (!proto) return _('Protocol cannot be empty');
				if (!['tcp', 'udp', 'both'].includes(proto)) {
					return _('Protocol must be tcp, udp, or both');
				}
			}

			// Split by ':' to extract listen_port and target_port (for non-FRP part)
			var port_part = parts[0].trim();
			if (!port_part) return _('Port specification required');

			var port_split = port_part.split(':');
			if (port_split.length > 2) return _('Invalid format: too many ":" separators');

			var listen_port_str = port_split[0].trim();
			var target_port_str = port_split.length === 2 ? port_split[1].trim() : null;

			// Validate listen port from non-FRP part or use FRP listen port if available
			var listenPort = listen_port_str;
			if (listen_port_idx === -1 && !listen_port_str) {
				return _('Listen port is required');
			}

			if (listen_port_str && !validatePortSpec(listen_port_str)) {
				return _('Invalid listen port specification: "') + listen_port_str + _('. Must be a port number (1-65535) or range (e.g., "8080-8090")');
			}

			// Validate target_port if present
			if (target_port_str && !validatePortSpec(target_port_str)) {
				return _('Invalid target port specification: "') + target_port_str + _('. Must be a port number (1-65535) or range (e.g., "80-90")');
			}

			// If listen is a range, ensure target is also a range and sizes match
			var parseRange = function (spec) {
				var r = spec.split('-');
				return { start: parseInt(r[0], 10), end: parseInt(r[1], 10) };
			};

			var listenIsRange = listen_port_str && listen_port_str.indexOf('-') !== -1;
			var targetIsRange = target_port_str && target_port_str.indexOf('-') !== -1;

			if (listenIsRange) {
				if (!target_port_str) {
					// shorthand: target omitted => implicit same range, acceptable
				} else {
					if (!targetIsRange) {
						return _('When listen port is a range, target port must also be a range of the same size');
					}
					var l = parseRange(listen_port_str);
					var t = parseRange(target_port_str);
					if (isNaN(l.start) || isNaN(l.end) || isNaN(t.start) || isNaN(t.end)) {
						return _('Invalid range specification');
					}
					if ((l.end - l.start) !== (t.end - t.start)) {
						return _('Port range size mismatch: the listen and target ranges must have the same size');
					}
				}
			}

			// If target is range but listen is single, that's invalid
			if (targetIsRange && !listenIsRange) {
				return _('When target port is a range, listen port must also be a range of the same size');
			}

			return true;
		};

		o = s.option(form.Flag, 'open_firewall_port', _('Open Firewall Port'));
		o.modalonly = true;
		o.default = '1';

		o = s.option(form.Flag, 'enable_app_forward', _('Enable App Level Forward'));
		o.modalonly = true;
		o.default = '0';

		o = s.option(form.Flag, 'reuseaddr', _('Reuse Address'));
		o.modalonly = true;
		o.default = '1';
		o.depends('enable_app_forward', '1');

		o = s.option(form.Flag, 'enable_stats', _('Enable Statistics'),
			_('Collect traffic statistics (bytes_in/bytes_out) using zero-cost atomic counters. ' +
				'NOTE: Mutually exclusive with firewall forwarding - enabling stats will disable add_firewall_forward.'));
		o.modalonly = true;
		o.default = '0';
		o.depends('enable_app_forward', '1');

		o = s.option(form.Flag, 'add_firewall_forward', _('Add Firewall Forward'));
		o.modalonly = true;
		o.default = '1';
		o.depends({ 'enable_app_forward': "0" });
		o.depends({ 'enable_app_forward': "1", 'enable_stats': '0' });


		// FRP Node Management section
		s = m.section(form.GridSection, 'frp_node', _('FRP Node Management'),
			_('Configure FRP nodes for port forwarding tunneling'));
		s.anonymous = true;
		s.addremove = true;
		s.sortable = true;
		s.cloneable = true;

		s.sectiontitle = function (section_id) {
			return uci.get('portweaver', section_id, 'name') || section_id || _('Unnamed node');
		};

		o = s.option(form.Value, 'name', _('Node Name'));
		o.modalonly = true;
		o.rmempty = false;
		o.datatype = 'string';
		o.placeholder = 'node1';
		o.validate = function (section_id, value) {
			if (!value || String(value).trim() === '')
				return _('Node name is required');
			if (!/^[a-zA-Z0-9_-]+$/.test(String(value).trim()))
				return _('Node name must contain only alphanumeric characters, underscore, or hyphen');
			return true;
		};

		o = s.option(form.Value, 'server', _('FRP Server Address'));
		o.modalonly = true;
		o.rmempty = false;
		o.datatype = 'host';
		o.placeholder = '1.2.3.4';
		o.validate = function (section_id, value) {
			if (!value || String(value).trim() === '')
				return _('Server address is required');
			return true;
		};

		o = s.option(form.Value, 'port', _('FRP Server Port'));
		o.modalonly = true;
		o.rmempty = false;
		o.datatype = 'port';
		o.placeholder = '7000';
		o.validate = function (section_id, value) {
			if (!value || String(value).trim() === '')
				return _('Server port is required');
			var port = parseInt(value, 10);
			if (isNaN(port) || port < 1 || port > 65535)
				return _('Port must be between 1 and 65535');
			return true;
		};

		o = s.option(form.Value, 'token', _('Authentication Token'));
		o.modalonly = true;
		o.password = true;
		o.rmempty = true;
		o.placeholder = 'optional token for authentication';

		return m.render();
	}
});
