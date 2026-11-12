import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

function readEnv(name) {
  try {
    const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
    const line = text.split(/\r?\n/).find((entry) => entry.startsWith(`${name}=`));
    return line ? line.slice(name.length + 1).trim() : undefined;
  } catch {
    return undefined;
  }
}

const mode = process.argv[2] === "start" ? "start" : "dev";
const port = "3000";
const backend = readEnv("NEXT_PUBLIC_BACKEND_API_URL") || "http://localhost:5000";

console.log(`Frontend port: ${port}`);
console.log(`Frontend URL: http://localhost:${port}`);
console.log(`Backend API: ${backend}`);

const child = spawn(process.execPath, [nextBin, mode, "-p", String(port)], {
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
