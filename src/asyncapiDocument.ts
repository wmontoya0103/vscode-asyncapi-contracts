import {
  Document,
  parseDocument,
  isMap,
  isScalar,
  isSeq,
  Node,
  Pair,
} from "yaml";
import * as vscode from "vscode";

/**
 * Lightweight wrapper around a parsed AsyncAPI YAML document.
 *
 * We parse with the `yaml` library in "document" mode so we keep source
 * ranges (offsets) for every node. That lets us map findings back to editor
 * positions for diagnostics and "go to definition" style navigation.
 */
export class AsyncApiDocument {
  readonly doc: Document.Parsed;
  readonly text: string;

  private constructor(doc: Document.Parsed, text: string) {
    this.doc = doc;
    this.text = text;
  }

  static parse(text: string): AsyncApiDocument {
    const doc = parseDocument(text, { keepSourceTokens: true });
    return new AsyncApiDocument(doc, text);
  }

  /** True if the document declares an `asyncapi` version at the root. */
  isAsyncApi(): boolean {
    const version = this.getStringAt(["asyncapi"]);
    return typeof version === "string" && version.length > 0;
  }

  /** The declared AsyncAPI version string, e.g. "3.0.0". */
  version(): string | undefined {
    return this.getStringAt(["asyncapi"]);
  }

  /** Read a scalar string following a key path, if present. */
  getStringAt(path: (string | number)[]): string | undefined {
    const node = this.doc.getIn(path, true);
    if (isScalar(node) && typeof node.value === "string") {
      return node.value;
    }
    return undefined;
  }

  /** Get the YAML node at a path (keepNode = true). */
  nodeAt(path: (string | number)[]): Node | undefined {
    const n = this.doc.getIn(path, true);
    return (n as Node) ?? undefined;
  }

  /** The map of channel-name -> node under `channels`, or empty. */
  channelEntries(): Pair[] {
    return this.mapEntries(["channels"]);
  }

  operationEntries(): Pair[] {
    return this.mapEntries(["operations"]);
  }

  messageEntries(): Pair[] {
    return this.mapEntries(["components", "messages"]);
  }

  schemaEntries(): Pair[] {
    return this.mapEntries(["components", "schemas"]);
  }

  private mapEntries(path: (string | number)[]): Pair[] {
    const node = this.doc.getIn(path, true);
    if (isMap(node)) {
      return node.items as Pair[];
    }
    return [];
  }

  /**
   * Collect every `$ref` string in the document together with its source
   * range so callers can validate or navigate them.
   */
  collectRefs(): { ref: string; range: [number, number] }[] {
    const refs: { ref: string; range: [number, number] }[] = [];
    const visit = (node: unknown): void => {
      if (isMap(node)) {
        for (const item of node.items) {
          const pair = item as Pair;
          const keyNode = pair.key as any;
          const valueNode = pair.value as any;
          if (
            isScalar(keyNode) &&
            keyNode.value === "$ref" &&
            isScalar(valueNode) &&
            typeof valueNode.value === "string" &&
            valueNode.range
          ) {
            refs.push({
              ref: valueNode.value,
              range: [valueNode.range[0], valueNode.range[1]],
            });
          }
          visit(valueNode);
        }
      } else if (isSeq(node)) {
        for (const item of node.items) {
          visit(item);
        }
      }
    };
    visit(this.doc.contents);
    return refs;
  }

  /**
   * Resolve a local JSON pointer ($ref like "#/components/messages/Foo")
   * to the YAML node it points at, if present.
   */
  resolveLocalRef(ref: string): Node | undefined {
    if (!ref.startsWith("#/")) {
      return undefined;
    }
    const segments = ref
      .slice(2)
      .split("/")
      .map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));
    const node = this.doc.getIn(segments, true);
    return (node as Node) ?? undefined;
  }

  /** Convert a YAML source offset into a vscode.Position via the document. */
  static offsetToPosition(
    document: vscode.TextDocument,
    offset: number
  ): vscode.Position {
    return document.positionAt(offset);
  }
}

/** Fast pre-check without a full parse: does the text look like AsyncAPI? */
export function looksLikeAsyncApi(text: string): boolean {
  // Only scan the head of the file to stay cheap on large contracts.
  const head = text.slice(0, 2000);
  return /^\s*asyncapi\s*:\s*['"]?\d+\.\d+/m.test(head);
}
