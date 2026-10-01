import * as vscode from "vscode";
/**
 * Standards-conformant validation for AsyncAPI documents.
 *
 * This delegates to the official `@asyncapi/parser` — the same engine that
 * powers AsyncAPI Studio and the AsyncAPI CLI. It validates the document
 * against the official AsyncAPI JSON Schema AND applies the parser's extra
 * semantic rules (reference resolution, latest-version hints, etc.), so the
 * diagnostics match what the official tooling reports.
 *
 * IMPORTANT: the parser is loaded LAZILY (first time it is actually needed)
 * rather than at module import time. If the heavy parser bundle were to throw
 * while loading, doing it at import time would break the whole extension's
 * activation (every command would report "command not found"). Lazy loading
 * keeps command registration independent from the parser.
 */
let parserInstance: { parse(text: string): Promise<{ diagnostics: unknown[] }> } | undefined;

async function getParser(): Promise<{
  parse(text: string): Promise<{ diagnostics: unknown[] }>;
}> {
  if (!parserInstance) {
    const { Parser } = await import("@asyncapi/parser");
    parserInstance = new Parser() as unknown as typeof parserInstance;
  }
  return parserInstance!;
}

/**
 * Spectral/parser severity levels (what the parser emits) mapped to VS Code's
 * DiagnosticSeverity. Parser: 0=error, 1=warning, 2=info, 3=hint.
 */
function mapSeverity(severity: number | undefined): vscode.DiagnosticSeverity {
  switch (severity) {
    case 0:
      return vscode.DiagnosticSeverity.Error;
    case 1:
      return vscode.DiagnosticSeverity.Warning;
    case 2:
      return vscode.DiagnosticSeverity.Information;
    case 3:
      return vscode.DiagnosticSeverity.Hint;
    default:
      return vscode.DiagnosticSeverity.Warning;
  }
}

interface ParserRange {
  start: { line: number; character: number };
  end: { line: number; character: number };
}

interface ParserDiagnostic {
  code?: string | number;
  message: string;
  path?: (string | number)[];
  severity?: number;
  range?: ParserRange;
}

function toVscodeRange(
  document: vscode.TextDocument,
  range: ParserRange | undefined
): vscode.Range {
  if (
    range &&
    range.start &&
    range.end &&
    typeof range.start.line === "number"
  ) {
    return new vscode.Range(
      new vscode.Position(Math.max(0, range.start.line), Math.max(0, range.start.character)),
      new vscode.Position(Math.max(0, range.end.line), Math.max(0, range.end.character))
    );
  }
  // Fall back to the first line if the parser gave no range.
  const firstLineLen = document.lineCount > 0 ? document.lineAt(0).text.length : 1;
  return new vscode.Range(0, 0, 0, Math.max(1, firstLineLen));
}

/** The parser rule code for the "upgrade to the latest version" hint. */
export const RECOMMENDED_VERSION_RULE = "asyncapi-latest-version";

/**
 * Run the official AsyncAPI parser over the document and return VS Code
 * diagnostics. Never throws: parser failures are surfaced as a single error
 * diagnostic so the editor always gets feedback.
 *
 * `suppressedRules` is a set of parser rule codes to drop from the results.
 */
export async function validate(
  document: vscode.TextDocument,
  suppressedRules: ReadonlySet<string> = new Set()
): Promise<vscode.Diagnostic[]> {
  const text = document.getText();
  try {
    const parser = await getParser();
    const { diagnostics } = await parser.parse(text);

    return (diagnostics as ParserDiagnostic[])
      .filter((d) => d.code === undefined || !suppressedRules.has(String(d.code)))
      .map((d) => {
        const diag = new vscode.Diagnostic(
          toVscodeRange(document, d.range),
          d.message,
          mapSeverity(d.severity)
        );
        diag.source = "asyncapi";
        if (d.code !== undefined) {
          diag.code = String(d.code);
        }
        return diag;
      });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const diag = new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 1),
      `AsyncAPI parser error: ${message}`,
      vscode.DiagnosticSeverity.Error
    );
    diag.source = "asyncapi";
    return [diag];
  }
}
