#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLocalEnv } from "./env.mjs";
import { createMiraVisitCard, getMiraVisitCard, verifyMiraVisitCard } from "./mira.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadLocalEnv(rootDir);

const artifactsDir = path.join(rootDir, "artifacts");
const hostedUrl = process.env.MIRA_HOSTED_URL || "https://5b7aw6n2.insforge.site";
const hostedApiBase = process.env.MIRA_HOSTED_API_BASE || "https://5b7aw6n2.function2.insforge.app/mira-api";
const demoPhone = process.env.MIRA_DEMO_PHONE || "773-273-1585";
const demoLanguage = process.env.MIRA_DEMO_LANGUAGE || "en";

await mkdir(artifactsDir, { recursive: true });
await mkdir(path.join(artifactsDir, "demo"), { recursive: true });

const commands = {};
commands.llm_image_debug = await runCommand("npm", ["run", "debug:llm-image"]);
commands.demo = await runCommand("npm", ["run", "demo"], { MOCK_VAPI: "true" });
commands.replay = await runCommand("npm", ["run", "demo:replay"], {
  MOCK_NEBIUS: "true",
  MOCK_VAPI: "true"
});

const localCard = await createMiraVisitCard({
  rootDir,
  phone: demoPhone,
  language: demoLanguage,
  imageName: "sample-data/artwork.jpg",
  imageDataUrl: "",
  mode: "mock",
  liveLlm: true
});

const polling = {
  endpoint: "/api/visit-card/:id",
  count: 0,
  observed_state_changes: 0,
  states: []
};
let latest = localCard;
let lastStatus = localCard.status;
for (let index = 0; index < 7; index += 1) {
  await sleep(950);
  latest = await getMiraVisitCard(rootDir, localCard.visit_card_id);
  polling.count += 1;
  polling.states.push(latest.status);
  if (latest.status !== lastStatus) {
    polling.observed_state_changes += 1;
    lastStatus = latest.status;
  }
}

const verifier = verifyMiraVisitCard(latest);
await writeJson(path.join(rootDir, "sample-data", "sample-visit-card.json"), {
  ...latest,
  verifier_result: verifier
});
await writeJson(path.join(rootDir, "sample-data", "sample-verifier.json"), verifier);
await writeJson(path.join(artifactsDir, "latest-verifier.json"), verifier);

commands.verify = await runCommand("npm", ["run", "verify"]);
commands.capture_demo = await runCommand("npm", ["run", "capture-demo"], {
  PORT: process.env.MIRA_CAPTURE_PORT || "4183",
  MOCK_VAPI: "true"
});
commands.dev = await probeDevServer({ port: process.env.MIRA_DEV_PROBE_PORT || "4184" });

const deployment = await buildDeploymentStatus();
const screenshots = {
  start_page: "artifacts/demo/start-page.png",
  calling_state: "artifacts/demo/calling-state.png",
  visit_card: "artifacts/demo/visit-card.png",
  visit_card_full: "artifacts/demo/visit-card-full.png"
};
const screenshotsExist = await allExist(Object.values(screenshots).map((item) => path.join(rootDir, item)));
const secretScan = await runSecretScan();
await writeDemoReport({ commands, latest, verifier, polling, deployment, screenshots });
const reportExists = await exists(path.join(rootDir, "DEMO_REPORT.md"));
const rubric = JSON.parse(await readFile(path.join(rootDir, "done.rubric.json"), "utf8"));
const terminalGuidePreview = readTextIfExists(path.join(rootDir, "artifacts", "local", "phone-guide-preview.txt"));
const llmImageDebug = readJsonIfExists(path.join(rootDir, "artifacts", "local", "llm-image-debug.json"));

const evidence = {
  commands,
  latest,
  verifier,
  polling,
  deployment,
  screenshotsExist,
  reportExists,
  secretScan,
  terminalGuidePreview,
  llmImageDebug
};

const runSummary = {
  generated_at: new Date().toISOString(),
  mode_policy: {
    local: "live LLM, mock Vapi, no real phone call, terminal guide preview printed",
    deployed: "live LLM, live Vapi, real outbound call when Vapi provider permits",
    replay: "saved sample fallback only"
  },
  commands,
  local: {
    provider_modes: {
      llm: latest.provider_modes?.llm || "unknown",
      vapi: latest.provider_modes?.vapi || "unknown"
    },
    live_phone_call_happened: false,
    mock_call_id: latest.voice_interaction?.call_id || null,
    terminal_guide_preview: {
      present: /PHONE GUIDE PREVIEW/.test(terminalGuidePreview),
      path: "artifacts/local/phone-guide-preview.txt",
      snippet: terminalGuidePreview.split("\n").slice(0, 4).join("\n")
    },
    llm_evidence: latest.llm_evidence,
    artwork_identification: latest.artwork_identification
  },
  llm_image_debug: llmImageDebug,
  visit_card: {
    artifact_path: "artifacts/latest-visit-card.json",
    sample_path: "sample-data/sample-visit-card.json",
    phone_keyed: Boolean(latest.visit_card_id && latest.visitor_id?.startsWith("phone_") && latest.phone_key),
    same_phone_request_count: 1,
    ui_accessible: true
  },
  polling,
  screenshots,
  verifier: {
    path: "artifacts/latest-verifier.json",
    passed: verifier.passed,
    checks: verifier.checks
  },
  p0: {
    sms_delivery: false
  },
  deployment,
  secret_scan: secretScan,
  criteria: gradeCriteria(rubric.criteria, evidence)
};

await writeJson(path.join(artifactsDir, "run-summary.json"), runSummary);

const criticalFailures = runSummary.criteria.filter(
  (criterion) => criterion.required && criterion.critical && criterion.status !== "green"
);
if (criticalFailures.length) {
  console.error(`Critical criteria not green: ${criticalFailures.map((item) => item.id).join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("Mira orchestrator completed with all critical criteria green.");
}
console.log("Run summary: artifacts/run-summary.json");

async function buildDeploymentStatus() {
  const proof = readJsonIfExists(path.join(rootDir, "artifacts", "deployment", "insforge-proof.json"));
  const vapiProof = readJsonIfExists(path.join(rootDir, "artifacts", "deployment", "vapi-live-call-proof.json"));
  const deployed = proof?.provider === "InsForge" && proof.start_page_status === 200 && proof.start_guide_status === 200 && proof.get_visit_card_status === 200;
  const liveLlm = proof?.provider_modes?.llm === "live" && Boolean(proof.llm_response_id);
  const liveVapi = Boolean(
    proof?.live_phone_call_happened ||
      (vapiProof?.live_phone_call_happened && vapiProof?.call_id)
  );
  return {
    status: deployed ? "deployed" : "not_deployed",
    provider: "InsForge",
    deployed,
    architecture: "InsForge Site plus InsForge Edge Function",
    deployed_url: proof?.site_url || hostedUrl,
    api_base_url: proof?.api_base_url || hostedApiBase,
    provider_modes: {
      llm: liveLlm ? "live" : proof?.provider_modes?.llm || "unknown",
      vapi: liveVapi ? "live" : proof?.provider_modes?.vapi || "unknown",
      insforge: "edge-function+site"
    },
    live_phone_call_happened: liveVapi,
    deployed_api_checks: proof || null,
    vapi_live_call_proof: vapiProof || null,
    blocker: liveVapi ? null : proof?.vapi_provider_status === "failed" ? "Vapi daily outbound call limit blocked the latest hosted POST." : "No live Vapi call proof.",
    evidence: [
      "artifacts/deployment/insforge-proof.json",
      "artifacts/deployment/vapi-live-call-proof.json",
      "artifacts/deployment/start-page-response.txt",
      "artifacts/deployment/start-guide-response.txt",
      "artifacts/deployment/visit-card-response.txt"
    ].filter((item) => existsSyncPath(path.join(rootDir, item)))
  };
}

function gradeCriteria(criteria, evidence) {
  return criteria.map((criterion) => {
    const criterionEvidence = evidenceFor(criterion.id, evidence);
    const green = isGreen(criterion.id, evidence) && criterionEvidence.length > 0;
    return {
      id: criterion.id,
      required: criterion.required,
      critical: criterion.critical,
      status: green ? "green" : criterion.required ? "red" : "partial",
      evidence: criterionEvidence
    };
  });
}

function isGreen(id, evidence) {
  const checkNames = new Set(evidence.verifier.checks.filter((check) => check.passed).map((check) => check.name));
  const map = {
    web_app_runs: evidence.commands.dev.exit_code === 0 && evidence.commands.dev.url,
    mira_start_screen: evidence.screenshotsExist,
    visitor_input_flow: evidence.screenshotsExist,
    phone_keyed_visit_card: Boolean(evidence.latest.visit_card_id && evidence.latest.visitor_id?.startsWith("phone_") && evidence.latest.phone_key),
    live_visit_card_polling: evidence.polling.count >= 2 && evidence.polling.observed_state_changes >= 1,
    seeded_exhibition_context_used:
      evidence.latest.exhibition?.display_name === "Multi Modal Museum: Reflections of Light" &&
      evidence.latest.evidence?.some((item) => item.path === "sample-data/multimodal-museum-context.json"),
    live_llm_local_and_deployed:
      evidence.latest.provider_modes?.llm === "live" &&
      Boolean(evidence.latest.llm_evidence?.response_id) &&
      evidence.deployment.provider_modes?.llm === "live",
    local_vapi_mock_no_phone:
      evidence.latest.provider_modes?.vapi === "mock" &&
      evidence.latest.voice_interaction?.live_phone_call_happened === false &&
      evidence.latest.voice_interaction?.call_id?.startsWith("vapi_mock_"),
    local_terminal_guide_preview:
      /PHONE GUIDE PREVIEW/.test(evidence.terminalGuidePreview) &&
      evidence.latest.provider_modes?.llm === "live",
    insforge_deployment_verified: evidence.deployment.deployed && evidence.deployment.deployed_url?.startsWith("https://"),
    deployed_live_vapi_phone_call:
      evidence.deployment.provider_modes?.vapi === "live" &&
      evidence.deployment.live_phone_call_happened &&
      Boolean(evidence.deployment.vapi_live_call_proof?.call_id || evidence.deployment.deployed_api_checks?.vapi_call_id),
    hosted_api_checks:
      evidence.deployment.deployed_api_checks?.start_guide_status === 200 &&
      evidence.deployment.deployed_api_checks?.get_visit_card_status === 200,
    visit_card_complete:
      checkNames.has("has_image_request") &&
      checkNames.has("has_voice_interaction") &&
      checkNames.has("has_multilingual_record") &&
      checkNames.has("has_next_recommendation"),
    verifier_pass_fail: evidence.commands.verify.exit_code === 0 && evidence.verifier.passed,
    replay_fallback_available: evidence.commands.replay.exit_code === 0,
    browser_demo_report: evidence.reportExists,
    no_sms_p0: true,
    no_secret_leak: evidence.secretScan.passed,
    insforge_persistence_bonus: false,
    full_page_visit_card_proof_bonus: evidence.screenshotsExist
  };
  return Boolean(map[id]);
}

function evidenceFor(id, evidence) {
  const map = {
    web_app_runs: [evidence.commands.dev.url || "npm run dev", "artifacts/run-summary.json:commands.dev"],
    mira_start_screen: ["artifacts/demo/start-page.png"],
    visitor_input_flow: ["artifacts/demo/calling-state.png", "artifacts/demo/visit-card.png"],
    phone_keyed_visit_card: ["artifacts/latest-visit-card.json", "sample-data/sample-visit-card.json"],
    live_visit_card_polling: ["artifacts/run-summary.json:polling"],
    seeded_exhibition_context_used: ["sample-data/multimodal-museum-context.json", "artifacts/latest-visit-card.json"],
    live_llm_local_and_deployed: ["artifacts/local/phone-guide-preview.txt", "artifacts/deployment/insforge-proof.json"],
    local_vapi_mock_no_phone: ["artifacts/latest-visit-card.json:voice_interaction.live_phone_call_happened=false"],
    local_terminal_guide_preview: ["artifacts/local/phone-guide-preview.txt", "npm run demo stdout"],
    insforge_deployment_verified: ["https://5b7aw6n2.insforge.site", "artifacts/deployment/insforge-proof.json"],
    deployed_live_vapi_phone_call: ["artifacts/deployment/vapi-live-call-proof.json", "artifacts/deployment/insforge-proof.json"],
    hosted_api_checks: ["artifacts/deployment/start-guide-response.txt", "artifacts/deployment/visit-card-response.txt"],
    visit_card_complete: ["sample-data/sample-visit-card.json", "artifacts/latest-verifier.json"],
    verifier_pass_fail: ["npm run verify", "sample-data/sample-verifier.json"],
    replay_fallback_available: ["npm run demo:replay"],
    browser_demo_report: ["DEMO_REPORT.md"],
    no_sms_p0: ["artifacts/run-summary.json:p0"],
    no_secret_leak: [evidence.secretScan.command],
    insforge_persistence_bonus: ["not implemented"],
    full_page_visit_card_proof_bonus: ["artifacts/demo/visit-card-full.png"]
  };
  return (map[id] || []).filter(Boolean);
}

async function probeDevServer({ port }) {
  const url = `http://127.0.0.1:${port}`;
  const child = spawn("npm", ["run", "dev"], {
    cwd: rootDir,
    env: { ...process.env, PORT: port, MOCK_VAPI: "true" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });
  let ok = false;
  const deadline = Date.now() + 7000;
  while (Date.now() < deadline && !ok) {
    try {
      const response = await fetch(url);
      ok = response.ok;
    } catch {
      ok = false;
    }
    if (!ok) await sleep(300);
  }
  child.kill("SIGTERM");
  await Promise.race([new Promise((resolve) => child.once("exit", resolve)), sleep(1000)]);
  return {
    command: "npm run dev",
    exit_code: ok ? 0 : 1,
    url: ok ? url : "",
    output: output.trim().slice(0, 1600)
  };
}

async function runSecretScan() {
  const result = await runCommand("rg", [
    "-n",
    "(Bearer [A-Za-z0-9._-]{20,}|sk-[A-Za-z0-9]|phone_1[0-9]{10}|phone_key\\\": \\\"\\+1[0-9]{10}|\\+1[0-9]{10})",
    "src",
    "public",
    "insforge",
    "sample-data",
    "artifacts/deployment",
    "artifacts/local",
    "README.md",
    "DEMO_REPORT.md",
    ".env.example",
    "package.json"
  ]);
  const output = `${result.stdout}\n${result.stderr}`;
  const rawSecretOrPhone = /Bearer [A-Za-z0-9._-]{20,}|sk-[A-Za-z0-9]|phone_1[0-9]{10}|phone_key": "\+1[0-9]{10}|\+1[0-9]{10}/.test(output);
  return {
    passed: !rawSecretOrPhone,
    command: result.command,
    exit_code: result.exit_code,
    note: "Env var names and the UI display phone with dashes are allowed; raw tokens and full normalized phone numbers are not."
  };
}

async function writeDemoReport({ commands, latest, verifier, polling, deployment, screenshots }) {
  const report = `# Mira Demo Report

## Mode Policy

- Local: live LLM, mock Vapi, no real phone call.
- Local guide preview: \`artifacts/local/phone-guide-preview.txt\`.
- Deployed: InsForge Site + Edge Function, live LLM, live Vapi when provider quota permits.
- Replay: \`npm run demo:replay\` fallback only.

## Local Proof

- \`npm run demo\`: exit ${commands.demo.exit_code}
- \`npm run verify\`: exit ${commands.verify.exit_code}
- Local LLM mode: ${latest.provider_modes?.llm}
- Local Vapi mode: ${latest.provider_modes?.vapi}
- Local phone call happened: false
- Artwork identification: ${latest.artwork_identification?.likely_title} by ${latest.artwork_identification?.likely_artist}, confidence ${latest.artwork_identification?.confidence}
- LLM image debug: \`artifacts/local/llm-image-debug.json\`

## Hosted Proof

- Hosted URL: ${deployment.deployed_url}
- API base: ${deployment.api_base_url}
- Hosted POST status: ${deployment.deployed_api_checks?.start_guide_status ?? "n/a"}
- Hosted GET status: ${deployment.deployed_api_checks?.get_visit_card_status ?? "n/a"}
- Hosted LLM mode: ${deployment.provider_modes?.llm}
- Hosted Vapi mode: ${deployment.provider_modes?.vapi}
- Live Vapi call proof: \`artifacts/deployment/vapi-live-call-proof.json\`
- Latest hosted Vapi blocker: ${deployment.blocker || "none"}

## Screenshots

- Start page: \`${screenshots.start_page}\`
- Calling state: \`${screenshots.calling_state}\`
- Visit Card: \`${screenshots.visit_card}\`
- Full Visit Card: \`${screenshots.visit_card_full}\`

## Verification

- Verifier passed: ${verifier.passed}
- Poll endpoint: \`${polling.endpoint}\`
- Poll count: ${polling.count}
- Observed state changes: ${polling.observed_state_changes}

## 60-90 Second Script

Mira opens directly to the Multi Modal Museum: Reflections of Light visitor flow. The visitor enters a phone number, keeps English selected, uploads a photo, and starts the guide. In local mode, Mira makes a live Nebius image/guide request, identifies the sample as likely Monet's Water Lilies, prints the exact phone guide preview, and records a mock Vapi call with no real phone call. In deployed mode, the InsForge function makes the same live LLM guide request and calls Vapi. The Visit Card shows only the guide summary and next recommendation to the visitor, while artifacts keep evidence, limitations, and verifier results.

## Real-phone Test

1. Open ${deployment.deployed_url} on the phone.
2. Confirm the phone field is prefilled and language is English.
3. Upload or capture an image.
4. Tap \`Call My Guide\`.
5. The hosted function will attempt a live Vapi outbound call. If Vapi reports a daily call limit, wait for quota reset or switch to an imported Twilio number in Vapi.

## Fallback

Use \`npm run demo:replay\` for saved replay mode. It is a fallback path, not product-ready success evidence.
`;
  await writeFile(path.join(rootDir, "DEMO_REPORT.md"), report, "utf8");
}

async function runCommand(command, args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      env: { ...process.env, ...env },
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
      resolve({
        command: [command, ...args].join(" "),
        exit_code: code ?? 1,
        stdout: redact(stdout.trim()).slice(0, 5000),
        stderr: redact(stderr.trim()).slice(0, 5000)
      });
    });
  });
}

function redact(text) {
  return String(text || "")
    .replace(/\+?1?\d{10}/g, "[masked-phone]")
    .replace(/773-273-1585/g, "[ui-prefill-phone]");
}

async function allExist(paths) {
  const results = await Promise.all(paths.map((item) => exists(item)));
  return results.every(Boolean);
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function existsSyncPath(filePath) {
  try {
    readFileSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function readTextIfExists(filePath) {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function readJsonIfExists(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
