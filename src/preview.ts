import * as vscode from "vscode";
import { isMap, isScalar } from "yaml";
import { AsyncApiDocument } from "./asyncapiDocument";

/**
 * Renders a read-only HTML preview of an AsyncAPI contract: the info header,
 * channels and their messages, and operations grouped by action.
 *
 * The webview is kept dependency-free (no bundled renderer) so the .vsix stays
 * small and there are no remote resources to load.
 */
export class PreviewPanel {
  private static current: PreviewPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private sourceUri: vscode.Uri;
  private disposables: vscode.Disposable[] = [];

  static show(document: vscode.TextDocument): void {
    const column = vscode.ViewColumn.Beside;
    if (PreviewPanel.current) {
      PreviewPanel.current.sourceUri = document.uri;
      PreviewPanel.current.panel.reveal(column);
      PreviewPanel.current.update(document);
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      "asyncapiPreview",
      "AsyncAPI Preview",
      column,
      { enableScripts: false, retainContextWhenHidden: true }
    );
    PreviewPanel.current = new PreviewPanel(panel, document.uri);
    PreviewPanel.current.update(document);
  }

  private constructor(panel: vscode.WebviewPanel, sourceUri: vscode.Uri) {
    this.panel = panel;
    this.sourceUri = sourceUri;

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Re-render when the underlying document changes.
    vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() === this.sourceUri.toString()) {
          this.update(e.document);
        }
      },
      null,
      this.disposables
    );
  }

  private update(document: vscode.TextDocument): void {
    const parsed = AsyncApiDocument.parse(document.getText());
    this.panel.title = `AsyncAPI: ${parsed.getStringAt(["info", "title"]) ?? "Preview"}`;
    this.panel.webview.html = this.render(parsed);
  }

  private render(parsed: AsyncApiDocument): string {
    const title = esc(parsed.getStringAt(["info", "title"]) ?? "Untitled");
    const version = esc(parsed.getStringAt(["info", "version"]) ?? "");
    const apiVersion = esc(parsed.version() ?? "?");
    const description = esc(parsed.getStringAt(["info", "description"]) ?? "");

    const channels = parsed.channelEntries().map((pair) => {
      const name = keyOf(pair);
      const body = pair.value;
      const address = isMap(body) ? String(body.get("address") ?? name) : name;
      const msgs: string[] = [];
      if (isMap(body)) {
        const messages = body.get("messages", true);
        if (isMap(messages)) {
          for (const m of messages.items) {
            msgs.push(keyOf(m as any));
          }
        }
      }
      return `<li><span class="addr">${esc(address)}</span>${
        msgs.length ? ` <span class="muted">(${msgs.length} message${msgs.length > 1 ? "s" : ""})</span>` : ""
      }</li>`;
    });

    const sends: string[] = [];
    const receives: string[] = [];
    for (const pair of parsed.operationEntries()) {
      const name = keyOf(pair);
      const body = pair.value;
      const action = isMap(body) ? String(body.get("action") ?? "") : "";
      const line = `<li><code>${esc(name)}</code></li>`;
      if (action === "send") sends.push(line);
      else if (action === "receive") receives.push(line);
    }

    const messageCount = parsed.messageEntries().length;
    const schemaCount = parsed.schemaEntries().length;

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 1rem 1.5rem; line-height: 1.45; }
  h1 { font-size: 1.4rem; margin-bottom: .2rem; }
  h2 { font-size: 1.05rem; margin-top: 1.6rem; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: .2rem; }
  .badge { display: inline-block; font-size: .72rem; padding: .1rem .45rem; border-radius: 999px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); margin-right: .4rem; }
  .muted { color: var(--vscode-descriptionForeground); font-size: .85em; }
  ul { list-style: none; padding-left: 0; }
  li { padding: .18rem 0; border-bottom: 1px dotted var(--vscode-panel-border); }
  .addr { font-family: var(--vscode-editor-font-family); }
  code { font-family: var(--vscode-editor-font-family); }
  .cols { display: flex; gap: 2rem; flex-wrap: wrap; }
  .col { flex: 1 1 240px; }
  .desc { white-space: pre-wrap; color: var(--vscode-descriptionForeground); margin-top: .4rem; }
  .counts { margin-top: .3rem; }
</style>
</head>
<body>
  <h1>${title}</h1>
  <div class="counts">
    <span class="badge">AsyncAPI ${apiVersion}</span>
    <span class="badge">v${version}</span>
    <span class="badge">${channels.length} channels</span>
    <span class="badge">${messageCount} messages</span>
    <span class="badge">${schemaCount} schemas</span>
  </div>
  ${description ? `<div class="desc">${description}</div>` : ""}

  <h2>Channels</h2>
  <ul>${channels.join("") || '<li class="muted">No channels defined.</li>'}</ul>

  <div class="cols">
    <div class="col">
      <h2>Operations · receive</h2>
      <ul>${receives.join("") || '<li class="muted">None.</li>'}</ul>
    </div>
    <div class="col">
      <h2>Operations · send</h2>
      <ul>${sends.join("") || '<li class="muted">None.</li>'}</ul>
    </div>
  </div>
</body>
</html>`;
  }

  private dispose(): void {
    PreviewPanel.current = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }
}

function keyOf(pair: { key: unknown }): string {
  const k = pair.key as any;
  return isScalar(k) ? String(k.value) : String(k);
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
