/**
 * Patches @mui/material Tabs/ScrollbarSize.js to add a null guard before
 * accessing nodeRef.current properties. Without this, MUI's ScrollbarSize
 * crashes in React 19 Strict Mode during simulated unmount/remount cycles.
 *
 * See: https://github.com/mui/material-ui/issues/xxxxx
 * Fixed in MUI v6+, but MUI v5 (latest: 5.18.0) still lacks the guard.
 *
 * This script is run automatically via the "postinstall" npm hook.
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(
  __dirname,
  "../node_modules/@mui/material/Tabs/ScrollbarSize.js"
);

const patched = "  const setMeasurements = () => {\n    if (!nodeRef.current) return;";
const original = "  const setMeasurements = () => {";

let content;
try {
  content = readFileSync(filePath, "utf8");
} catch {
  console.warn("[patch-mui] Could not read ScrollbarSize.js — skipping patch.");
  process.exit(0);
}

if (content.includes(patched)) {
  console.log("[patch-mui] ScrollbarSize.js already patched — skipping.");
  process.exit(0);
}

if (!content.includes(original)) {
  console.warn(
    "[patch-mui] Could not find patch target in ScrollbarSize.js — MUI may have been updated. Review and update patch if needed."
  );
  process.exit(0);
}

writeFileSync(filePath, content.replace(original, patched), "utf8");
console.log("[patch-mui] Patched ScrollbarSize.js with null guard.");
