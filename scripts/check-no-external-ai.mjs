import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const forbidden = new Set([
  "openai",
  "@anthropic-ai/sdk",
  "@google/generative-ai",
  "@aws-sdk/client-bedrock-runtime",
]);
const roots = ["package.json", "apps", "packages"];
const violations = [];
const prohibitedKeyName = ["OPENAI", "API", "KEY"].join("_");

async function inspect(path) {
  const entries = await readdir(path, { withFileTypes: true });
  for (const entry of entries) {
    if (["node_modules", "dist", "coverage"].includes(entry.name)) continue;
    const child = join(path, entry.name);
    if (entry.isDirectory()) await inspect(child);
    else if (entry.name === "package.json") await inspectManifest(child);
  }
}

async function inspectManifest(path) {
  const manifest = JSON.parse(await readFile(path, "utf8"));
  for (const section of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    for (const name of Object.keys(manifest[section] ?? {}))
      if (forbidden.has(name)) violations.push(`${path}: ${name}`);
  }
}

await inspectManifest(roots[0]);
for (const root of roots.slice(1)) await inspect(root);
if ((await readFile(".env.example", "utf8")).includes(prohibitedKeyName))
  violations.push(`.env.example: ${prohibitedKeyName}`);
if (violations.length) {
  process.stderr.write(
    `Forbidden external AI dependencies found:\n${violations.join("\n")}\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write("No paid external AI SDK dependencies found.\n");
}
