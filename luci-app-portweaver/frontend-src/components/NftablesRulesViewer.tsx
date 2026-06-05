/**
 * NftablesRulesViewer - Displays nftables rules for the portweaver table
 *
 * Shows the current nftables rules managed by PortWeaver in a syntax-highlighted view.
 */

export class NftablesRulesViewer {
  private rulesContainer: HTMLElement | null = null;
  private statusSpan: HTMLElement | null = null;
  private refreshBtn: HTMLElement | null = null;
  private rules: string = "";
  private loading: boolean = false;

  render(): HTMLElement {
    this.statusSpan = <span style="color: #666;">Loading...</span>;
    this.rulesContainer = (
      <pre
        style="
          background: #1e1e1e;
          color: #d4d4d4;
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
          white-space: pre !important;
          word-break: normal !important;
          word-wrap: normal !important;
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          font-size: 13px;
          line-height: 1.5;
          max-height: 600px;
          overflow-y: auto;
          margin: 0;
        "
      >
        Loading nftables rules...
      </pre>
    ) as HTMLElement;

    this.refreshBtn = (
      <button
        type="button"
        class="btn cbi-button-action"
        style="margin-bottom: 12px;"
        onclick={() => this.loadRules()}
      >
        Refresh
      </button>
    ) as HTMLElement;

    const container = (
      <div>
        <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 12px;">
          {this.refreshBtn}
          {this.statusSpan}
        </div>
        <div style="margin-bottom: 8px; color: #666; font-size: 12px;">
          Table: <code>inet portweaver</code>
        </div>
        {this.rulesContainer}
      </div>
    ) as HTMLElement;

    // Load rules on render
    this.loadRules();

    return container;
  }

  private async loadRules(): Promise<void> {
    if (this.loading) return;

    this.loading = true;
    if (this.statusSpan) {
      this.statusSpan.textContent = "Loading...";
      this.statusSpan.style.color = "#666";
    }
    if (this.refreshBtn) {
      this.refreshBtn.setAttribute("disabled", "true");
    }

    try {
      const rpc = (window as any).L?.rpc;
      if (!rpc) {
        throw new Error("RPC not available");
      }

      const result = await rpc
        .declare({
          object: "portweaver",
          method: "get_nftables_rules",
        })
        .call();

      if (result?.rules) {
        this.rules = result.rules;
        this.updateDisplay();
        if (this.statusSpan) {
          this.statusSpan.textContent = "Rules loaded";
          this.statusSpan.style.color = "#4caf50";
        }
      } else {
        if (this.statusSpan) {
          this.statusSpan.textContent =
            "No rules found or nftables not available";
          this.statusSpan.style.color = "#ff9800";
        }
        if (this.rulesContainer) {
          this.rulesContainer.textContent =
            "No nftables rules found. Make sure nftables is enabled and the portweaver table exists.";
        }
      }
    } catch (err) {
      console.error("Failed to load nftables rules:", err);
      if (this.statusSpan) {
        this.statusSpan.textContent = `Error: ${(err as Error)?.message || String(err)}`;
        this.statusSpan.style.color = "#f44336";
      }
      if (this.rulesContainer) {
        this.rulesContainer.textContent = `Failed to load nftables rules: ${(err as Error)?.message || String(err)}`;
      }
    } finally {
      this.loading = false;
      if (this.refreshBtn) {
        this.refreshBtn.removeAttribute("disabled");
      }
    }
  }

  private updateDisplay(): void {
    if (!this.rulesContainer) return;

    if (!this.rules || this.rules.trim().length === 0) {
      this.rulesContainer.textContent = "No rules in portweaver table.";
      return;
    }

    // Syntax highlighting
    const highlighted = this.highlightSyntax(this.rules);
    this.rulesContainer.innerHTML = highlighted;
  }

  private highlightSyntax(rules: string): string {
    const escapeHtml = (text: string) =>
      text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const tokenRegex = new RegExp(
      "(" +
        "#[^\\n]*" + // Group 1: Comment
        ")|(" +
        '"[^"\\n]*"' + // Group 2: String in quotes
        ")|(" +
        "PORTWEAVER_\\w+" + // Group 3: Portweaver comment
        ")|(" +
        "\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}(?:\\/\\d{1,2})?\\b" + // Group 4: IPv4
        ")|(" +
        "\\b(?:[a-fA-F0-9]{1,4}:){1,7}(?:[a-fA-F0-9]{1,4}|:)(?:\\/\\d{1,3})?\\b" + // Group 5: IPv6
        ")|(" +
        "\\b\\d+\\b" + // Group 6: Numbers/Ports
        ")|(" +
        "[a-zA-Z_][a-zA-Z0-9_-]*" + // Group 7: Words
        ")|(" +
        "[^\\s\\w]" + // Group 8: Single non-word, non-space character (symbols/punctuation)
        ")|(" +
        "\\s+" + // Group 9: Whitespace
        ")",
      "g",
    );

    return rules.replace(
      tokenRegex,
      (match, g1, g2, g3, g4, g5, g6, g7, g8, g9) => {
        if (g1) return `<span style="color: #6a9955;">${escapeHtml(g1)}</span>`;
        if (g2) return `<span style="color: #ce9178;">${escapeHtml(g2)}</span>`;
        if (g3)
          return (
            '<span style="color: #dcdcaa; font-weight: bold;">' +
            escapeHtml(g3) +
            "</span>"
          );
        if (g4) return `<span style="color: #ce9178;">${escapeHtml(g4)}</span>`;
        if (g5) return `<span style="color: #ce9178;">${escapeHtml(g5)}</span>`;
        if (g6) return `<span style="color: #b5cea8;">${escapeHtml(g6)}</span>`;
        if (g7) {
          const word = g7;
          const keywords = new Set([
            "table",
            "chain",
            "rule",
            "set",
            "map",
            "element",
            "flush",
            "add",
            "delete",
            "list",
            "type",
            "hook",
            "priority",
            "policy",
            "accept",
            "drop",
            "reject",
            "queue",
            "jump",
            "goto",
            "return",
            "comment",
            "counter",
            "name",
          ]);
          const types = new Set([
            "filter",
            "nat",
            "route",
            "inet",
            "ip",
            "ip6",
            "arp",
            "bridge",
            "ingress",
            "prerouting",
            "input",
            "forward",
            "output",
            "postrouting",
            "srcnat",
            "dstnat",
            "dnat",
          ]);
          const protocols = new Set([
            "tcp",
            "udp",
            "icmp",
            "icmpv6",
            "esp",
            "ah",
            "sctp",
          ]);

          if (keywords.has(word)) {
            return `<span style="color: #569cd6;">${escapeHtml(word)}</span>`;
          } else if (types.has(word)) {
            return `<span style="color: #4ec9b0;">${escapeHtml(word)}</span>`;
          } else if (protocols.has(word)) {
            return `<span style="color: #c586c0;">${escapeHtml(word)}</span>`;
          } else {
            return escapeHtml(word);
          }
        }
        if (g8) return escapeHtml(g8);
        if (g9) return escapeHtml(g9);
        return escapeHtml(match);
      },
    );
  }
}
