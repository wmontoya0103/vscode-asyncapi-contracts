// Copies the official @asyncapi/react-component standalone bundle and stylesheet
// into media/ so they can be shipped inside the .vsix and loaded as local
// webview resources (no CDN, works offline, satisfies the webview CSP).
import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = join(root, "node_modules", "@asyncapi", "react-component");
const mediaDir = join(root, "media");

const assets = [
  {
    from: join(pkg, "browser", "standalone", "index.js"),
    to: join(mediaDir, "asyncapi-standalone.js"),
  },
  {
    from: join(pkg, "styles", "default.min.css"),
    to: join(mediaDir, "asyncapi-default.min.css"),
  },
];

mkdirSync(mediaDir, { recursive: true });

for (const { from, to } of assets) {
  if (!existsSync(from)) {
    console.error(`[copy-assets] Missing source asset: ${from}`);
    console.error("[copy-assets] Did you run `npm install`?");
    process.exit(1);
  }
  copyFileSync(from, to);
  console.log(`[copy-assets] ${from} -> ${to}`);
}

console.log("[copy-assets] Done.");
