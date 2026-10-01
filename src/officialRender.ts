import * as vscode from "vscode";

/**
 * Renders an AsyncAPI document using the OFFICIAL AsyncAPI React component
 * (`@asyncapi/react-component`) via its standalone browser bundle. This is the
 * same renderer used by AsyncAPI Studio, so the output matches the official
 * documentation look & feel (channels, operations, messages, payload schemas,
 * examples and bindings).
 *
 * The standalone bundle and stylesheet are shipped inside the extension (under
 * `media/`) and loaded as local webview resources — nothing is fetched from a
 * CDN, so it works offline and respects the webview Content-Security-Policy.
 */
export class OfficialRenderPanel {
  private static current: OfficialRenderPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private sourceUri: vscode.Uri;
  private disposables: vscode.Disposable[] = [];

  static show(
    document: vscode.TextDocument,
    extensionUri: vscode.Uri
  ): void {
    const column = vscode.ViewColumn.Beside;
    if (OfficialRenderPanel.current) {
      OfficialRenderPanel.current.sourceUri = document.uri;
      OfficialRenderPanel.current.panel.reveal(column);
      OfficialRenderPanel.current.update(document);
      return;
    }
    const mediaUri = vscode.Uri.joinPath(extensionUri, "media");
    const panel = vscode.window.createWebviewPanel(
      "asyncapiOfficialRender",
      "AsyncAPI Render",
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [mediaUri],
      }
    );
    OfficialRenderPanel.current = new OfficialRenderPanel(
      panel,
      extensionUri,
      document.uri
    );
    OfficialRenderPanel.current.update(document);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    sourceUri: vscode.Uri
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.sourceUri = sourceUri;

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Re-render when the underlying document changes (debounced).
    let timer: NodeJS.Timeout | undefined;
    vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() !== this.sourceUri.toString()) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => this.update(e.document), 500);
      },
      null,
      this.disposables
    );
  }

  private update(document: vscode.TextDocument): void {
    const title = this.titleFor(document);
    this.panel.title = `AsyncAPI: ${title}`;
    this.panel.webview.html = this.render(document.getText());
  }

  private titleFor(document: vscode.TextDocument): string {
    const match = /^\s*title\s*:\s*(.+)$/m.exec(
      document.getText().slice(0, 4000)
    );
    return match ? match[1].trim().replace(/^['"]|['"]$/g, "") : "Render";
  }

  private render(schemaText: string): string {
    const webview = this.panel.webview;
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "asyncapi-standalone.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        "media",
        "asyncapi-default.min.css"
      )
    );
    const nonce = makeNonce();
    const cspSource = webview.cspSource;

    // The document is passed to the renderer as a JSON string literal so any
    // characters in the YAML are safely escaped inside the inline script.
    const schemaLiteral = JSON.stringify(schemaText);

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'none';
           img-src ${cspSource} https: data:;
           style-src ${cspSource} 'unsafe-inline';
           font-src ${cspSource} https: data:;
           script-src 'nonce-${nonce}' 'unsafe-eval' ${cspSource};">
<link rel="stylesheet" href="${styleUri}">
<style nonce="${nonce}">
  body { margin: 0; padding: 0; background: #fff; }
  #asyncapi { padding: 0 1rem; }
  .asyncapi-error { font-family: var(--vscode-font-family, sans-serif); color: #b00020; padding: 1rem; }
</style>
</head>
<body>
<div id="asyncapi"><p style="padding:1rem;font-family:sans-serif;">Rendering AsyncAPI document…</p></div>
<script nonce="${nonce}">
  // Surface any uncaught error from the bundle (e.g. a CSP violation) instead
  // of the generic "failed to load" message.
  window.__asyncapiLoadError = null;
  window.addEventListener("error", function (e) {
    window.__asyncapiLoadError =
      (e && e.message) ? e.message : "Unknown script error";
  });
</script>
<script
  nonce="${nonce}"
  src="${scriptUri}"
  onerror="window.__asyncapiLoadError='Could not fetch the renderer script (CSP or path).'"
></script>
<script nonce="${nonce}">
  (function () {
    var schema = ${schemaLiteral};
    var target = document.getElementById("asyncapi");
    function fail(msg) {
      target.innerHTML =
        '<div class="asyncapi-error"><strong>Could not render.</strong><br>' +
        String(msg) +
        "</div>";
    }
    try {
      var api =
        (typeof AsyncApiStandalone !== "undefined" && AsyncApiStandalone) ||
        window.AsyncApiStandalone;
      if (!api || typeof api.render !== "function") {
        fail(
          window.__asyncapiLoadError ||
            "AsyncApiStandalone global not available after loading the bundle."
        );
        return;
      }
      api.render(
        {
          schema: schema,
          config: { show: { sidebar: true, errors: true } },
        },
        target
      );
    } catch (err) {
      fail(err && err.message ? err.message : err);
    }
  })();
</script>
</body>
</html>`;
  }

  private dispose(): void {
    OfficialRenderPanel.current = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }
}

function makeNonce(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}
