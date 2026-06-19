#!/usr/bin/env node
import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, "artifacts", "insforge-site");
const apiBase = process.env.MIRA_API_BASE || "https://5b7aw6n2.us-east.insforge.app/functions/mira-api";

await mkdir(outputDir, { recursive: true });
await mkdir(path.join(outputDir, "sample-data"), { recursive: true });

for (const file of ["index.html", "app.js", "styles.css"]) {
  await copyFile(path.join(rootDir, "public", file), path.join(outputDir, file));
}
await copyFile(path.join(rootDir, "sample-data", "artwork.jpg"), path.join(outputDir, "sample-data", "artwork.jpg"));
await writeFile(
  path.join(outputDir, "config.js"),
  `window.MIRA_API_BASE = ${JSON.stringify(apiBase)};\n`,
  "utf8"
);

const notFound = await readFile(path.join(outputDir, "index.html"), "utf8");
await writeFile(path.join(outputDir, "404.html"), notFound, "utf8");

console.log(`Built InsForge static site at ${path.relative(rootDir, outputDir)}`);
console.log(`MIRA_API_BASE=${apiBase}`);
