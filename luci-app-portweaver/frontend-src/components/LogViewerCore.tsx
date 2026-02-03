import { getThemeColors } from "../utils/theme-utils";

export interface LogInfo {
  status: string;
  last_error: string;
  logs: string[];
}

export interface LogViewerCoreProps {
  name: string;
  title: string;
  fetcher: (name: string) => Promise<LogInfo>;
  clearer: (name: string) => Promise<void>;
  showHeader?: boolean;
}

const REGEX_IP = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
const REGEX_PORT = /:\d{2,5}\b/g;
const REGEX_ERROR = /\b(error|fail|failed|exception)\b/gi;
const REGEX_SUCCESS = /\b(success|ok|done|complete)\b/gi;
const REGEX_UUID =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

export class LogViewerCore {
  private props: LogViewerCoreProps;
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
  private pollInterval: number | null = null;
  private searchFilter: string = "";
  private filteredLogs: string[] = [];
  private isPaused: boolean = false;
  private isFollowing: boolean = true;
  private selectedLines: Set<number> = new Set();
  private wrapText: boolean = true;

  constructor(props: LogViewerCoreProps) {
    this.props = {
      ...props,
      showHeader: props.showHeader ?? true,
    };
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

  private exportAll(): void {
    const text = this.logs.join("\n");

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
      this.logContainer.style.overflowX = this.wrapText ? "auto" : "scroll";
    }
    if (this.wrapButton) {
      this.wrapButton.textContent = this.wrapText ? "WRAP: ON" : "WRAP: OFF";
    }
  }

  private searchBar: HTMLElement | null = null;
  private footer: HTMLElement | null = null;
  private header: HTMLElement | null = null;

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
        style="flex: 1; overflow-x: auto; overflow-y: auto; padding: 1em; font-family: monospace, monospace; font-size: 0.9em; line-height: 1.4; white-space: pre-wrap; min-height: 200px;"
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
            this.copyToClipboard();
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
        onclick={() => this.exportAll()}
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

    this.searchBar = (
      <div style="padding: 0.5em 1em; display: flex; gap: 0.5em; align-items: center; flex-wrap: wrap; min-height: 2.5em;">
        {this.searchInput}
        {refreshButton}
        {this.pauseButton}
        {this.followButton}
        {this.wrapButton}
      </div>
    );

    this.footer = (
      <div
        class="button-row"
        style="padding: 1em; display: flex; gap: 0.5em; justify-content: flex-end; flex-wrap: wrap; min-height: 2.5em;"
      >
        {copyButton}
        {copySelectedButton}
        {exportButton}
        {clearButton}
      </div>
    );

    this.header = (
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
      </div>
    );

    const content = (
      <div
        class="log-viewer-core"
        style="width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden;"
      >
        {this.props.showHeader ? this.header : null}
        {this.searchBar}
        {this.logContainer}
        {this.footer}
      </div>
    );

    return content;
  }

  getSearchBar(): HTMLElement | null {
    return this.searchBar;
  }

  getLogContainer(): HTMLElement | null {
    return this.logContainer;
  }

  getFooter(): HTMLElement | null {
    return this.footer;
  }

  init(): void {
    this.applyScrollbarStyles();
    this.updateDisplay();
    this.startPolling();
  }

  destroy(): void {
    this.stopPolling();
    this.logContainer = null;
    this.statusSpan = null;
    this.errorSpan = null;
    this.searchInput = null;
    this.pauseButton = null;
    this.followButton = null;
    this.wrapButton = null;
    this.searchBar = null;
    this.footer = null;
    this.header = null;
  }

  private startPolling(): void {
    this.fetchLogs();
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    this.pollInterval = window.setInterval(() => {
      if (!this.isPaused) {
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

  private applyScrollbarStyles(): void {
    const themeColors = getThemeColors();
    if (!this.logContainer) return;

    const styleId = "logviewer-scrollbar-styles";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    const scrollbarTrack = themeColors.isDark
      ? "rgba(255, 255, 255, 0.08)"
      : "rgba(0, 0, 0, 0.08)";
    const scrollbarThumb = themeColors.isDark
      ? "rgba(255, 255, 255, 0.35)"
      : "rgba(0, 0, 0, 0.4)";
    const scrollbarThumbHover = themeColors.isDark
      ? "rgba(255, 255, 255, 0.5)"
      : "rgba(0, 0, 0, 0.6)";
    const scrollbarThumbActive = themeColors.isDark
      ? "rgba(255, 255, 255, 0.7)"
      : "rgba(0, 0, 0, 0.8)";

    styleEl.textContent = `
      .cbi-value-field::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }
      .cbi-value-field::-webkit-scrollbar-track {
        background: ${scrollbarTrack};
        border-radius: 5px;
      }
      .cbi-value-field::-webkit-scrollbar-thumb {
        background: ${scrollbarThumb};
        border-radius: 5px;
        border: 2px solid ${scrollbarTrack};
      }
      .cbi-value-field::-webkit-scrollbar-thumb:hover {
        background: ${scrollbarThumbHover};
      }
      .cbi-value-field::-webkit-scrollbar-thumb:active {
        background: ${scrollbarThumbActive};
      }
      .cbi-value-field::-webkit-scrollbar-corner {
        background: ${scrollbarTrack};
      }
      .cbi-value-field {
        scrollbar-width: auto;
        scrollbar-color: ${scrollbarThumb} ${scrollbarTrack};
      }
    `;
  }

  private updateDisplay(): void {
    const themeColors = getThemeColors();

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

          const lineNum = (
            <span
              style={`color: ${themeColors.lineNumberColor}; margin-right: 1em; min-width: 2.5em; display: inline-block; text-align: right; flex-shrink: 0;`}
            >
              {index + 1}
            </span>
          );

          const content = <span>{this.highlightLog(log)}</span>;

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
    let text = "";
    if (this.selectedLines.size > 0) {
      // Copy selected lines from filteredLogs (what user sees)
      const indices = Array.from(this.selectedLines).sort((a, b) => a - b);
      text = indices.map((i) => this.filteredLogs[i]).join("\n");
    } else {
      // Copy all original logs (not filtered)
      text = this.logs.join("\n");
    }

    let useModernClipboard = false;
    try {
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        navigator.clipboard.writeText("");
        useModernClipboard = true;
      }
    } catch (_e) {
      useModernClipboard = false;
    }

    if (useModernClipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          alert("Logs copied to clipboard");
        })
        .catch((err: any) => {
          console.error("Failed to copy logs:", err);
          alert("Failed to copy logs");
        });
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        const success = document.execCommand("copy");
        if (success) {
          alert("Logs copied to clipboard");
        } else {
          throw new Error("execCommand failed");
        }
      } catch (err) {
        console.error("Failed to copy logs:", err);
        alert("Failed to copy logs - please select and copy manually");
      } finally {
        document.body.removeChild(textarea);
      }
    }
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
