import * as vscode from "vscode";
import { looksLikeAsyncApi } from "./asyncapiDocument";
import { validate, RECOMMENDED_VERSION_RULE } from "./validator";
import { AsyncApiCompletionProvider } from "./completion";
import { PreviewPanel } from "./preview";
import { OfficialRenderPanel } from "./officialRender";
import {
  addChannel,
  addMessage,
  goToComponent,
  RefDefinitionProvider,
} from "./editing";

const CONTEXT_KEY = "asyncapiContracts.isAsyncApiDocument";
let diagnostics: vscode.DiagnosticCollection;
let typingTimer: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext): void {
  // Register commands FIRST and unconditionally. Nothing above this line may
  // throw, so the commands are always available even if later setup (providers,
  // the parser, diagnostics) fails. This prevents "command not found" popups.
  context.subscriptions.push(
    vscode.commands.registerCommand("asyncapiContracts.preview", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && isAsyncApiDoc(editor.document)) {
        PreviewPanel.show(editor.document);
      } else {
        vscode.window.showInformationMessage("Open an AsyncAPI contract first.");
      }
    }),
    vscode.commands.registerCommand("asyncapiContracts.render", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && isAsyncApiDoc(editor.document)) {
        OfficialRenderPanel.show(editor.document, context.extensionUri);
      } else {
        vscode.window.showInformationMessage("Open an AsyncAPI contract first.");
      }
    }),
    vscode.commands.registerCommand("asyncapiContracts.validate", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        void refreshDiagnostics(editor.document, true);
      }
    }),
    vscode.commands.registerCommand("asyncapiContracts.addChannel", () => {
      withAsyncApiEditor((e) => addChannel(e));
    }),
    vscode.commands.registerCommand("asyncapiContracts.addMessage", () => {
      withAsyncApiEditor((e) => addMessage(e));
    }),
    vscode.commands.registerCommand("asyncapiContracts.goToComponent", () => {
      withAsyncApiEditor((e) => goToComponent(e));
    })
  );

  // Everything below is best-effort. If any of it throws, the commands above
  // still work; we just log and continue.
  try {
    setupProvidersAndLifecycle(context);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[asyncapi-contracts] setup error:", message);
    vscode.window.showWarningMessage(
      `AsyncAPI Contracts: partial startup (${message}). Commands still work.`
    );
  }
}

function setupProvidersAndLifecycle(context: vscode.ExtensionContext): void {
  diagnostics = vscode.languages.createDiagnosticCollection("asyncapi");
  context.subscriptions.push(diagnostics);

  const selector: vscode.DocumentSelector = { language: "yaml", scheme: "file" };

  // Providers.
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      selector,
      new AsyncApiCompletionProvider(),
      ":",
      "/",
      "#"
    ),
    vscode.languages.registerDefinitionProvider(selector, new RefDefinitionProvider())
  );

  // Lifecycle: diagnostics + context key.
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      updateContextKey(editor?.document);
      if (editor) void refreshDiagnostics(editor.document);
    }),
    vscode.workspace.onDidOpenTextDocument((doc) => void refreshDiagnostics(doc)),
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (getConfig("validateOnSave", true)) void refreshDiagnostics(doc);
    }),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (!getConfig("validateOnType", true)) return;
      if (!isAsyncApiDoc(e.document)) return;
      if (typingTimer) clearTimeout(typingTimer);
      typingTimer = setTimeout(() => void refreshDiagnostics(e.document), 400);
    }),
    vscode.workspace.onDidCloseTextDocument((doc) => diagnostics?.delete(doc.uri)),
    // Re-validate open documents when the suppression settings change.
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration("asyncapiContracts")) return;
      for (const doc of vscode.workspace.textDocuments) {
        if (isAsyncApiDoc(doc)) void refreshDiagnostics(doc);
      }
    })
  );

  // Prime current editor.
  const active = vscode.window.activeTextEditor;
  updateContextKey(active?.document);
  if (active) void refreshDiagnostics(active.document);
}

export function deactivate(): void {
  if (typingTimer) clearTimeout(typingTimer);
  diagnostics?.dispose();
}

function isAsyncApiDoc(document: vscode.TextDocument): boolean {
  // Primary signal is the file content (an `asyncapi: <version>` header), not
  // the editor language mode: large .yaml files are sometimes opened as
  // plaintext, which would otherwise hide the extension. We still restrict to
  // text-like languages / YAML extensions to avoid scanning binaries.
  const lang = document.languageId;
  const path = document.uri.path.toLowerCase();
  const looksTextual =
    lang === "yaml" ||
    lang === "yml" ||
    lang === "plaintext" ||
    lang === "asyncapi" ||
    path.endsWith(".yaml") ||
    path.endsWith(".yml");
  if (!looksTextual) return false;
  return looksLikeAsyncApi(document.getText());
}

function updateContextKey(document: vscode.TextDocument | undefined): void {
  const value = document ? isAsyncApiDoc(document) : false;
  vscode.commands.executeCommand("setContext", CONTEXT_KEY, value);
}

async function refreshDiagnostics(
  document: vscode.TextDocument,
  announce = false
): Promise<void> {
  if (!isAsyncApiDoc(document)) {
    diagnostics?.delete(document.uri);
    return;
  }
  // Snapshot the version so a slow async validation does not clobber a newer
  // edit's results.
  const versionAtStart = document.version;
  const found = await validate(document, suppressedRules());
  if (document.version !== versionAtStart) {
    return;
  }
  diagnostics?.set(document.uri, found);
  if (announce) {
    const errors = found.filter(
      (d) => d.severity === vscode.DiagnosticSeverity.Error
    ).length;
    const warns = found.filter(
      (d) => d.severity === vscode.DiagnosticSeverity.Warning
    ).length;
    vscode.window.showInformationMessage(
      found.length === 0
        ? "AsyncAPI: contract is valid against the specification."
        : `AsyncAPI: ${errors} error(s), ${warns} warning(s), ${found.length} finding(s) total.`
    );
  }
}

function withAsyncApiEditor(
  fn: (editor: vscode.TextEditor) => void | Promise<void>
): void {
  const editor = vscode.window.activeTextEditor;
  if (editor && isAsyncApiDoc(editor.document)) {
    void fn(editor);
  } else {
    vscode.window.showInformationMessage("Open an AsyncAPI contract first.");
  }
}

function getConfig<T>(key: string, fallback: T): T {
  return vscode.workspace
    .getConfiguration("asyncapiContracts")
    .get<T>(key, fallback);
}

/**
 * Build the set of parser rule codes to hide, combining the explicit
 * `suppressedRules` list with the `suppressRecommendedVersionHint` toggle.
 */
function suppressedRules(): Set<string> {
  const rules = new Set(getConfig<string[]>("suppressedRules", []));
  if (getConfig("suppressRecommendedVersionHint", true)) {
    rules.add(RECOMMENDED_VERSION_RULE);
  }
  return rules;
}
