#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLocalEnv } from "./env.mjs";
import { createMiraVisitCard, getMiraVisitCard } from "./mira.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadLocalEnv(rootDir);

const phone = process.env.MIRA_DEMO_PHONE || "773-273-1585";
const language = process.env.MIRA_DEMO_LANGUAGE || "en";

const card = await createMiraVisitCard({
  rootDir,
  phone,
  language,
  imageName: "sample-data/artwork.jpg",
  imageDataUrl: "",
  mode: "mock",
  liveLlm: true
});

let latest = card;
for (let index = 0; index < 6; index += 1) {
  await sleep(950);
  latest = await getMiraVisitCard(rootDir, card.visit_card_id);
}

const preview = latest.voice_interaction.first_message || latest.guide_summary;
const previewPath = path.join(rootDir, "artifacts", "local", "phone-guide-preview.txt");
await mkdir(path.dirname(previewPath), { recursive: true });
await writeFile(
  previewPath,
  [
    "PHONE GUIDE PREVIEW",
    preview,
    "",
    `visit_card_id=${latest.visit_card_id}`,
    `llm_provider=${latest.llm_evidence?.provider || "unknown"}`,
    `llm_model=${latest.llm_evidence?.model || "unknown"}`,
    `llm_response_id=${latest.llm_evidence?.response_id || "none"}`,
    `artwork_likely_title=${latest.artwork_identification?.likely_title || "Unknown"}`,
    `artwork_likely_artist=${latest.artwork_identification?.likely_artist || "Unknown"}`,
    `artwork_confidence=${latest.artwork_identification?.confidence || "low"}`,
    "vapi_mode=mock",
    "live_phone_call_happened=false"
  ].join("\n"),
  "utf8"
);

console.log("Mira local product preview complete");
console.log(`Visit Card: artifacts/mira-live/${latest.visit_card_id}/visit-card.json`);
console.log(`Preview evidence: artifacts/local/phone-guide-preview.txt`);
console.log("");
console.log("PHONE GUIDE PREVIEW");
console.log(preview);
console.log("");
console.log(`LLM: ${latest.provider_modes?.llm || "unknown"} ${latest.llm_evidence?.model || ""}`.trim());
console.log(`LLM response id: ${latest.llm_evidence?.response_id || "none"}`);
console.log(
  `Artwork identification: ${latest.artwork_identification?.likely_title || "Unknown"} by ${latest.artwork_identification?.likely_artist || "Unknown"} (${latest.artwork_identification?.confidence || "low"})`
);
console.log("Vapi: mock");
console.log("Live phone call happened: false");

if (latest.provider_modes?.llm !== "live") {
  console.error(`Live LLM was not proven: ${latest.llm_evidence?.error || "missing live provider evidence"}`);
  process.exitCode = 1;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
