#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadArtifact, runSampleTour, verifyArtifact, writePreview } from "./echoguide.mjs";
import { loadVisitCard, verifyMiraVisitCard, writeVerifiedVisitCard } from "./mira.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadLocalEnv(path.join(rootDir, ".env"));
const [command, arg] = process.argv.slice(2);

try {
  if (command === "run-sample") {
    const options = parseOptions(process.argv.slice(3));
    const result = await runSampleTour({
      rootDir,
      phone:
        options.phone ||
        process.env.MIRA_DEMO_PHONE ||
        "408-555-1234"
    });
    printRunResult(result);
  } else if (command === "verify") {
    const artifactPath = arg || "sample-data/sample-visit-card.json";
    const artifact = await loadVisitCard(rootDir, artifactPath);
    const verifier = verifyMiraVisitCard(artifact);
    if (artifactPath === "sample-data/sample-visit-card.json") {
      await writeVerifiedVisitCard(rootDir, artifact, "sample-data/sample-visit-card.json");
      writeFileSync(
        path.join(rootDir, "sample-data", "sample-verifier.json"),
        `${JSON.stringify(verifier, null, 2)}\n`,
        "utf8"
      );
    }
    console.log(JSON.stringify(verifier, null, 2));
    if (!verifier.passed) process.exitCode = 1;
  } else if (command === "verify-echoguide") {
    const artifactPath = path.resolve(rootDir, arg || "sample-data/sample-artifact.json");
    const artifact = await loadArtifact(artifactPath);
    console.log(JSON.stringify(verifyArtifact(artifact), null, 2));
  } else if (command === "preview") {
    const artifactPath = path.resolve(rootDir, arg || "sample-data/sample-artifact.json");
    const outputPath = path.join(rootDir, "artifacts", "preview", "visit-card.html");
    const previewPath = await writePreview({ artifactPath, outputPath, rootDir });
    console.log(`Preview written to ${previewPath}`);
  } else {
    printUsage();
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

function printRunResult(result) {
  const relativePreview = path.relative(rootDir, result.previewPath);
  const relativeArtifact = path.relative(rootDir, result.artifactPath);
  console.log("Mira mock-safe sample loop complete");
  console.log(`Run id: ${result.runId}`);
  console.log(`Artifact: ${relativeArtifact}`);
  console.log(`Preview: ${relativePreview}`);
  console.log(`Verifier: ${result.verifier.passed ? "passed" : "failed"}`);
  console.log(`Call status: ${result.artifact.call_status}`);
  if (result.artifact.call_diagnostics?.ended_reason) {
    console.log(`Call ended reason: ${result.artifact.call_diagnostics.ended_reason}`);
  }
  if (result.artifact.evidence?.vapi_call_id) {
    console.log(`Vapi call id: ${result.artifact.evidence.vapi_call_id}`);
  }
  console.log(`Transcript chars: ${(result.artifact.transcript || "").length}`);
  for (const check of result.verifier.checks) {
    console.log(`- ${check.passed ? "PASS" : "FAIL"} ${check.name}`);
  }
  console.log("");
  console.log("Open the preview HTML to inspect the Visit Card.");
}

function printUsage() {
  console.log(`Usage:
  npm run demo      Generate a mock-only sample session, artifact, verifier, and HTML preview
  npm run demo:live-nebius
                    Same loop, but uses Nebius when NEBIUS_API_KEY is set
  npm run demo:live-vapi
                    Same loop, but creates a Vapi outbound call when Vapi env vars are set
  node src/cli.mjs run-sample --phone +1XXXXXXXXXX
                    Override the destination phone number for this run
  npm run verify    Verify sample-data/sample-visit-card.json
  node src/cli.mjs verify-echoguide
                    Verify the legacy replay artifact
  npm run preview   Render sample-data/sample-artifact.json to artifacts/preview/visit-card.html`);
}

function parseOptions(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--phone") {
      options.phone = args[index + 1];
      index += 1;
    }
  }
  return options;
}

function loadLocalEnv(envPath) {
  try {
    const envFile = readFileSync(envPath, "utf8");
    for (const line of envFile.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const equalsAt = trimmed.indexOf("=");
      if (equalsAt === -1) continue;
      const key = trimmed.slice(0, equalsAt).trim();
      const value = trimmed.slice(equalsAt + 1).trim().replace(/^["']|["']$/g, "");
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}
