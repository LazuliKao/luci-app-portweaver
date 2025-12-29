'use strict';
'require view';
'require form';
'require uci';
'require firewall as fwmodel';
'require tools.widgets as widgets';

return view.extend({
	load: function () {
		return Promise.all([
			uci.load('portweaver'),
			uci.load('firewall')
		]);
	},

	render: function (data) {
		var m, s, o;

		m = new form.Map('portweaver', _('PortWeaver'),
			_('Port forwarding and NAT traversal configuration'));

		// Global settings section
		s = m.section(form.NamedSection, 'global', 'global', _('Global Settings'));

		o = s.option(form.Flag, 'enabled', _('Enable PortWeaver'));
		o.default = '1';
		o.rmempty = false;

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

		o = s.option(form.Flag, 'add_firewall_forward', _('Add Firewall Forward'));
		o.modalonly = true;
		o.default = '1';

		o = s.option(form.Flag, 'enable_app_forward', _('Enable App Level Forward'));
		o.modalonly = true;
		o.default = '0';

		o = s.option(form.Flag, 'reuseaddr', _('Reuse Address'));
		o.modalonly = true;
		o.default = '1';
		o.depends('enable_app_forward', '1');

		return m.render();
	}
});
