import * as vscode from "vscode";
import { isScalar, Pair } from "yaml";
import { AsyncApiDocument } from "./asyncapiDocument";

/**
 * Context-aware completion for AsyncAPI 3.x contracts.
 *
 * Two kinds of suggestions:
 *  1. Keyword completion based on the top-level section the cursor is in
 *     (root, info, a channel body, an operation body, a message body).
 *  2. $ref target completion: when the user is typing after `$ref:` we offer
 *     the local JSON pointers that actually exist in this document.
 */
export class AsyncApiCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] {
    const line = document.lineAt(position.line).text;
    const linePrefix = line.slice(0, position.character);

    // --- $ref completion -------------------------------------------------
    const refMatch = /\$ref\s*:\s*['"]?(#?[^'"]*)$/.exec(linePrefix);
    if (refMatch) {
      return this.completeRef(document, refMatch[1]);
    }

    // --- keyword completion ---------------------------------------------
    const section = this.sectionAt(document, position);
    return this.completeKeywords(section);
  }

  private completeRef(
    document: vscode.TextDocument,
    typed: string
  ): vscode.CompletionItem[] {
    const parsed = AsyncApiDocument.parse(document.getText());
    const targets: { pointer: string; detail: string }[] = [];

    const push = (
      entries: Pair[],
      base: string,
      detail: string
    ): void => {
      for (const pair of entries) {
        const key = pair.key;
        if (isScalar(key)) {
          const name = String(key.value);
          const escaped = name.replace(/~/g, "~0").replace(/\//g, "~1");
          targets.push({ pointer: `#/${base}/${escaped}`, detail });
        }
      }
    };

    push(parsed.messageEntries(), "components/messages", "message");
    push(parsed.schemaEntries(), "components/schemas", "schema");
    push(parsed.channelEntries(), "channels", "channel");

    return targets
      .filter((t) => t.pointer.startsWith(typed) || typed === "" || typed === "#")
      .map((t) => {
        const item = new vscode.CompletionItem(
          t.pointer,
          vscode.CompletionItemKind.Reference
        );
        item.detail = `AsyncAPI ${t.detail}`;
        item.insertText = t.pointer;
        return item;
      });
  }

  private completeKeywords(section: Section): vscode.CompletionItem[] {
    const keywords = SECTION_KEYWORDS[section] ?? SECTION_KEYWORDS.root;
    return keywords.map((kw) => {
      const item = new vscode.CompletionItem(
        kw.label,
        vscode.CompletionItemKind.Property
      );
      item.detail = kw.detail;
      item.insertText = new vscode.SnippetString(kw.snippet);
      item.documentation = new vscode.MarkdownString(kw.doc);
      return item;
    });
  }

  /**
   * Determine which AsyncAPI section the cursor sits in by walking upward to
   * the nearest top-level (column 0) key.
   */
  private sectionAt(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Section {
    for (let ln = position.line; ln >= 0; ln--) {
      const text = document.lineAt(ln).text;
      if (/^\S/.test(text)) {
        const key = text.split(":")[0].trim();
        if (key === "info") return "info";
        if (key === "channels") return "channels";
        if (key === "operations") return "operations";
        if (key === "components") return "components";
        if (key === "asyncapi" || key === "servers") return "root";
        return "root";
      }
    }
    return "root";
  }
}

type Section =
  | "root"
  | "info"
  | "channels"
  | "operations"
  | "components";

interface Keyword {
  label: string;
  detail: string;
  snippet: string;
  doc: string;
}

const SECTION_KEYWORDS: Record<Section, Keyword[]> = {
  root: [
    { label: "asyncapi", detail: "AsyncAPI version", snippet: "asyncapi: 3.0.0", doc: "The AsyncAPI specification version." },
    { label: "info", detail: "Document metadata", snippet: "info:\n  title: $1\n  version: $2", doc: "Metadata about the API." },
    { label: "channels", detail: "Channels map", snippet: "channels:\n  $1:\n    address: $2", doc: "Addressable components for sending/receiving messages." },
    { label: "operations", detail: "Operations map", snippet: "operations:\n  $1:\n    action: ${2|send,receive|}", doc: "The actions the application performs on channels." },
    { label: "components", detail: "Reusable components", snippet: "components:\n  messages:\n    $1:", doc: "Reusable messages, schemas and other objects." },
    { label: "servers", detail: "Servers map", snippet: "servers:\n  $1:\n    host: $2\n    protocol: $3", doc: "Connection details for the brokers/servers." },
  ],
  info: [
    { label: "title", detail: "string", snippet: "title: $1", doc: "The title of the API." },
    { label: "version", detail: "string", snippet: "version: $1", doc: "The version of this API document." },
    { label: "description", detail: "string", snippet: "description: >-\n  $1", doc: "A longer description of the API." },
    { label: "contact", detail: "object", snippet: "contact:\n  name: $1", doc: "Contact information." },
    { label: "license", detail: "object", snippet: "license:\n  name: $1", doc: "License information." },
  ],
  channels: [
    { label: "address", detail: "string", snippet: "address: $1", doc: "The channel address (e.g. a topic/queue name)." },
    { label: "messages", detail: "map", snippet: "messages:\n  $1:\n    $$ref: $2", doc: "Messages that can be sent/received on this channel." },
    { label: "description", detail: "string", snippet: "description: $1", doc: "A description of the channel." },
    { label: "parameters", detail: "map", snippet: "parameters:\n  $1:", doc: "Parameters used in the channel address." },
  ],
  operations: [
    { label: "action", detail: "send | receive", snippet: "action: ${1|send,receive|}", doc: "Whether the application sends or receives on the channel." },
    { label: "channel", detail: "reference", snippet: "channel:\n  $$ref: $1", doc: "A reference to the channel this operation applies to." },
    { label: "summary", detail: "string", snippet: "summary: $1", doc: "A short summary of the operation." },
    { label: "messages", detail: "sequence", snippet: "messages:\n  - $$ref: $1", doc: "A list of messages involved in this operation." },
  ],
  components: [
    { label: "messages", detail: "map", snippet: "messages:\n  $1:\n    payload:\n      $$ref: $2", doc: "Reusable message definitions." },
    { label: "schemas", detail: "map", snippet: "schemas:\n  $1:\n    type: object", doc: "Reusable schema definitions." },
    { label: "parameters", detail: "map", snippet: "parameters:\n  $1:", doc: "Reusable channel parameters." },
    { label: "payload", detail: "object", snippet: "payload:\n  $$ref: $1", doc: "The payload of a message." },
  ],
};
