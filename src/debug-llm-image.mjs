#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLocalEnv } from "./env.mjs";
import { identifyArtworkWithLiveLlm } from "./guide-provider.mjs";
import { loadMiraContext } from "./mira.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadLocalEnv(rootDir);

const context = await loadMiraContext(rootDir);
const imagePath = process.argv[2] || "sample-data/artwork.jpg";
const absoluteImagePath = path.resolve(rootDir, imagePath);
const extension = path.extname(absoluteImagePath).toLowerCase() === ".png" ? "png" : "jpeg";
const imageBytes = await readFile(absoluteImagePath);
const imageDataUrl = `data:image/${extension};base64,${imageBytes.toString("base64")}`;
const startedAt = new Date().toISOString();

let result;
try {
  result = await identifyArtworkWithLiveLlm({
    context,
    imageDataUrl,
    imageName: imagePath
  });
} catch (error) {
  result = {
    error: error instanceof Error ? error.message : "Unknown LLM image debug error",
    provider: "Nebius Token Factory",
    model: process.env.NEBIUS_MODEL_VISION || "Qwen/Qwen2.5-VL-72B-Instruct",
    response_id: null
  };
  process.exitCode = 1;
}

const proof = {
  created_at: startedAt,
  image_path: imagePath,
  provider_mode: result.response_id ? "live" : "failed",
  provider: result.provider,
  model: result.model,
  response_id: result.response_id || null,
  likely_title: result.likely_title || "Unknown",
  likely_artist: result.likely_artist || "Unknown",
  confidence: result.confidence || "low",
  visual_evidence: result.visual_evidence || [],
  uncertainty_note: result.uncertainty_note || result.error || "",
  guide_summary_seed: result.guide_summary_seed || ""
};

const outputPath = path.join(rootDir, "artifacts", "local", "llm-image-debug.json");
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");

console.log("LLM IMAGE DEBUG");
console.log(`Image: ${imagePath}`);
console.log(`Provider mode: ${proof.provider_mode}`);
console.log(`Model: ${proof.model}`);
console.log(`Response id: ${proof.response_id || "none"}`);
console.log(`Likely artwork: ${proof.likely_title} by ${proof.likely_artist}`);
console.log(`Confidence: ${proof.confidence}`);
console.log(`Evidence: ${proof.visual_evidence.join(" | ") || "none"}`);
console.log(`Proof: artifacts/local/llm-image-debug.json`);
