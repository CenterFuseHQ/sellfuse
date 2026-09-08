import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const localEnv = existsSync(".env") ? parseEnv(readFileSync(".env", "utf8")) : {};
const environment = { ...localEnv, ...process.env };
const commands = ["dev:centerfuse", "dev:sellfuse", "dev:buyfuse", "dev:api", "dev:gateway"];
const children = commands.map((script) => spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", script], { stdio: "inherit", env: environment }));
function stop() { for (const child of children) if (!child.killed) child.kill(); }
process.on("SIGINT", stop); process.on("SIGTERM", stop);
for (const child of children) child.on("exit", (code) => { if (code && code !== 0) { process.exitCode = code; stop(); } });
function parseEnv(value) { const result = {}; for (const line of value.split(/\r?\n/)) { const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim()); if (match) result[match[1]] = match[2].replace(/^['"]|['"]$/g, ""); } return result; }
