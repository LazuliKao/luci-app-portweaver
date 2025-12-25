'use strict';
'require view';
'require form';
'require uci';

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('portweaver')
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

		o = s.option(form.Value, 'remark', _('Remark'));
		o.rmempty = false;
		o.datatype = 'string';
		o.placeholder = 'My Project';

		o = s.option(form.ListValue, 'family', _('Address Family'));
		o.value('any', _('IPv4 and IPv6'));
		o.value('ipv4', 'IPv4');
		o.value('ipv6', 'IPv6');
		o.default = 'any';

		o = s.option(form.ListValue, 'protocol', _('Protocol'));
		o.value('both', _('TCP and UDP'));
		o.value('tcp', 'TCP');
		o.value('udp', 'UDP');
		o.default = 'tcp';

		o = s.option(form.Value, 'listen_port', _('Listen Port'));
		o.rmempty = false;
		o.datatype = 'port';
		o.placeholder = '8080';

		o = s.option(form.Flag, 'reuseaddr', _('Reuse Address'));
		o.default = '1';

		o = s.option(form.Value, 'target_address', _('Target Address'));
		o.rmempty = false;
		o.datatype = 'host';
		o.placeholder = '192.168.1.100';

		o = s.option(form.Value, 'target_port', _('Target Port'));
		o.rmempty = false;
		o.datatype = 'port';
		o.placeholder = '80';

		o = s.option(form.Flag, 'open_firewall_port', _('Open Firewall Port'));
		o.default = '1';

		o = s.option(form.Flag, 'add_firewall_forward', _('Add Firewall Forward'));
		o.default = '1';

		return m.render();
	}
});
