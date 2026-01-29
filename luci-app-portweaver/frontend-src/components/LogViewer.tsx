export interface LogInfo {
  status: string;
  last_error: string;
  logs: string[];
}

export interface LogViewerProps {
  name: string;
  title: string;
  fetcher: (name: string) => Promise<LogInfo>;
  clearer: (name: string) => Promise<void>;
}

export class LogViewer {
  private props: LogViewerProps;
  private modal: HTMLElement | null = null;
  private logContainer: HTMLElement | null = null;
  private statusSpan: HTMLElement | null = null;
  private errorSpan: HTMLElement | null = null;

  // Added state fields
  private status: string = "unavailable";
  private logs: string[] = [];
  private lastError: string = "";
  private isOpen: boolean = false;
  private pollInterval: number | null = null;

  constructor(props: LogViewerProps) {
    this.props = props;
  }

  render(): HTMLElement {
    const statusColor =
      {
        connected: "#4CAF50",
        connecting: "#FFC107",
        error: "#F44336",
        stopped: "#9E9E9E",
        unavailable: "#9E9E9E",
      }[this.status] || "#9E9E9E";

    // Store refs to DOM nodes directly (no querySelector/getElementById)
    this.statusSpan = (
      <span style={`color: ${statusColor}; font-weight: 600;`}>
        {this.status}
      </span>
    );

    this.errorSpan = (
      <div
        style={
          this.lastError
            ? "color: #F44336; margin-top: 0.3em; display:block"
            : "color: #F44336; margin-top: 0.3em; display:none"
        }
      >
        {this.lastError}
      </div>
    );

    const placeholder = (
      <div style="color: #6c757d; text-align: center; padding: 2em;">
        No logs available
      </div>
    );

    this.logContainer = (
      <div style="flex: 1; overflow-y: auto; padding: 1em; background: #f8f9fa; font-family: monospace; font-size: 0.85em; line-height: 1.5;">
        {this.logs.length === 0 ? placeholder : null}
      </div>
    );

    this.modal = (
      <div
        style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;"
        onclick={(e: MouseEvent) => {
          if (e.target === e.currentTarget) this.close();
        }}
      >
        <div style="background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 90%; max-width: 800px; max-height: 80vh; display: flex; flex-direction: column;">
          {/* Header */}
          <div style="padding: 1.5em; border-bottom: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h3 style="margin: 0; font-size: 1.2em; font-weight: 600;">
                {this.props.title}
              </h3>
              <div style="font-size: 0.85em; color: #6c757d; margin-top: 0.3em;">
                Status: {this.statusSpan}
                {this.errorSpan}
              </div>
            </div>
            <button
              type="button"
              onclick={() => this.close()}
              style="background: none; border: none; font-size: 1.5em; cursor: pointer; color: #6c757d;"
            >
              ×
            </button>
          </div>

          {/* Logs Container (stored in this.logContainer) */}
          {this.logContainer}

          {/* Footer */}
          <div style="padding: 1em; border-top: 1px solid #dee2e6; display: flex; gap: 0.5em; justify-content: flex-end;">
            <button
              type="button"
              onclick={() => this.copyToClipboard()}
              style="padding: 0.5em 1em; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em;"
            >
              Copy to Clipboard
            </button>
            <button
              type="button"
              onclick={() => this.clearLogs()}
              style="padding: 0.5em 1em; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em;"
            >
              Clear Logs
            </button>
            <button
              type="button"
              onclick={() => this.close()}
              style="padding: 0.5em 1em; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em;"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );

    return this.modal;
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    // Render and attach modal, then populate initial content
    const node = this.render();
    document.body.appendChild(node);
    this.updateDisplay();
    this.startPolling();
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.stopPolling();
    this.modal?.parentElement?.removeChild(this.modal);
    // Release DOM references to avoid retaining detached nodes
    this.modal = null;
    this.logContainer = null;
    this.statusSpan = null;
    this.errorSpan = null;
  }

  private startPolling(): void {
    this.fetchLogs();
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    this.pollInterval = window.setInterval(() => {
      if (this.isOpen) {
        this.fetchLogs();
      }
    }, 3000);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private fetchLogs(): void {
    this.props
      .fetcher(this.props.name)
      .then((response: LogInfo) => {
        this.status = response.status || "unavailable";
        this.lastError = response.last_error || "";
        this.logs = response.logs || [];
        this.updateDisplay();
      })
      .catch((err: any) => {
        console.error("Failed to fetch logs:", err);
        this.status = "error";
        this.lastError = "Failed to fetch logs";
        this.updateDisplay();
      });
  }

  private updateDisplay(): void {
    // Update status
    if (this.statusSpan) {
      this.statusSpan.textContent = this.status;
      // update color
      const color =
        {
          connected: "#4CAF50",
          connecting: "#FFC107",
          error: "#F44336",
          stopped: "#9E9E9E",
          unavailable: "#9E9E9E",
        }[this.status] || "#9E9E9E";
      this.statusSpan.setAttribute(
        "style",
        `color: ${color}; font-weight: 600;`,
      );
    }

    // Update error
    if (this.errorSpan) {
      if (this.lastError) {
        this.errorSpan.style.display = "";
        this.errorSpan.textContent = this.lastError;
      } else {
        this.errorSpan.style.display = "none";
      }
    }

    // Update logs
    if (this.logContainer) {
      // clear existing children
      while (this.logContainer.firstChild) {
        this.logContainer.removeChild(this.logContainer.firstChild);
      }
      if (this.logs.length === 0) {
        const noLogs = document.createElement("div");
        noLogs.style.cssText =
          "color: #6c757d; text-align: center; padding: 2em;";
        noLogs.textContent = "No logs available";
        this.logContainer?.appendChild(noLogs);
      } else {
        this.logs.forEach((log) => {
          const logEl = document.createElement("div");
          logEl.style.cssText =
            "color: #333; word-break: break-word; margin-bottom: 0.2em;";
          logEl.textContent = log;
          this.logContainer?.appendChild(logEl);
        });
      }
      this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }
  }

  private copyToClipboard(): void {
    const text = this.logs.join("\n");
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("Logs copied to clipboard");
      })
      .catch((err: any) => {
        console.error("Failed to copy logs:", err);
        alert("Failed to copy logs");
      });
  }

  private clearLogs(): void {
    if (confirm("Are you sure you want to clear the logs?")) {
      this.props
        .clearer(this.props.name)
        .then(() => {
          this.logs = [];
          this.updateDisplay();
        })
        .catch((err: any) => {
          console.error("Failed to clear logs:", err);
          alert("Failed to clear logs");
        });
    }
  }
}
