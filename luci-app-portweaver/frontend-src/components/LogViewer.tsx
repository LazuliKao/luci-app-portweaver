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

const REGEX_IP = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
const REGEX_PORT = /:\d{2,5}\b/g;
const REGEX_ERROR = /\b(error|fail|failed|exception)\b/gi;
const REGEX_SUCCESS = /\b(success|ok|done|complete)\b/gi;
const REGEX_UUID =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

export class LogViewer {
  private props: LogViewerProps;
  private modal: HTMLElement | null = null;
  private logContainer: HTMLElement | null = null;
  private statusSpan: HTMLElement | null = null;
  private errorSpan: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private pauseButton: HTMLElement | null = null;
  private followButton: HTMLElement | null = null;
  private wrapButton: HTMLElement | null = null;

  private status: string = "unavailable";
  private logs: string[] = [];
  private lastError: string = "";
  private isOpen: boolean = false;
  private pollInterval: number | null = null;
  private searchFilter: string = "";
  private filteredLogs: string[] = [];
  private isPaused: boolean = false;
  private isFollowing: boolean = true;
  private selectedLines: Set<number> = new Set();
  private wrapText: boolean = true;

  constructor(props: LogViewerProps) {
    this.props = props;
  }

  private highlightLog(text: string): string {
    let result = text;
    const matches: Array<{ start: number; end: number; html: string }> = [];

    const addMatch = (regex: RegExp, replacement: string) => {
      let match: RegExpExecArray | null;
      while (true) {
        match = regex.exec(text);
        if (match === null) break;
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          html: replacement.replace("$&", match[0]),
        });
      }
    };

    addMatch(REGEX_IP, '<strong class="text-primary">$&</strong>');
    addMatch(REGEX_PORT, '<strong class="text-success">$&</strong>');
    addMatch(REGEX_ERROR, '<strong class="text-danger">$&</strong>');
    addMatch(REGEX_SUCCESS, '<strong class="text-success">$&</strong>');
    addMatch(REGEX_UUID, "<code>$&</code>");

    matches.sort((a, b) => a.start - b.start);

    let offset = 0;
    for (const match of matches) {
      const before = result.slice(0, match.start + offset);
      const after = result.slice(match.end + offset);
      result = before + match.html + after;
      offset += match.html.length - (match.end - match.start);
    }

    return result;
  }

  private applyFilters(): void {
    let filtered = this.logs;

    if (this.searchFilter.trim()) {
      const query = this.searchFilter.toLowerCase();
      filtered = filtered.filter((log) => log.toLowerCase().includes(query));
    }

    this.filteredLogs = filtered;
  }

  private toggleLineSelection(index: number): void {
    if (this.selectedLines.has(index)) {
      this.selectedLines.delete(index);
    } else {
      this.selectedLines.add(index);
    }
  }

  private selectRange(endIndex: number): void {
    if (this.selectedLines.size === 0) {
      this.selectedLines.add(endIndex);
      return;
    }

    const indices = Array.from(this.selectedLines);
    const startIndex = Math.max(...indices);
    const min = Math.min(startIndex, endIndex);
    const max = Math.max(startIndex, endIndex);

    for (let i = min; i <= max; i++) {
      this.selectedLines.add(i);
    }
  }

  private exportSelected(): void {
    let text: string;
    if (this.selectedLines.size > 0) {
      const indices = Array.from(this.selectedLines).sort((a, b) => a - b);
      text = indices.map((i) => this.filteredLogs[i]).join("\n");
    } else {
      text = this.filteredLogs.join("\n");
    }

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${this.props.name}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private toggleWrap(): void {
    this.wrapText = !this.wrapText;
    if (this.logContainer) {
      this.logContainer.style.whiteSpace = this.wrapText ? "pre-wrap" : "pre";
    }
    if (this.wrapButton) {
      this.wrapButton.textContent = this.wrapText ? "WRAP: ON" : "WRAP: OFF";
    }
  }

  render(): HTMLElement {
    const statusColor =
      {
        running: "#4CAF50",
        connected: "#4CAF50",
        connecting: "#FFC107",
        error: "#F44336",
        stopped: "#9E9E9E",
        unavailable: "#9E9E9E",
      }[this.status] || "#9E9E9E";

    this.statusSpan = (
      <span
        style={`display: inline-block; padding: 0.25em 0.6em; border-radius: 3px; background: ${statusColor}; color: white; font-weight: 600; font-size: 0.85em;`}
      >
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

    this.searchInput = (
      <input
        type="text"
        class="cbi-input-text"
        placeholder="Search logs..."
        style="flex: 1; min-width: 150px; max-width: 400px;"
        oninput={(e: Event) => {
          const target = e.target as HTMLInputElement;
          this.searchFilter = target.value;
          this.applyFilters();
          this.updateDisplay();
        }}
      />
    ) as HTMLInputElement;

    const refreshButton = (
      <button
        type="button"
        class="cbi-button cbi-button-neutral"
        onclick={() => this.fetchLogs()}
      >
        REFRESH
      </button>
    );

    this.pauseButton = (
      <button
        type="button"
        class="cbi-button cbi-button-neutral"
        onclick={() => {
          this.isPaused = !this.isPaused;
          if (this.pauseButton) {
            this.pauseButton.textContent = this.isPaused ? "PAUSED" : "PAUSE";
          }
          if (this.isPaused) {
            this.stopPolling();
          } else {
            this.startPolling();
          }
        }}
      >
        PAUSE
      </button>
    );

    this.followButton = (
      <button
        type="button"
        class="cbi-button cbi-button-neutral"
        onclick={() => {
          this.isFollowing = !this.isFollowing;
          if (this.followButton) {
            this.followButton.textContent = this.isFollowing
              ? "FOLLOW: ON"
              : "FOLLOW: OFF";
          }
        }}
      >
        FOLLOW: ON
      </button>
    );

    this.wrapButton = (
      <button
        type="button"
        class="cbi-button cbi-button-neutral"
        onclick={() => this.toggleWrap()}
      >
        WRAP: ON
      </button>
    );

    this.logContainer = (
      <div
        class="cbi-value-field"
        style="flex: 1; overflow-x: auto; overflow-y: auto; padding: 1em; font-family: monospace, monospace; font-size: 0.9em; line-height: 1.4; white-space: pre-wrap; min-height: 200px; max-height: 40vh;"
      >
        {this.logs.length === 0 ? "No logs available" : null}
      </div>
    );

    const copyButton = (
      <button
        type="button"
        class="cbi-button"
        onclick={() => this.copyToClipboard()}
      >
        COPY
      </button>
    );

    const copySelectedButton = (
      <button
        type="button"
        class="cbi-button cbi-button-positive"
        onclick={() => {
          if (this.selectedLines.size > 0) {
            const indices = Array.from(this.selectedLines).sort(
              (a, b) => a - b,
            );
            const text = indices.map((i) => this.filteredLogs[i]).join("\n");
            navigator.clipboard
              .writeText(text)
              .then(() => alert("Selected logs copied to clipboard"))
              .catch((err: any) => {
                console.error("Failed to copy logs:", err);
                alert("Failed to copy logs");
              });
          } else {
            alert("No lines selected");
          }
        }}
      >
        COPY SELECTED
      </button>
    );

    const exportButton = (
      <button
        type="button"
        class="cbi-button cbi-button-positive"
        onclick={() => this.exportSelected()}
      >
        EXPORT
      </button>
    );

    const clearButton = (
      <button
        type="button"
        class="cbi-button"
        onclick={() => this.clearLogs()}
        style="background: #dc3545; color: white;"
      >
        CLEAR
      </button>
    );

    const closeButton = (
      <button type="button" class="cbi-button" onclick={() => this.close()}>
        CLOSE
      </button>
    );

    const footer = (
      <div
        class="button-row"
        style="padding: 1em; display: flex; gap: 0.5em; justify-content: flex-end; flex-wrap: wrap; min-height: 2.5em;"
      >
        {copyButton}
        {copySelectedButton}
        {exportButton}
        {clearButton}
        {closeButton}
      </div>
    );

    const header = (
      <div style="padding: 1em; border-bottom: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h4 style="margin: 0; font-size: 1.2em; font-weight: 600;">
            {this.props.title}
          </h4>
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
    );

    const searchBar = (
      <div style="padding: 0.5em 1em; display: flex; gap: 0.5em; align-items: center; flex-wrap: wrap; min-height: 2.5em;">
        {this.searchInput}
        {refreshButton}
        {this.pauseButton}
        {this.followButton}
        {this.wrapButton}
      </div>
    );

    const content = (
      <div
        class="modal cbi-modal cbi-section-node"
        role="dialog"
        aria-modal="true"
        style="width: 95vw; max-width: 1200px; max-height: 85vh; min-width: 600px;"
      >
        {header}
        {searchBar}
        {this.logContainer}
        {footer}
      </div>
    );

    this.modal = (
      <div
        style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;"
        onclick={(e: MouseEvent) => {
          if (e.target === e.currentTarget) this.close();
        }}
      >
        {content}
      </div>
    );

    return this.modal;
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
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
    this.modal = null;
    this.logContainer = null;
    this.statusSpan = null;
    this.errorSpan = null;
    this.searchInput = null;
    this.pauseButton = null;
    this.followButton = null;
    this.wrapButton = null;
  }

  private startPolling(): void {
    this.fetchLogs();
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    this.pollInterval = window.setInterval(() => {
      if (this.isOpen && !this.isPaused) {
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
        this.applyFilters();
        this.updateDisplay();
      })
      .catch((err: any) => {
        console.error("Failed to fetch logs:", err);
        this.status = "error";
        this.lastError = "Failed to fetch logs";
        this.updateDisplay();
      });
  }

  private getThemeColors(): { isDark: boolean; selectionBg: string; lineNumberColor: string } {
    try {
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      const match = bodyBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const r = parseInt(match[1], 10);
        const g = parseInt(match[2], 10);
        const b = parseInt(match[3], 10);
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        const isDark = luminance < 128;
        
        return {
          isDark,
          selectionBg: isDark ? "rgba(66, 165, 245, 0.2)" : "#e3f2fd",
          lineNumberColor: isDark ? "#aaa" : "#999"
        };
      }
    } catch (e) {
      console.warn("Failed to detect theme, using light mode defaults");
    }
    
    return {
      isDark: false,
      selectionBg: "#e3f2fd",
      lineNumberColor: "#999"
    };
  }

  private updateDisplay(): void {
    const themeColors = this.getThemeColors();
    
    if (this.statusSpan) {
      this.statusSpan.textContent = this.status;
      const backgroundColor =
        {
          running: "#4CAF50",
          connected: "#4CAF50",
          connecting: "#FFC107",
          error: "#F44336",
          stopped: "#9E9E9E",
          unavailable: "#9E9E9E",
        }[this.status] || "#9E9E9E";
      this.statusSpan.setAttribute(
        "style",
        `display: inline-block; padding: 0.25em 0.6em; border-radius: 3px; background: ${backgroundColor}; color: white; font-weight: 600; font-size: 0.85em;`,
      );
    }

    if (this.errorSpan) {
      if (this.lastError) {
        this.errorSpan.style.display = "";
        this.errorSpan.textContent = this.lastError;
      } else {
        this.errorSpan.style.display = "none";
      }
    }

    if (this.logContainer) {
      const wasAtBottom =
        this.logContainer.scrollHeight - this.logContainer.scrollTop <=
        this.logContainer.clientHeight + 50;

      while (this.logContainer.firstChild) {
        this.logContainer.removeChild(this.logContainer.firstChild);
      }

      if (this.filteredLogs.length === 0) {
        const noLogs = document.createElement("div");
        noLogs.style.cssText = `color: ${themeColors.lineNumberColor}; text-align: center; padding: 2em; font-family: monospace;`;
        noLogs.textContent = this.searchFilter
          ? "No logs match your search"
          : "No logs available";
        this.logContainer.appendChild(noLogs);
      } else {
        this.filteredLogs.forEach((log, index) => {
          const isSelected = this.selectedLines.has(index);

          const lineDiv = document.createElement("div");
          lineDiv.style.cssText = `cursor: pointer; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; padding: 0.25em 0.5em; ${isSelected ? `background: ${themeColors.selectionBg};` : ""} font-family: monospace, monospace; font-size: 0.9em; line-height: 1.4; display: flex; align-items: flex-start;`;
          lineDiv.onclick = (e: MouseEvent) => {
            e.preventDefault();
            if (e.ctrlKey || e.metaKey) {
              this.toggleLineSelection(index);
            } else if (e.shiftKey && this.selectedLines.size > 0) {
              this.selectRange(index);
            } else {
              this.selectedLines.clear();
              this.toggleLineSelection(index);
            }
            this.updateDisplay();
          };

          const lineNum = document.createElement("span");
          lineNum.style.cssText =
            `color: ${themeColors.lineNumberColor}; margin-right: 1em; min-width: 2.5em; display: inline-block; text-align: right; flex-shrink: 0;`;
          lineNum.textContent = `${index + 1}`;

          const content = document.createElement("span");
          content.style.cssText =
            "flex: 1; overflow-x: auto; white-space: pre-wrap; min-width: 0;";
          content.innerHTML = this.highlightLog(log);

          lineDiv.appendChild(lineNum);
          lineDiv.appendChild(content);

          this.logContainer?.appendChild(lineDiv);
        });
      }

      if (this.isFollowing && wasAtBottom) {
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
      }
    }
  }

  private copyToClipboard(): void {
    const text = this.filteredLogs.join("\n");
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
          this.filteredLogs = [];
          this.selectedLines.clear();
          this.updateDisplay();
        })
        .catch((err: any) => {
          console.error("Failed to clear logs:", err);
          alert("Failed to clear logs");
        });
    }
  }
}
