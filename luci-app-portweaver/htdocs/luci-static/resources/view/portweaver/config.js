'use strict';
'require view';
'require form';
'require uci';
'require firewall as fwmodel';
'require tools.widgets as widgets';
'require rpc';
'require poll';

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
	expect: {}
});

return view.extend({
	load: function () {
		return Promise.all([
			uci.load('portweaver'),
			uci.load('firewall'),
			callPortWeaverStatus().then(function (res) {
				console.log('ubus get_status response:', res);
				return res;
			}).catch(function (err) {
				console.warn('ubus get_status failed:', err);
				return {};
			}),
			callPortWeaverListProjects().then(function (res) {
				console.log('ubus list_projects response:', res);
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
			var days = Math.floor(seconds / 86400);
			var hours = Math.floor((seconds % 86400) / 3600);
			var mins = Math.floor((seconds % 3600) / 60);
			if (days > 0) return days + 'd ' + hours + 'h';
			if (hours > 0) return hours + 'h ' + mins + 'm';
			return mins + 'm';
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

		m = new form.Map('portweaver', _('PortWeaver'),
			_('Port forwarding and NAT traversal configuration'));

		// Setup auto-refresh
		poll.add(function () {
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

				var elem = document.getElementById('total-projects-value');
				if (elem) elem.textContent = globalStatus.total_projects || 0;

				elem = document.getElementById('active-ports-value');
				if (elem) elem.textContent = globalStatus.active_ports || 0;

				elem = document.getElementById('uptime-value');
				if (elem) elem.textContent = formatUptime(globalStatus.uptime || 0);

				elem = document.getElementById('traffic-in-value');
				if (elem) elem.textContent = formatBytes(globalStatus.total_bytes_in || 0);

				elem = document.getElementById('traffic-out-value');
				if (elem) elem.textContent = formatBytes(globalStatus.total_bytes_out || 0);
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

		// Port forwarding rules section
		s = m.section(form.GridSection, 'project', _('Port Forwarding Projects'),
			_('Configure port forwarding projects for PortWeaver'));
		s.anonymous = false;
		s.addremove = true;
		s.sortable = true;
		s.cloneable = true;
		s.cloneable = true;

		s.sectiontitle = function (section_id) {
			return uci.get('portweaver', section_id, 'remark') || _('Unnamed project');
		};

		// Runtime status indicator column (leftmost)
		o = s.option(form.DummyValue, '_runtime_status', _('Status'));
		o.modalonly = false;
		o.textvalue = function (section_id) {
			// Find runtime status for this section
			var idx = -1;
			var sections = uci.sections('portweaver', 'project');
			for (var i = 0; i < sections.length; i++) {
				if (sections[i]['.name'] === section_id) {
					idx = i;
					break;
				}
			}

			var status = null;
			if (idx >= 0 && projectStatuses && projectStatuses[idx]) {
				status = projectStatuses[idx];
			}

			if (!status) {
				return E('span', { 'style': 'color: gray;' }, _('N/A'));
			}

			var statusColor = (status.status === 'running') ? 'green' : 'red';
			var formatBytes = function (bytes) {
				if (bytes < 1024) return bytes + ' B';
				if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
				return (bytes / 1048576).toFixed(1) + ' MB';
			};

			// Check startup status and error code
			var startupFailed = status.startup_status === 'failed';
			var errorMessage = null;
			if (startupFailed && status.error_code !== undefined && status.error_code !== 0) {
				errorMessage = getErrorMessage(status.error_code);
			}

			var statusBadgeAttrs = {
				'class': 'ifacebadge',
				'style': 'background-color: ' + (startupFailed ? '#dc3545' : statusColor) + ';'
			};
			if (errorMessage) {
				statusBadgeAttrs.title = errorMessage;
				statusBadgeAttrs.style += ' cursor: help;';
			}

			var statusElements = [
				E('div', {}, [
					E('span', statusBadgeAttrs, [
						E('strong', {}, startupFailed ? 'failed' : (status.status || 'unknown'))
					])
				])
			];

			if (errorMessage) {
				statusElements.push(
					E('small', { 'style': 'color: #dc3545; margin-top: 0.3em;' }, [
						'⚠ ' + errorMessage
					])
				);
			} else {
				let elements = [
					_('Ports: ') + (status.active_ports || 0),
					E('br')
				];
				if (status.bytes_in && status.bytes_out) {
					elements.push('↓ ' + formatBytes(status.bytes_in || 0) + ' ↑ ' + formatBytes(status.bytes_out || 0));
				}
				statusElements.push(
					E('small', {}, elements)
				);
			}

			return E('div', {}, statusElements);
		};

		// Runtime toggle column
		o = s.option(form.Button, '_runtime_toggle', _('Toggle'));
		o.modalonly = false;
		o.inputtitle = function (section_id) {
			var idx = -1;
			var sections = uci.sections('portweaver', 'project');
			for (var i = 0; i < sections.length; i++) {
				if (sections[i]['.name'] === section_id) {
					idx = i;
					break;
				}
			}

			var status = null;
			if (idx >= 0 && projectStatuses && projectStatuses[idx]) {
				status = projectStatuses[idx];
			}

			return (status && status.enabled) ? _('Disable') : _('Enable');
		};
		o.onclick = function (ev, section_id) {
			var idx = -1;
			var sections = uci.sections('portweaver', 'project');
			for (var i = 0; i < sections.length; i++) {
				if (sections[i]['.name'] === section_id) {
					idx = i;
					break;
				}
			}

			if (idx < 0) {
				ui.addNotification(null, E('p', _('Could not determine project index')), 'error');
				return;
			}

			var status = null;
			if (projectStatuses && projectStatuses[idx]) {
				status = projectStatuses[idx];
			}

			var newEnabled = !(status && status.enabled);

			return callPortWeaverSetEnabled({
				id: idx,
				enabled: newEnabled
			}).then(function (res) {
				ui.addNotification(null, E('p', _('Runtime state updated to: ') + (newEnabled ? _('enabled') : _('disabled'))), 'info');
				// Refresh status immediately
				return Promise.all([
					callPortWeaverStatus(),
					callPortWeaverListProjects()
				]).then(function (results) {
					globalStatus = results[0] || {};
					projectStatuses = (results[1] && results[1].projects) ? results[1].projects : [];
					// Force UI refresh
					location.reload();
				});
			}).catch(function (err) {
				ui.addNotification(null, E('p', _('Failed to toggle runtime state: ') + (err.message || err)), 'error');
			});
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
		o.placeholder = '8080-8090:80-90/tcp';
		o.description = _('Format: listen_port[:target_port][/protocol]. Examples: "8080-8090:80-90/udp", "8080-8090/udp" (shorthand, target defaults to same range), "443:8443/tcp", "80" (defaults to tcp, target_port same as listen_port)');
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

			// Split by '/' to extract protocol
			var parts = value.split('/');
			if (parts.length > 2) return _('Invalid format: too many "/" separators');

			// Validate protocol if present
			if (parts.length === 2) {
				var proto = parts[1].trim().toLowerCase();
				if (!proto) return _('Protocol cannot be empty');
				if (!['tcp', 'udp', 'both'].includes(proto)) {
					return _('Protocol must be tcp, udp, or both');
				}
			}

			// Split by ':' to extract listen_port and target_port
			var port_part = parts[0].trim();
			if (!port_part) return _('Port specification required');

			var port_split = port_part.split(':');
			if (port_split.length > 2) return _('Invalid format: too many ":" separators');

			// Validate listen_port
			var listenParsed = validatePortSpec(port_split[0]);
			if (!listenParsed || listenParsed === false) {
				return _('Invalid listen port specification. Must be a port number (1-65535) or range (e.g., "8080-8090")');
			}

			// Validate target_port if present
			var targetParsed = null;
			if (port_split.length === 2) {
				targetParsed = validatePortSpec(port_split[1]);
				if (!targetParsed || targetParsed === false) {
					return _('Invalid target port specification. Must be a port number (1-65535) or range (e.g., "80-90")');
				}
			}

			// If listen is a range, allow implicit target (same range) or validate explicit target range size matches
			var parseRange = function (spec) {
				var r = spec.split('-');
				return { start: parseInt(r[0], 10), end: parseInt(r[1], 10) };
			};

			var listenIsRange = port_split[0].indexOf('-') !== -1;
			var targetIsRange = port_split.length === 2 && port_split[1].indexOf('-') !== -1;

			if (listenIsRange) {
				if (!targetParsed) {
					// shorthand: target omitted => implicit same range, acceptable
				} else {
					if (!targetIsRange) {
						return _('When listen port is a range, target port must also be a range of the same size');
					}
					var l = parseRange(port_split[0]);
					var t = parseRange(port_split[1]);
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

		return m.render();
	}
});
