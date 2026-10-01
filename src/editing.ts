import * as vscode from "vscode";
import { AsyncApiDocument } from "./asyncapiDocument";

/**
 * Edit helpers: add a channel, add a message, and navigate from a $ref to its
 * target definition. These operate on the active YAML document via WorkspaceEdit
 * so changes land in the undo stack like any other edit.
 */

/** Insert a new channel (and matching operation) scaffold. */
export async function addChannel(editor: vscode.TextEditor): Promise<void> {
  const name = await vscode.window.showInputBox({
    prompt: "Channel name (e.g. OutboundACH/Created)",
    validateInput: (v) => (v.trim() ? undefined : "Name is required"),
  });
  if (!name) return;

  const action = await vscode.window.showQuickPick(["receive", "send"], {
    placeHolder: "Operation action for this channel",
  });
  if (!action) return;

  const doc = editor.document;
  const parsed = AsyncApiDocument.parse(doc.getText());
  const safe = name.trim();
  const escaped = safe.replace(/~/g, "~0").replace(/\//g, "~1");
  const opName = safe.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") + "." + action;

  const channelBlock =
    `\n  ${quoteKey(safe)}:\n` +
    `    address: ${safe}\n` +
    `    messages:\n` +
    `      publish.message:\n` +
    `        $ref: '#/components/messages/${safe.split("/")[0]}'\n`;

  const operationBlock =
    `\n  ${quoteKey(opName)}:\n` +
    `    action: ${action}\n` +
    `    channel:\n` +
    `      $ref: '#/channels/${escaped}'\n` +
    `    messages:\n` +
    `      - $ref: '#/channels/${escaped}/messages/publish.message'\n`;

  const edit = new vscode.WorkspaceEdit();
  const channelsInsert = endOfSectionPosition(doc, parsed, "channels");
  edit.insert(doc.uri, channelsInsert, channelBlock);
  const opsInsert = endOfSectionPosition(doc, parsed, "operations");
  edit.insert(doc.uri, opsInsert, operationBlock);

  await vscode.workspace.applyEdit(edit);
}

/** Insert a reusable message + schema scaffold under components. */
export async function addMessage(editor: vscode.TextEditor): Promise<void> {
  const name = await vscode.window.showInputBox({
    prompt: "Message / entity name (e.g. OutboundACH)",
    validateInput: (v) =>
      /^[A-Za-z][A-Za-z0-9]*$/.test(v.trim())
        ? undefined
        : "Use a simple identifier (letters/digits).",
  });
  if (!name) return;
  const safe = name.trim();

  const doc = editor.document;
  const parsed = AsyncApiDocument.parse(doc.getText());

  const messageBlock =
    `\n    ${safe}:\n` +
    `      name: ${safe}\n` +
    `      description: ''\n` +
    `      payload:\n` +
    `        $ref: '#/components/schemas/${safe}'\n`;

  const schemaBlock =
    `\n    ${safe}:\n` +
    `      type: object\n` +
    `      properties: {}\n`;

  const edit = new vscode.WorkspaceEdit();
  edit.insert(doc.uri, endOfSubsectionPosition(doc, parsed, ["components", "messages"]), messageBlock);
  edit.insert(doc.uri, endOfSubsectionPosition(doc, parsed, ["components", "schemas"]), schemaBlock);
  await vscode.workspace.applyEdit(edit);
}

/** Definition provider: jump from a $ref string to the referenced node. */
export class RefDefinitionProvider implements vscode.DefinitionProvider {
  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.Definition | undefined {
    const ref = refAtPosition(document, position);
    if (!ref) return undefined;
    const parsed = AsyncApiDocument.parse(document.getText());
    const node = parsed.resolveLocalRef(ref) as any;
    if (node && node.range) {
      return new vscode.Location(document.uri, document.positionAt(node.range[0]));
    }
    return undefined;
  }
}

/** Command variant of go-to-definition for the context menu. */
export async function goToComponent(editor: vscode.TextEditor): Promise<void> {
  const ref = refAtPosition(editor.document, editor.selection.active);
  if (!ref) {
    vscode.window.showInformationMessage("Place the cursor on a $ref value first.");
    return;
  }
  const parsed = AsyncApiDocument.parse(editor.document.getText());
  const node = parsed.resolveLocalRef(ref) as any;
  if (node && node.range) {
    const pos = editor.document.positionAt(node.range[0]);
    editor.selection = new vscode.Selection(pos, pos);
    editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
  } else {
    vscode.window.showWarningMessage(`Could not resolve reference: ${ref}`);
  }
}

// --- helpers -----------------------------------------------------------------

function refAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position
): string | undefined {
  const line = document.lineAt(position.line).text;
  const m = /\$ref\s*:\s*['"]?(#\/[^'"\s]+)/.exec(line);
  return m ? m[1] : undefined;
}

function quoteKey(key: string): string {
  // Keys containing special YAML chars are safer single-quoted.
  return /[:#{}\[\],&*?|<>=!%@`"]/.test(key) ? `'${key.replace(/'/g, "''")}'` : key;
}

/**
 * Find the insertion point at the end of a top-level section (e.g. "channels").
 * Falls back to end-of-file if the section is absent.
 */
function endOfSectionPosition(
  document: vscode.TextDocument,
  parsed: AsyncApiDocument,
  section: string
): vscode.Position {
  const node = parsed.nodeAt([section]) as any;
  if (node && node.range) {
    return document.positionAt(node.range[2] ?? node.range[1]);
  }
  return document.lineAt(document.lineCount - 1).range.end;
}

function endOfSubsectionPosition(
  document: vscode.TextDocument,
  parsed: AsyncApiDocument,
  path: string[]
): vscode.Position {
  const node = parsed.nodeAt(path) as any;
  if (node && node.range) {
    return document.positionAt(node.range[2] ?? node.range[1]);
  }
  // Fall back to end of parent section, or EOF.
  const parent = parsed.nodeAt([path[0]]) as any;
  if (parent && parent.range) {
    return document.positionAt(parent.range[2] ?? parent.range[1]);
  }
  return document.lineAt(document.lineCount - 1).range.end;
}
