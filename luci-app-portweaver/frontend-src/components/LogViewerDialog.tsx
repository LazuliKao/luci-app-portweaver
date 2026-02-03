import { LogViewerCore } from "./LogViewerCore";
import type { LogViewerCoreProps } from "./LogViewerCore";

export interface LogViewerDialogProps extends LogViewerCoreProps {}

export class LogViewerDialog {
  private props: LogViewerDialogProps;
  private core: LogViewerCore | null = null;
  private modal: HTMLElement | null = null;
  private isOpen: boolean = false;

  constructor(props: LogViewerDialogProps) {
    this.props = props;
  }

  render(): HTMLElement {
    this.core = new LogViewerCore({
      ...this.props,
      showHeader: false,
    });
    this.core.render();

    const statusColor =
      {
        running: "#4CAF50",
        connected: "#4CAF50",
        connecting: "#FFC107",
        error: "#F44336",
        stopped: "#9E9E9E",
        unavailable: "#9E9E9E",
      }.unavailable || "#9E9E9E";

    const statusSpan = (
      <span
        style={`display: inline-block; padding: 0.25em 0.6em; border-radius: 3px; background: ${statusColor}; color: white; font-weight: 600; font-size: 0.85em;`}
      >
        unavailable
      </span>
    );

    const errorSpan = (
      <div style="color: #F44336; margin-top: 0.3em; display:none"></div>
    );

    const header = (
      <div style="padding: 1em; border-bottom: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h4 style="margin: 0; font-size: 1.2em; font-weight: 600;">
            {this.props.title}
          </h4>
          <div style="font-size: 0.85em; color: #6c757d; margin-top: 0.3em;">
            Status: {statusSpan}
            {errorSpan}
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

    const searchBar = this.core.getSearchBar();
    const logContainer = this.core.getLogContainer();
    const footer = this.core.getFooter();

    const closeFooterButton = (
      <button type="button" class="cbi-button" onclick={() => this.close()}>
        CLOSE
      </button>
    );

    const dialogFooter = (
      <div
        class="button-row"
        style="padding: 1em; display: flex; gap: 0.5em; justify-content: flex-end; flex-wrap: wrap; min-height: 2.5em;"
      >
        <span>{footer ? Array.from(footer.children) : null}</span>
        <span>{closeFooterButton}</span>
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
        {logContainer}
        {dialogFooter}
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
    if (this.core) {
      this.core.init();
    }
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    if (this.core) {
      this.core.destroy();
    }
    this.modal?.parentElement?.removeChild(this.modal);
    this.modal = null;
    this.core = null;
  }
}
