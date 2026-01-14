import type { PortWeaverStatus } from '../types/portweaver';
import { formatBytes, formatUptime } from '../utils/formatters';

export class StatusPanel {
  constructor() { }

  render(status: PortWeaverStatus): HTMLElement {

    const statusColor = {
      running: '#28a745',
      stopped: '#dc3545',
      degraded: '#ffc107'
    }[status.status || ''] || '#6c757d';

    return (
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1em; margin-top: 0.5em;">
        {this.card(_('Status'), (
          <strong
            style={`color: ${statusColor}; font-size: 1.1em; font-weight: 600;`}
            id="status-value"
          >
            {status.status || '-'}
          </strong>
        ))}

        {this.card(_('Total Projects'), (
          <strong style="font-size: 1.1em; font-weight: 600;" id="total-projects-value">
            {status.total_projects || 0}
          </strong>
        ))}

        {this.card(_('Active Ports'), (
          <strong style="font-size: 1.1em; font-weight: 600;" id="active-ports-value">
            {status.active_ports || 0}
          </strong>
        ))}

        {this.card(_('Uptime'), (
          <strong style="font-size: 1.1em; font-weight: 600;" id="uptime-value">
            {formatUptime(status.uptime || 0)}
          </strong>
        ))}

        {this.card(_('Traffic In'), (
          <strong style="font-size: 1.1em; font-weight: 600;" id="traffic-in-value">
            {formatBytes(status.total_bytes_in || 0)}
          </strong>
        ))}

        {this.card(_('Traffic Out'), (
          <strong style="font-size: 1.1em; font-weight: 600;" id="traffic-out-value">
            {formatBytes(status.total_bytes_out || 0)}
          </strong>
        ))}
      </div>
    );
  }

  private card(label: string, valueEl: any): HTMLElement {
    return (
      <div style="border: 1px solid #dee2e6; padding: 0.8em; border-radius: 4px; background: transparent;">
        <div style="font-size: 0.85em; color: #6c757d; margin-bottom: 0.3em;">
          {label}
        </div>
        {valueEl}
      </div>
    );
  }
}