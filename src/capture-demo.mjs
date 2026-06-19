#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const demoDir = path.join(rootDir, "artifacts", "demo");
const port = process.env.PORT || "4173";
const remoteBaseUrl = process.env.MIRA_CAPTURE_BASE_URL || "";
const remoteApiBase = process.env.MIRA_CAPTURE_API_BASE || "";
const baseUrl = remoteBaseUrl || `http://127.0.0.1:${port}`;

await mkdir(demoDir, { recursive: true });
const server = remoteBaseUrl
  ? null
  : spawn("npm", ["run", "dev"], {
      cwd: rootDir,
      env: { ...process.env, PORT: port },
      stdio: ["ignore", "pipe", "pipe"]
    });

try {
  await waitForServer(baseUrl);
  await chromeScreenshot(`${baseUrl}/`, path.join(demoDir, "start-page.png"));

  const apiBase = remoteApiBase || baseUrl;
  const started = await fetch(`${apiBase}/api/start-guide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: "773-273-1585",
      language: "en",
      image_name: "sample-data/artwork.jpg"
    })
  }).then((response) => response.json());
  const visitCardId = started.visit_card.visit_card_id;

  await sleep(2100);
  await fetch(`${apiBase}/api/visit-card/${visitCardId}`);
  await chromeScreenshot(`${baseUrl}/?card=${encodeURIComponent(visitCardId)}&focus=status`, path.join(demoDir, "calling-state.png"));

  await sleep(4200);
  for (let index = 0; index < 4; index += 1) {
    await fetch(`${apiBase}/api/visit-card/${visitCardId}`);
    await sleep(250);
  }
  await chromeScreenshot(`${baseUrl}/?card=${encodeURIComponent(visitCardId)}&focus=card`, path.join(demoDir, "visit-card.png"));
  await chromeScreenshot(
    `${baseUrl}/?card=${encodeURIComponent(visitCardId)}&focus=card`,
    path.join(demoDir, "visit-card-full.png"),
    { height: 2200 }
  );
  console.log("Screenshots written:");
  console.log("artifacts/demo/start-page.png");
  console.log("artifacts/demo/calling-state.png");
  console.log("artifacts/demo/visit-card.png");
  console.log("artifacts/demo/visit-card-full.png");
} finally {
  if (server) {
    server.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => server.once("exit", resolve)),
      sleep(500)
    ]);
  }
}

async function chromeScreenshot(url, outputPath, { height = 844 } = {}) {
  const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    `--window-size=390,${height}`,
    "--force-device-scale-factor=1",
    "--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "--virtual-time-budget=1600",
    `--screenshot=${outputPath}`,
    url
  ];
  const result = await run(chromePath, args);
  if (result.exit_code !== 0) {
    throw new Error(`Chrome screenshot failed: ${result.stderr || result.stdout}`);
  }
}

async function waitForServer(url) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await sleep(150);
    }
    await sleep(150);
  }
  throw new Error(`Server did not start at ${url}`);
}

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.once("exit", (code) => {
      resolve({ exit_code: code ?? 1, stdout, stderr });
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
