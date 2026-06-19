#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteUrl = process.env.MIRA_HOSTED_URL || "https://5b7aw6n2.insforge.site";
const apiBase = process.env.MIRA_HOSTED_API_BASE || "https://5b7aw6n2.function2.insforge.app/mira-api";
const smokePhone = process.env.MIRA_DEMO_PHONE || "773-273-1585";
const smokeLanguage = process.env.MIRA_DEMO_LANGUAGE || "en";
const deploymentDir = path.join(rootDir, "artifacts", "deployment");
await mkdir(deploymentDir, { recursive: true });

const checks = {};
checks.start_page = await fetchText(siteUrl);
await writeFile(path.join(deploymentDir, "start-page-response.txt"), checks.start_page.bodyWithStatus, "utf8");

checks.context = await fetchText(`${apiBase}/api/context`);
await writeFile(path.join(deploymentDir, "context-response.txt"), checks.context.bodyWithStatus, "utf8");

const startGuide = await fetchJson(`${apiBase}/api/start-guide`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    phone: smokePhone,
    language: smokeLanguage,
    image_name: "sample-data/artwork.jpg"
  })
});
await writeFile(
  path.join(deploymentDir, "start-guide-response.txt"),
  `${JSON.stringify(startGuide.json, null, 2)}\nHTTP:${startGuide.status}\n`,
  "utf8"
);

const visitCardId = startGuide.json.visit_card.visit_card_id;
await writeFile(path.join(deploymentDir, "hosted-card-id.txt"), `${visitCardId}\n`, "utf8");
await sleep(6000);

const visitCard = await fetchJson(`${apiBase}/api/visit-card/${encodeURIComponent(visitCardId)}`);
await writeFile(
  path.join(deploymentDir, "visit-card-response.txt"),
  `${JSON.stringify(visitCard.json, null, 2)}\nHTTP:${visitCard.status}\n`,
  "utf8"
);

const startCard = startGuide.json.visit_card;
const finalCard = visitCard.json.visit_card;
const proof = {
  provider: "InsForge",
  site_url: siteUrl,
  api_base_url: apiBase,
  start_page_status: checks.start_page.status,
  context_status: checks.context.status,
  start_guide_status: startGuide.status,
  get_visit_card_status: visitCard.status,
  visit_card_id: finalCard.visit_card_id,
  phone_keyed:
    startCard.visitor_id === finalCard.visitor_id &&
    finalCard.visitor_id.startsWith("phone_"),
  provider_modes: {
    llm: finalCard.provider_modes?.llm || "unknown",
    vapi: finalCard.voice_interaction.mode,
    insforge: "edge-function+site"
  },
  no_live_phone_call:
    finalCard.voice_interaction.mode === "mock" &&
    finalCard.voice_interaction.call_id.startsWith("vapi_mock_"),
  live_phone_call_happened: Boolean(finalCard.voice_interaction.live_phone_call_happened),
  vapi_call_id: finalCard.voice_interaction.call_id,
  vapi_provider_status: finalCard.voice_interaction.provider_status || finalCard.voice_interaction.status || null,
  masked_destination_phone: finalCard.masked_phone,
  llm_model: finalCard.llm_evidence?.model || null,
  llm_response_id: finalCard.llm_evidence?.response_id || null,
  final_status: finalCard.status,
  verifier_passed: finalCard.verifier_result.passed,
  evidence_files: [
    "artifacts/deployment/start-page-response.txt",
    "artifacts/deployment/context-response.txt",
    "artifacts/deployment/start-guide-response.txt",
    "artifacts/deployment/visit-card-response.txt"
  ]
};

await writeFile(path.join(deploymentDir, "insforge-proof.json"), `${JSON.stringify(proof, null, 2)}\n`, "utf8");
console.log(JSON.stringify(proof, null, 2));

if (
  proof.start_page_status !== 200 ||
  proof.context_status !== 200 ||
  proof.start_guide_status !== 200 ||
  proof.get_visit_card_status !== 200 ||
  !proof.phone_keyed ||
  (process.env.MIRA_EXPECT_LIVE_VAPI === "true" ? !proof.live_phone_call_happened : !proof.no_live_phone_call) ||
  proof.final_status !== "completed"
) {
  process.exitCode = 1;
}

async function fetchText(url) {
  const response = await fetch(url);
  const text = await response.text();
  return {
    status: response.status,
    body: text,
    bodyWithStatus: `${text}\nHTTP:${response.status}\n`
  };
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  return {
    status: response.status,
    json: JSON.parse(text)
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
