import { formatBytes, formatUptime, getErrorMessage } from './utils/formatters';
import { createRpcClient } from './utils/rpc-client';
import { StatusPanel } from './components/StatusPanel';
import { createFrpNodeSelector } from './components/FrpNodeSelector';
import { createPortMappingEditor } from './components/PortMappingEditor';
import type { PortWeaverStatus, ProjectStatus } from './types/portweaver';

declare const window: any;

const rpcClient = createRpcClient(rpc);

// Export as 'return' statement for LuCI compatibility
const viewModule = view.extend({
	load: function () {
		return Promise.all([
			uci.load('portweaver'),
			uci.load('firewall'),
			rpcClient.getStatus().then(function (res: PortWeaverStatus) {
				return res || {};
			}).catch(function (err: any) {
				console.warn('ubus get_status failed:', err);
				return {} as PortWeaverStatus;
			}),
			rpcClient.listProjects().then(function (res: { projects: ProjectStatus[] }) {
				return res || { projects: [] };
			}).catch(function (err: any) {
				console.warn('ubus list_projects failed:', err);
				return { projects: [] } as { projects: ProjectStatus[] };
			})
		]);
	},

	render: function (data: [any, any, PortWeaverStatus, { projects: ProjectStatus[] }]) {
		var m: any, s: any, o: any;
		var globalStatus: PortWeaverStatus = data[2] || {};
		var projectStatuses: ProjectStatus[] = data[3] ? (data[3].projects || []) : [];

		var getProjectIndex = function (section_id: string): number {
			var sections = uci.sections('portweaver', 'project');
			for (var i = 0; i < sections.length; i++) {
				if (sections[i]['.name'] === section_id) return i;
			}
			return -1;
		};

		var getProjectStatus = function (section_id: string): ProjectStatus | null {
			var idx = getProjectIndex(section_id);
			return (idx >= 0 && projectStatuses && projectStatuses[idx]) ? projectStatuses[idx] : null;
		};

		function renderStatusElements(status: ProjectStatus | null, section_id: string) {
			if (!status) {
				return [
					E('span', { 'style': 'color: gray;' }, _('N/A'))
				];
			}
			var startupFailed = status.startup_status === 'failed';
			var statusColor = (status.status === 'running' && !startupFailed) ? 'green' : '#dc3545';
			var errorMessage = null as string | null;
			if (startupFailed && status.error_code !== undefined && status.error_code !== 0) {
				errorMessage = getErrorMessage(status.error_code);
			}

			var statusBadgeAttrs: any = {
				'class': 'ifacebadge',
				'style': ''
			};
			if (errorMessage) {
				statusBadgeAttrs.title = errorMessage;
				statusBadgeAttrs.style += ' cursor: help;';
			}

			var statusElements: any[] = [
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
				let elements: any[] = [];
				if ((status.active_ports || 0) > 0) {
					elements.push(E('span', {}, _('Ports: ') + (status.active_ports || 0)));
					elements.push(E('br'));
				}
				if ((status.bytes_in || 0) && (status.bytes_out || 0)) {
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
			var updateText = function (id: string, value: any) {
				var elem = document.getElementById(id);
				if (elem) elem.textContent = String(value);
			};

			return Promise.all([
				rpcClient.getStatus(),
				rpcClient.listProjects()
			]).then(function (results: [PortWeaverStatus, { projects: ProjectStatus[] }]) {
				globalStatus = results[0] || {};
				projectStatuses = (results[1] && results[1].projects) ? results[1].projects : [];

				var statusElem = document.getElementById('status-value') as HTMLElement | null;
				var statusColors: Record<string, string> = { 'running': 'green', 'stopped': 'red', 'degraded': 'orange' };
				if (statusElem) {
					statusElem.textContent = globalStatus.status || '-';
					(statusElem.style as any).color = statusColors[globalStatus.status || ''] || 'gray';
				}

				updateText('total-projects-value', globalStatus.total_projects || 0);
				updateText('active-ports-value', globalStatus.active_ports || 0);
				updateText('uptime-value', formatUptime(globalStatus.uptime || 0));
				updateText('traffic-in-value', formatBytes(globalStatus.total_bytes_in || 0));
				updateText('traffic-out-value', formatBytes(globalStatus.total_bytes_out || 0));

				(function () {
					var sections = uci.sections('portweaver', 'project') || [];
					for (var i = 0; i < sections.length; i++) {
						var section_id = sections[i]['.name'];
						var status = getProjectStatus(section_id);
						var section = document.getElementById('project-status-' + section_id);
						if (!section) continue;
						var newStatusElements = renderStatusElements(status, section_id);
						section.replaceWith(E('div', { 'id': 'project-status-' + section_id }, newStatusElements));
					}
				})();
			}).catch(function (err: any) {
				console.warn('Auto-refresh failed:', err);
			});
		}, 3);

		// Global settings section
		s = m.section(form.NamedSection, 'global', 'global', _('Global Settings'));

		o = s.option(form.Flag, 'enabled', _('Enable PortWeaver'));
		o.default = '1';
		o.rmempty = false;

		// Runtime status display (component)
		o = s.option(form.DummyValue, '_runtime_status', _('Runtime Status'));
		o.rawhtml = true;
		o.cfgvalue = function () {
			var panel = new StatusPanel(E, _);
			return panel.render(globalStatus);
		};

		// Helper to toggle runtime enable via RPC
		var runtimeToggle = function (section_id: string) {
			var idx = getProjectIndex(section_id);
			if (idx < 0) {
				ui.addNotification(null, E('p', _('Could not determine project index')), 'error');
				return Promise.resolve();
			}
			var status = getProjectStatus(section_id);
			var newEnabled = !(status && status.enabled);
			return rpcClient.setEnabled(idx, !!newEnabled).then(function () {
				ui.addNotification(null, E('p', _('Runtime state updated to: ') + (newEnabled ? _('enabled') : _('disabled'))), 'info');
				return Promise.all([rpcClient.getStatus(), rpcClient.listProjects()]).then(function (results) {
					globalStatus = results[0] || {};
					projectStatuses = (results[1] && results[1].projects) ? results[1].projects : [];
					location.reload();
				});
			}).catch(function (err: any) {
				ui.addNotification(null, E('p', _('Failed to toggle runtime state: ') + (err?.message || String(err))), 'error');
			});
		};
		(window as any).portweaverToggle = runtimeToggle;

		// Port forwarding rules section
		s = m.section(form.GridSection, 'project', _('Port Forwarding Projects'),
			_('Configure port forwarding projects for PortWeaver'));
		s.anonymous = true;
		s.addremove = true;
		s.sortable = true;
		s.cloneable = true;

		s.sectiontitle = function (section_id: string) {
			return uci.get('portweaver', section_id, 'remark') || _('Unnamed project');
		};

		// Runtime status indicator column
		o = s.option(form.DummyValue, '_runtime_status', _('Status'));
		o.modalonly = false;
		o.textvalue = function (section_id: string) {
			var status = getProjectStatus(section_id);
			return E('div', { 'id': 'project-status-' + section_id }, renderStatusElements(status, section_id));
		};

		// Runtime toggle column
		o = s.option(form.Button, '_runtime_toggle', _('Toggle'));
		o.modalonly = false;
		o.editable = true;
		o.inputtitle = function (section_id: string) {
			var status = getProjectStatus(section_id);
			return (status && status.enabled) ? _('Disable') : _('Enable');
		};
		o.onclick = function (_ev: any, section_id: string) { return (window as any).portweaverToggle(section_id); };

		o = s.option(form.Flag, 'enabled', _('Enabled'));
		o.modalonly = false;
		o.default = '1';
		o.editable = true;

		// Preview column
		o = s.option(form.DummyValue, '_preview', _('Overview'));
		o.modalonly = false;
		o.textvalue = function (section_id: string) {
			var protocol = uci.get('portweaver', section_id, 'protocol') || 'tcp';
			var family = uci.get('portweaver', section_id, 'family') || 'any';
			var listen_port = uci.get('portweaver', section_id, 'listen_port') || '';
			var target_address = uci.get('portweaver', section_id, 'target_address') || '';
			var target_port = uci.get('portweaver', section_id, 'target_port') || '';
			var port_mappings = L.toArray(uci.get('portweaver', section_id, 'port_mapping'));
			var src_zones = L.toArray(uci.get('portweaver', section_id, 'src_zone'));
			var dest_zones = L.toArray(uci.get('portweaver', section_id, 'dest_zone'));

			var proto_text: string = ({ 'both': _('TCP and UDP'), 'tcp': 'TCP', 'udp': 'UDP' } as any)[protocol] || String(protocol).toUpperCase();
			var family_text: string = ({ 'any': _('IPv4 and IPv6'), 'ipv4': 'IPv4', 'ipv6': 'IPv6' } as any)[family] || family;

			var lines: any[] = [];
			lines.push(E('span', {}, [ _('Incoming '), E('var', {}, family_text), _(' protocol '), E('var', {}, proto_text) ]));

			if (src_zones.length > 0) {
				var src_badges = src_zones.map(function (z: string) {
					return E('span', { 'class': 'zonebadge', 'style': fwmodel.getZoneColorStyle(z) }, [ E('strong', {}, z || E('em', _('any zone'))) ]);
				});
				lines.push(E('br'));
				lines.push(E('span', {}, [_('From '), ...src_badges]));
			}

			if (port_mappings.length > 0) {
				lines.push(E('br'));
				lines.push(E('span', {}, [ E('strong', { style: 'color: #09c;' }, _('Multi-Port')), _(' - '), E('var', {}, port_mappings.length), _(' mapping(s)') ]));
				var first = port_mappings[0];
				lines.push(E('br'));
				lines.push(E('span', {}, [ _('e.g. '), E('var', {}, first) ]));
			} else if (listen_port) {
				lines.push(E('br'));
				lines.push(E('span', {}, [ _('Port '), E('var', {}, listen_port) ]));
			}

			lines.push(E('br'));
			lines.push(E('span', {}, [ E('var', { 'data-tooltip': 'Forward' }, _('Forward')), _(' to ') ]));

			if (dest_zones.length > 0) {
				var dest_badges = dest_zones.map(function (z: string) {
					return E('span', { 'class': 'zonebadge', 'style': fwmodel.getZoneColorStyle(z) }, [ E('strong', {}, z || E('em', _('any zone'))) ]);
				});
				lines.push(...dest_badges);
				lines.push(_(' '));
			}

			if (target_address) {
				lines.push(E('span', {}, [ _('IP '), E('var', {}, target_address) ]));
			}
			if (port_mappings.length === 0 && target_port) {
				lines.push(E('span', {}, [ _(' port '), E('var', {}, target_port) ]));
			}
			return E('small', {}, lines);
		};

		// Modal configuration fields
		o = s.option(form.Value, 'remark', _('Remark'));
		o.modalonly = true;
		o.rmempty = false;
		o.datatype = 'string';
		o.validate = function (_section_id: string, value: string) { if (!value || String(value).trim() === '') return _('This field is required'); return true; };
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
		o.validate = function (_section_id: string, value: string) { if (!value || String(value).trim() === '') return _('This field is required'); return true; };

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

		// FRP node selector component factory
		const FrpNodeSelector = createFrpNodeSelector(form, uci, E, _);
		o = s.option(FrpNodeSelector, 'frp_nodes', _('FRP Tunnels'));
		o.modalonly = true;
		o.rmempty = true;
		o.depends('use_port_mappings', '0');
		o.depends('enable_app_forward', '1');

		// Port Mapping Editor component factory
		const PortMappingEditor = createPortMappingEditor(form, uci, E, _);
		o = s.option(PortMappingEditor, 'port_mapping', _('Port Mappings'));
		o.modalonly = true;
		o.depends('use_port_mappings', '1');

		o = s.option(form.Value, 'listen_port', _('Listen Port'));
		o.modalonly = true;
		o.datatype = 'port';
		o.placeholder = '8080';
		o.depends('use_port_mappings', '0');
		o.validate = function (section_id: string, value: string) {
			var use_mappings = uci.get('portweaver', section_id, 'use_port_mappings');
			if (use_mappings !== '1') {
				if (!value || String(value).trim() === '') return _('This field is required in single port mode');
			}
			return true;
		};

		o = s.option(form.Value, 'target_port', _('Target Port'));
		o.modalonly = true;
		o.datatype = 'port';
		o.placeholder = '80';
		o.depends('use_port_mappings', '0');
		o.validate = function (section_id: string, value: string) {
			var use_mappings = uci.get('portweaver', section_id, 'use_port_mappings');
			if (use_mappings !== '1') {
				if (!value || String(value).trim() === '') return _('This field is required in single port mode');
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
		o.depends({ 'enable_app_forward': '0' });
		o.depends({ 'enable_app_forward': '1', 'enable_stats': '0' });

		// FRP Node Management section
		s = m.section(form.GridSection, 'frp_node', _('FRP Node Management'),
			_('Configure FRP nodes for port forwarding tunneling'));
		s.anonymous = true;
		s.addremove = true;
		s.sortable = true;
		s.cloneable = true;

		s.sectiontitle = function (section_id: string) {
			return uci.get('portweaver', section_id, 'name') || section_id || _('Unnamed node');
		};

		o = s.option(form.Value, 'name', _('Node Name'));
		o.modalonly = true;
		o.rmempty = false;
		o.datatype = 'string';
		o.placeholder = 'node1';
		o.validate = function (_section_id: string, value: string) {
			if (!value || String(value).trim() === '') return _('Node name is required');
			if (!/^[a-zA-Z0-9_-]+$/.test(String(value).trim())) return _('Node name must contain only alphanumeric characters, underscore, or hyphen');
			return true;
		};

		o = s.option(form.Value, 'server', _('FRP Server Address'));
		o.modalonly = true;
		o.rmempty = false;
		o.datatype = 'host';
		o.placeholder = '1.2.3.4';
		o.validate = function (_section_id: string, value: string) { if (!value || String(value).trim() === '') return _('Server address is required'); return true; };

		o = s.option(form.Value, 'port', _('FRP Server Port'));
		o.modalonly = true;
		o.rmempty = false;
		o.datatype = 'port';
		o.placeholder = '7000';
		o.validate = function (_section_id: string, value: string) {
			if (!value || String(value).trim() === '') return _('Server port is required');
			var port = parseInt(value, 10);
			if (isNaN(port) || port < 1 || port > 65535) return _('Port must be between 1 and 65535');
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

export default viewModule;
