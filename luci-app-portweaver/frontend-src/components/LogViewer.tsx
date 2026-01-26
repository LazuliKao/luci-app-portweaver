import { rpcClient } from "../modules/client";

export class LogViewer {
  private projectId: number;
  private isOpen: boolean = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private logs: string[] = [];
  private status: string = "unavailable";
  private lastError: string = "";

  constructor(projectId: number) {
    this.projectId = projectId;
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

    return (
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
                FRP Client Logs
              </h3>
              <div style="font-size: 0.85em; color: #6c757d; margin-top: 0.3em;">
                Status:{" "}
                <span style={`color: ${statusColor}; font-weight: 600;`}>
                  {this.status}
                </span>
                {this.lastError && (
                  <div style="color: #F44336; margin-top: 0.3em;">
                    Error: {this.lastError}
                  </div>
                )}
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

          {/* Logs Container */}
          <div
            style="flex: 1; overflow-y: auto; padding: 1em; background: #f8f9fa; font-family: monospace; font-size: 0.85em; line-height: 1.5;"
            id={`logs-container-${this.projectId}`}
          >
            {this.logs.length === 0 ? (
              <div style="color: #6c757d; text-align: center; padding: 2em;">
                No logs available
              </div>
            ) : (
              this.logs.map((log) => (
                <div style="color: #333; word-break: break-word;">{log}</div>
              ))
            )}
          </div>

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
  }

  open(): void {
    this.isOpen = true;
    this.startPolling();
    document.body.appendChild(this.render());
  }

  close(): void {
    this.isOpen = false;
    this.stopPolling();
    const modal = document
      .querySelector(`[id^="logs-container-${this.projectId}"]`)
      ?.closest("div");
    if (modal?.parentElement) {
      modal.parentElement.removeChild(modal);
    }
  }

  private startPolling(): void {
    this.fetchLogs();
    this.pollInterval = setInterval(() => {
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
    rpcClient
      .getFrpInfo(String(this.projectId))
      .then((response: any) => {
        this.status = response.status || "unavailable";
        this.lastError = response.last_error || "";
        this.logs = response.logs || [];
        this.updateDisplay();
      })
      .catch((err: any) => {
        console.error("Failed to fetch FRP logs:", err);
        this.status = "error";
        this.lastError = "Failed to fetch logs";
      });
  }

  private updateDisplay(): void {
    const container = document.getElementById(
      `logs-container-${this.projectId}`,
    );
    if (container) {
      container.innerHTML = "";
      if (this.logs.length === 0) {
        container.innerHTML =
          '<div style="color: #6c757d; text-align: center; padding: 2em;">No logs available</div>';
      } else {
        this.logs.forEach((log) => {
          const logEl = document.createElement("div");
          logEl.style.cssText =
            "color: #333; word-break: break-word; margin-bottom: 0.2em;";
          logEl.textContent = log;
          container.appendChild(logEl);
        });
      }
      container.scrollTop = container.scrollHeight;
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
      rpcClient
        .clearFrpLogs(String(this.projectId))
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
