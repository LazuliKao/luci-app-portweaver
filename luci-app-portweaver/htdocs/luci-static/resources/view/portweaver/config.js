'use strict';
'require view';
'require form';
'require uci';
'require firewall as fwmodel';
'require tools.widgets as widgets';

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('portweaver'),
			uci.load('firewall')
		]);
	},

	render: function(data) {
		var m, s, o;

		m = new form.Map('portweaver', _('PortWeaver'),
			_('Port forwarding and NAT traversal configuration'));

		// Port forwarding rules section
		s = m.section(form.GridSection, 'project', _('Port Forwarding Projects'),
			_('Configure port forwarding projects for PortWeaver'));
		s.anonymous = false;
		s.addremove = true;
		s.sortable = true;
		s.cloneable = true;

		s.sectiontitle = function(section_id) {
			return uci.get('portweaver', section_id, 'remark') || _('Unnamed project');
		};

		// Preview column
		o = s.option(form.DummyValue, '_preview', _('Overview'));
		o.modalonly = false;
		o.textvalue = function(section_id) {
			var protocol = uci.get('portweaver', section_id, 'protocol') || 'tcp';
			var family = uci.get('portweaver', section_id, 'family') || 'any';
			var listen_port = uci.get('portweaver', section_id, 'listen_port') || '';
			var target_address = uci.get('portweaver', section_id, 'target_address') || '';
			var target_port = uci.get('portweaver', section_id, 'target_port') || '';
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
				var src_badges = src_zones.map(function(z) {
					return E('span', {
						'class': 'zonebadge',
						'style': fwmodel.getZoneColorStyle(z)
					}, [E('strong', {}, z || E('em', _('any zone')))]);
				});
				lines.push(E('br'));
				lines.push(E('span', {}, [_('From '), ...src_badges]));
			}

			// Listen port line
			if (listen_port) {
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
				var dest_badges = dest_zones.map(function(z) {
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
			if (target_port) {
				lines.push(E('span', {}, [
					_(' port '),
					E('var', {}, target_port)
				]));
			}

			return E('small', {}, lines);
		};

		o = s.option(form.Value, 'remark', _('Remark'));
		o.modalonly = true;
		o.rmempty = false;
		o.validate = function(section_id, value) {
			if (!value || String(value).trim() === '')
				return _('This field is required');
			return true;
		};
		o.datatype = 'string';
		o.placeholder = 'My Project';

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

		o = s.option(form.ListValue, 'protocol', _('Protocol'));
		o.modalonly = true;
		o.value('both', _('TCP and UDP'));
		o.value('tcp', 'TCP');
		o.value('udp', 'UDP');
		o.default = 'tcp';

		o = s.option(form.Value, 'listen_port', _('Listen Port'));
		o.modalonly = true;
		o.rmempty = false;
		o.validate = function(section_id, value) {
			if (!value || String(value).trim() === '')
				return _('This field is required');
			return true;
		};
		o.datatype = 'port';
		o.placeholder = '8080';

		o = s.option(form.Flag, 'reuseaddr', _('Reuse Address'));
		o.modalonly = true;
		o.default = '1';

		o = s.option(form.Value, 'target_address', _('Target Address'));
		o.modalonly = true;
		o.rmempty = false;
		o.validate = function(section_id, value) {
			if (!value || String(value).trim() === '')
				return _('This field is required');
			return true;
		};
		o.datatype = 'host';
		o.placeholder = '192.168.1.100';

		o = s.option(form.Value, 'target_port', _('Target Port'));
		o.modalonly = true;
		o.rmempty = false;
		o.validate = function(section_id, value) {
			if (!value || String(value).trim() === '')
				return _('This field is required');
			return true;
		};
		o.datatype = 'port';
		o.placeholder = '80';

		o = s.option(form.Flag, 'open_firewall_port', _('Open Firewall Port'));
		o.modalonly = true;
		o.default = '1';

		o = s.option(form.Flag, 'add_firewall_forward', _('Add Firewall Forward'));
		o.modalonly = true;
		o.default = '1';

		return m.render();
	}
});
