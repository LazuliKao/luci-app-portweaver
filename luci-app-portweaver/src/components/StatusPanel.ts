import type { PortWeaverStatus } from '../types/portweaver';
import { formatBytes, formatUptime } from '../utils/formatters';

export class StatusPanel {
  constructor(private E: any, private _: (t: string, ...a: any[]) => string) {}

  render(status: PortWeaverStatus): HTMLElement {
    const E = this.E;
    const _ = this._;

    const statusColor = {
      running: '#28a745',
      stopped: '#dc3545',
      degraded: '#ffc107'
    }[status.status || ''] || '#6c757d';

    return E('div', { 'style': 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 1em; margin-top: 0.5em;' }, [
      this.card(_('Status'), E('strong', {
        'style': `color: ${statusColor}; font-size: 1.1em; font-weight: 600;`,
        'id': 'status-value'
      }, status.status || '-')),
      this.card(_('Total Projects'), E('strong', { 'style': 'font-size: 1.1em; font-weight: 600;', 'id': 'total-projects-value' }, status.total_projects || 0)),
      this.card(_('Active Ports'), E('strong', { 'style': 'font-size: 1.1em; font-weight: 600;', 'id': 'active-ports-value' }, status.active_ports || 0)),
      this.card(_('Uptime'), E('strong', { 'style': 'font-size: 1.1em; font-weight: 600;', 'id': 'uptime-value' }, formatUptime(status.uptime || 0))),
      this.card(_('Traffic In'), E('strong', { 'style': 'font-size: 1.1em; font-weight: 600;', 'id': 'traffic-in-value' }, formatBytes(status.total_bytes_in || 0))),
      this.card(_('Traffic Out'), E('strong', { 'style': 'font-size: 1.1em; font-weight: 600;', 'id': 'traffic-out-value' }, formatBytes(status.total_bytes_out || 0)))
    ]);
  }

  private card(label: string, valueEl: HTMLElement): HTMLElement {
    const E = this.E;
    return E('div', { 'style': 'border: 1px solid #dee2e6; padding: 0.8em; border-radius: 4px; background: transparent;' }, [
      E('div', { 'style': 'font-size: 0.85em; color: #6c757d; margin-bottom: 0.3em;' }, label),
      valueEl
    ]);
  }
}
