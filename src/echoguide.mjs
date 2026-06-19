import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const REQUIRED_ARTIFACT_FIELDS = [
  "run_id",
  "created_at",
  "input_summary",
  "image_url",
  "artwork_analysis",
  "guide_script",
  "suggested_questions",
  "call_status",
  "summary",
  "evidence",
  "rubric_result",
  "known_limitations"
];

export async function runSampleTour({ rootDir, phone = "408-555-1234" } = {}) {
  const runId = `sess_sample_${compactTimestamp(new Date())}`;
  const createdAt = new Date().toISOString();
  const artifactsDir = path.join(rootDir, "artifacts", runId);
  await mkdir(artifactsDir, { recursive: true });

  const sourceImage = path.join(rootDir, "sample-data", "artwork.jpg");
  const runImage = path.join(artifactsDir, "artwork.jpg");
  await copyFile(sourceImage, runImage);

  const session = {
    session_id: runId,
    created_at: createdAt,
    phone,
    status: "created",
    image_url: "sample-data/artwork.jpg",
    mode: {
      nebius: shouldUseLiveNebius() ? "live" : "mock",
      vapi: shouldUseLiveVapi() ? "live" : "mock",
      insforge: "local-json"
    }
  };

  session.status = "analyzing";
  const artworkAnalysis = await analyzeArtwork(sourceImage);
  session.status = "analyzed";

  const guideGeneration = await generateGuideScript(artworkAnalysis);
  const guideScript = guideGeneration.script;
  const suggestedQuestions =
    artworkAnalysis["3_follow_up_questions_the_visitor_might_ask"];

  session.status = "calling";
  const call = await startGuideCall({
    phone,
    runId,
    guideScript,
    analysis: artworkAnalysis
  });
  session.status = call.status === "mock_completed" ? "completed" : "calling";

  const artifactWithoutRubric = {
    run_id: runId,
    created_at: createdAt,
    input_summary: {
      input_type: "artwork_photo",
      phone_country: "US",
      source: "sample-data/artwork.jpg",
      workflow: "sample_upload_to_mock_voice_visit_card"
    },
    image_url: "sample-data/artwork.jpg",
    artwork_analysis: {
      title_guess: artworkAnalysis.title_guess,
      artist_guess: artworkAnalysis.artist_guess,
      confidence: artworkAnalysis.confidence,
      visual_description: artworkAnalysis.visual_description,
      likely_period_or_style: artworkAnalysis.likely_period_or_style,
      what_to_notice_first: artworkAnalysis.what_to_notice_first,
      safety_note_about_uncertainty:
        artworkAnalysis.safety_note_about_uncertainty
    },
    guide_script: guideScript,
    suggested_questions: suggestedQuestions,
    call_status: call.status,
    transcript: call.transcript || "",
    summary: call.summary,
    call_diagnostics: {
      provider_status: call.provider_status || call.status,
      ended_reason: call.ended_reason || null,
      started_at: call.started_at || null,
      ended_at: call.ended_at || null
    },
    evidence: {
      run_id: runId,
      input_image: "sample-data/artwork.jpg",
      sample_image_source:
        "Wikimedia Commons Special:Redirect/file/Claude Monet - Water Lilies - Google Art Project (462013).jpg?width=1200",
      vision_provider: shouldUseLiveNebius()
        ? "Nebius Token Factory live OpenAI-compatible vision call"
        : "Nebius Token Factory mock; live vision only runs through explicit live scripts",
      recommended_nebius_models: {
        vision: getNebiusConfig().visionModel,
        text:
          getNebiusConfig().textModel
      },
      guide_generation_provider: guideGeneration.provider,
      voice_provider: shouldUseLiveVapi()
        ? "Vapi live outbound call via POST /call"
        : "Vapi mock outbound call; live calls only run through explicit live scripts",
      vapi_call_id: call.call_id,
      vapi_provider_status: call.provider_status || call.status,
      vapi_ended_reason: call.ended_reason || null,
      backend_provider: "Local JSON; InsForge table/storage/function integration point",
      provider_contracts_checked: [
        "Vapi outbound calls require assistant or assistantId, phoneNumberId, and customer.number.",
        "Vapi server URL events POST message payloads with status/transcript/artifact data.",
        "InsForge offers Postgres, storage, model gateway, and Deno edge functions."
      ]
    },
    known_limitations: [
      "The sample analysis is deterministic and does not identify a real catalog artwork.",
      "The call transcript is mocked so the demo can run without Vapi credits or phone setup.",
      "Local JSON stands in for InsForge persistence until a project is connected."
    ]
  };

  const rubricResult = verifyArtifact(artifactWithoutRubric);
  const artifact = { ...artifactWithoutRubric, rubric_result: rubricResult };
  artifact.rubric_result = verifyArtifact(artifact);

  const sampleSession = {
    ...session,
    phone: maskPhone(phone),
    analysis: artifact.artwork_analysis,
    guide_script: guideScript,
    suggested_questions: suggestedQuestions,
    vapi_call_id: call.call_id,
    transcript: call.transcript || "",
    summary: call.summary,
    artifact_path: "sample-data/sample-artifact.json",
    verifier_path: "sample-data/sample-verifier.json"
  };

  await writeJson(path.join(rootDir, "sample-data", "sample-session.json"), sampleSession);
  await writeJson(path.join(rootDir, "sample-data", "sample-artifact.json"), artifact);
  await writeJson(path.join(rootDir, "sample-data", "sample-verifier.json"), artifact.rubric_result);
  await writeJson(path.join(artifactsDir, "visit-card.json"), artifact);
  await writeJson(path.join(artifactsDir, "verifier.json"), artifact.rubric_result);

  const previewHtml = renderVisitCardHtml(artifact, {
    imageSrc: path.relative(artifactsDir, path.join(rootDir, artifact.image_url))
  });
  const previewPath = path.join(artifactsDir, "visit-card.html");
  await writeFile(previewPath, previewHtml, "utf8");

  const sampleDataDir = path.join(rootDir, "sample-data");
  const samplePreviewHtml = renderVisitCardHtml(artifact, {
    imageSrc: path.relative(sampleDataDir, path.join(rootDir, artifact.image_url))
  });
  await writeFile(path.join(sampleDataDir, "sample-preview.html"), samplePreviewHtml, "utf8");

  return {
    runId,
    session: sampleSession,
    artifact,
    verifier: artifact.rubric_result,
    previewPath,
    artifactPath: path.join(artifactsDir, "visit-card.json")
  };
}

export async function loadArtifact(artifactPath) {
  return JSON.parse(await readFile(artifactPath, "utf8"));
}

export function verifyArtifact(artifact) {
  const checks = [
    {
      name: "artifact_exists",
      passed: Boolean(artifact) && REQUIRED_ARTIFACT_FIELDS.every((field) => field in artifact),
      description: "A Visit Card artifact exists and includes the required top-level fields."
    },
    {
      name: "has_image_analysis",
      passed: Boolean(
        artifact?.artwork_analysis?.visual_description &&
          artifact?.artwork_analysis?.what_to_notice_first?.length >= 3
      ),
      description: "The artifact includes structured visual analysis."
    },
    {
      name: "has_voice_call_status",
      passed: typeof artifact?.call_status === "string" && artifact.call_status.length > 0,
      description: "The artifact records Vapi call status or fallback mode."
    },
    {
      name: "has_evidence",
      passed: Boolean(
        artifact?.evidence?.run_id &&
          artifact?.evidence?.input_image &&
          artifact?.evidence?.vision_provider &&
          artifact?.evidence?.voice_provider
      ),
      description: "The artifact names the input, provider path, and run id."
    },
    {
      name: "states_uncertainty",
      passed: Boolean(
        hasUncertaintyLanguage(
          artifact?.artwork_analysis?.safety_note_about_uncertainty
        )
      ),
      description: "The artifact does not overclaim exact artwork identity."
    }
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks
  };
}

export async function writePreview({ artifactPath, outputPath, rootDir = process.cwd() }) {
  const artifact = await loadArtifact(artifactPath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    renderVisitCardHtml(artifact, {
      imageSrc: path.relative(path.dirname(outputPath), path.join(rootDir, artifact.image_url))
    }),
    "utf8"
  );
  return outputPath;
}

async function analyzeArtwork(imagePath) {
  if (!shouldUseLiveNebius()) return mockNebiusVisionAnalysis();

  try {
    const analysis = await callNebiusVision(imagePath);
    return normalizeArtworkAnalysis(analysis);
  } catch (error) {
    console.warn(`Nebius vision failed; using mock analysis. ${error.message}`);
    return mockNebiusVisionAnalysis();
  }
}

async function generateGuideScript(analysis) {
  const deterministicScript = buildGuideScriptFromAnalysis(analysis);
  if (!shouldUseLiveNebius()) {
    return {
      script: deterministicScript,
      provider: "Local deterministic guide script"
    };
  }

  try {
    const generated = await callNebiusText({
      system:
        "You are Mira, a concise museum audio guide. Use only the provided artwork analysis. Be honest about uncertainty. Do not include hidden reasoning.",
      user:
        "Create a 45-60 second phone-guide script from this JSON analysis. " +
        "If title_guess or artist_guess are useful, the first sentence must directly say what the artwork likely is and who likely made it. " +
        "Do not begin with 'Hi', 'I am', or an app introduction. Return only the script.\n\n" +
        JSON.stringify(analysis, null, 2)
    });
    const script = generated.trim();
    if (!script) throw new Error("Nebius text model returned empty content");
    return {
      script,
      provider: "Nebius Token Factory live text model"
    };
  } catch (error) {
    console.warn(`Nebius text generation failed; using deterministic guide script. ${error.message}`);
    return {
      script: deterministicScript,
      provider: "Deterministic guide script from Nebius vision analysis"
    };
  }
}

async function startGuideCall({ phone, runId, guideScript, analysis }) {
  if (!shouldUseLiveVapi()) return mockVapiCall({ phone, guideScript });

  try {
    return await callVapiOutbound({ phone, runId, guideScript, analysis });
  } catch (error) {
    console.warn(`Vapi call failed; using mock call preview. ${error.message}`);
    return {
      ...mockVapiCall({ phone, guideScript }),
      status: "mock_completed_after_vapi_failure"
    };
  }
}

async function callVapiOutbound({ phone, runId, guideScript, analysis }) {
  const config = getVapiConfig();
  if (!config.apiKey) throw new Error("VAPI_API_KEY is not set");
  if (!config.phoneNumberId) throw new Error("VAPI_PHONE_NUMBER_ID is not set");
  if (!config.assistantId) throw new Error("VAPI_ASSISTANT_ID is not set");

  const attempts = [];
  const maxAttempts = Number(process.env.VAPI_MAX_ATTEMPTS || "2");

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    logDebug(
      `Vapi attempt ${attempt}/${maxAttempts}: calling ${maskPhone(phone)} from phoneNumberId ...${config.phoneNumberId.slice(-8)}`
    );
    const createdCall = await createVapiCall({
      phone,
      runId,
      guideScript,
      analysis,
      config,
      attempt
    });
    logDebug(
      `Vapi created call ...${String(createdCall.id || "unknown").slice(-8)} status=${createdCall.status || "created"}`
    );
    const finalCall = createdCall.id
      ? await pollVapiCall({ callId: createdCall.id, config })
      : createdCall;
    attempts.push(finalCall);
    logDebug(
      `Vapi final call ...${String(finalCall.id || "unknown").slice(-8)} status=${finalCall.status || "unknown"} endedReason=${finalCall.endedReason || "none"} transcriptChars=${(finalCall.artifact?.transcript || "").length}`
    );

    if (!isRetryableVapiFault(finalCall) || attempt === maxAttempts) {
      return summarizeVapiCall({ phone, call: finalCall, attempts });
    }

    console.warn(
      `Vapi provider fault on attempt ${attempt}; retrying call. ` +
        `${finalCall.endedReason || finalCall.status || "unknown"}`
    );
    await sleep(2000 * attempt);
  }

  return summarizeVapiCall({ phone, call: attempts.at(-1), attempts });
}

async function createVapiCall({ phone, runId, guideScript, analysis, config, attempt }) {
  const payload = {
    assistantId: config.assistantId,
    phoneNumberId: config.phoneNumberId,
    customer: {
      number: normalizePhoneNumber(phone)
    },
    assistantOverrides: {
      firstMessage: guideScript,
      variableValues: {
        run_id: runId,
        guide_context: guideScript,
        artwork_summary: analysis.visual_description,
        uncertainty_note: analysis.safety_note_about_uncertainty
      }
    },
    metadata: {
      run_id: runId,
      source: "echoguide-local-mvp",
      attempt: String(attempt)
    }
  };

  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/call`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`);
  }

  return JSON.parse(text);
}

async function pollVapiCall({ callId, config }) {
  const maxMs = Number(process.env.VAPI_POLL_SECONDS || "70") * 1000;
  const intervalMs = Number(process.env.VAPI_POLL_INTERVAL_MS || "2500");
  const deadline = Date.now() + maxMs;
  let lastCall = null;

  while (Date.now() <= deadline) {
    lastCall = await getVapiCall({ callId, config });
    logDebug(
      `Vapi poll ...${String(callId).slice(-8)} status=${lastCall.status || "unknown"} endedReason=${lastCall.endedReason || "none"} transcriptChars=${(lastCall.artifact?.transcript || "").length}`
    );
    if (isVapiTerminal(lastCall) || lastCall.artifact?.transcript) {
      return lastCall;
    }
    await sleep(intervalMs);
  }

  return lastCall || { id: callId, status: "poll_timeout" };
}

async function getVapiCall({ callId, config }) {
  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/call/${callId}`, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    }
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Vapi poll HTTP ${response.status}: ${text.slice(0, 500)}`);
  }
  return JSON.parse(text);
}

function summarizeVapiCall({ phone, call, attempts = [call] }) {
  const providerStatus = call.status || "created";
  const status = providerStatus.startsWith("vapi_")
    ? providerStatus
    : `vapi_${providerStatus}`;
  const endedReason = call.endedReason || null;
  const transcript = call.artifact?.transcript || "";
  const summaryParts = [
    `Vapi outbound call for ${maskPhone(phone)}.`,
    `Call id: ${call.id || "unknown"}.`,
    `Status: ${providerStatus}.`
  ];
  if (endedReason) summaryParts.push(`Ended reason: ${endedReason}.`);
  if (!transcript && isVapiTerminal(call)) {
    summaryParts.push("No transcript was captured.");
  }
  if (isRetryableVapiFault(call)) {
    summaryParts.push("This is a Vapi/telephony provider routing fault; try an imported Twilio number or another Vapi number.");
  }

  return {
    call_id: call.id || "vapi_call_created",
    status,
    provider_status: providerStatus,
    ended_reason: endedReason,
    started_at: call.startedAt || null,
    ended_at: call.endedAt || null,
    attempts: attempts.map((attempt, index) => ({
      attempt: index + 1,
      call_id: attempt?.id || null,
      status: attempt?.status || null,
      ended_reason: attempt?.endedReason || null,
      started_at: attempt?.startedAt || null,
      ended_at: attempt?.endedAt || null
    })),
    transcript,
    summary: summaryParts.join(" ")
  };
}

function isRetryableVapiFault(call) {
  const reason = `${call?.endedReason || ""} ${call?.error || ""}`;
  return /providerfault|sip-503|service-unavailable|503/i.test(reason);
}

function isVapiTerminal(call) {
  return ["ended", "failed", "canceled", "cancelled", "error", "poll_timeout"].includes(
    call?.status
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logDebug(message) {
  console.log(`[debug] ${message}`);
}

async function callNebiusVision(imagePath) {
  const config = getNebiusConfig();
  const imageBytes = await readFile(imagePath);
  const imageBase64 = imageBytes.toString("base64");
  const response = await nebiusChatCompletion({
    baseUrl: config.visionBaseUrl,
    model: config.visionModel,
    messages: [
      {
        role: "system",
        content:
          "You are an art museum guide. Analyze the uploaded artwork photo conservatively. Do not pretend to know the exact artwork unless visible evidence is strong. Return only valid JSON."
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Return JSON with title_guess, artist_guess, confidence low|medium|high, visual_description, likely_period_or_style, what_to_notice_first as 3 strings, 60_second_audio_tour_script, 3_follow_up_questions_the_visitor_might_ask as 3 strings, and safety_note_about_uncertainty."
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`
            }
          }
        ]
      }
    ],
    temperature: 0.2,
    max_tokens: 900
  });

  return parseJsonFromModel(getMessageContent(response));
}

async function callNebiusText({ system, user }) {
  const config = getNebiusConfig();
  const response = await nebiusChatCompletion({
    baseUrl: config.textBaseUrl,
    model: config.textModel,
    messages: [
      { role: "system", content: system },
      { role: "user", content: [{ type: "text", text: user }] }
    ],
    temperature: 0.35,
    max_tokens: 900,
    extra_body: {
      chat_template_kwargs: {
        enable_thinking: false
      }
    }
  });
  return getMessageContent(response);
}

async function nebiusChatCompletion({
  baseUrl,
  model,
  messages,
  temperature,
  max_tokens,
  extra_body
}) {
  const apiKey = process.env.NEBIUS_API_KEY;
  if (!apiKey) {
    throw new Error("NEBIUS_API_KEY is not set");
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens,
      ...(extra_body || {})
    })
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`);
  }
  return JSON.parse(text);
}

function getMessageContent(response) {
  const content = response?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => part.text || "").join("\n");
  }
  throw new Error("Nebius response did not include message content");
}

function parseJsonFromModel(content) {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1]);
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      return JSON.parse(trimmed.slice(first, last + 1));
    }
    throw new Error("Could not parse JSON from Nebius response");
  }
}

function normalizeArtworkAnalysis(raw) {
  const fallback = mockNebiusVisionAnalysis();
  return {
    title_guess: stringOr(raw.title_guess, fallback.title_guess),
    artist_guess: stringOr(raw.artist_guess, fallback.artist_guess),
    confidence: ["low", "medium", "high"].includes(raw.confidence)
      ? raw.confidence
      : "low",
    visual_description: stringOr(
      raw.visual_description,
      fallback.visual_description
    ),
    likely_period_or_style: stringOr(
      raw.likely_period_or_style,
      fallback.likely_period_or_style
    ),
    what_to_notice_first: arrayOfStringsOr(
      raw.what_to_notice_first,
      fallback.what_to_notice_first
    ).slice(0, 3),
    "60_second_audio_tour_script": stringOr(
      raw["60_second_audio_tour_script"],
      fallback["60_second_audio_tour_script"]
    ),
    "3_follow_up_questions_the_visitor_might_ask": arrayOfStringsOr(
      raw["3_follow_up_questions_the_visitor_might_ask"],
      fallback["3_follow_up_questions_the_visitor_might_ask"]
    ).slice(0, 3),
    safety_note_about_uncertainty: stringOr(
      raw.safety_note_about_uncertainty,
      fallback.safety_note_about_uncertainty
    )
  };
}

function shouldUseLiveNebius() {
  return process.env.MOCK_NEBIUS === "false" && Boolean(process.env.NEBIUS_API_KEY);
}

function shouldUseLiveVapi() {
  return process.env.MOCK_VAPI === "false" && Boolean(process.env.VAPI_API_KEY);
}

function getNebiusConfig() {
  return {
    visionBaseUrl:
      process.env.NEBIUS_VISION_BASE_URL ||
      process.env.NEBIUS_BASE_URL ||
      "https://api.tokenfactory.nebius.com/v1/",
    textBaseUrl:
      process.env.NEBIUS_TEXT_BASE_URL ||
      "https://api.tokenfactory.us-central1.nebius.com/v1/",
    visionModel:
      process.env.NEBIUS_MODEL_VISION || "Qwen/Qwen2.5-VL-72B-Instruct",
    textModel: process.env.NEBIUS_MODEL_TEXT || "Qwen/Qwen3.5-397B-A17B"
  };
}

function getVapiConfig() {
  return {
    baseUrl: process.env.VAPI_BASE_URL || "https://api.vapi.ai",
    apiKey: process.env.VAPI_API_KEY,
    assistantId: process.env.VAPI_ASSISTANT_ID,
    phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID
  };
}

function normalizePhoneNumber(phone) {
  const raw = String(phone || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+") && digits.length >= 10) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  throw new Error("Phone number must be a valid US demo phone number.");
}

function maskPhone(phone) {
  const normalized = normalizePhoneNumber(phone);
  return `${normalized.slice(0, 3)}******${normalized.slice(-2)}`;
}

function stringOr(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function arrayOfStringsOr(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  const strings = value.filter((item) => typeof item === "string" && item.trim());
  return strings.length ? strings : fallback;
}

function buildGuideScriptFromAnalysis(analysis) {
  const opening = buildOpeningLine(analysis);
  const notices = arrayOfStringsOr(analysis.what_to_notice_first, []).slice(0, 3);
  const noticeSentence = notices.length
    ? `First, notice ${joinAsSentenceList(notices.map(cleanNoticeFragment))}.`
    : "First, notice how the composition directs your attention before you try to name the subject.";
  const style = analysis.likely_period_or_style
    ? `Stylistically, it points toward ${analysis.likely_period_or_style}, especially in the way light, shadow, and surface texture shape the mood.`
    : "Stylistically, the strongest clue is the way light, shadow, and surface texture shape the mood.";
  const uncertainty = analysis.safety_note_about_uncertainty
    ? `One caveat: ${lowercaseFirst(analysis.safety_note_about_uncertainty)}`
    : "One caveat: this is a visual reading, not a catalog authentication.";

  return [
    opening,
    noticeSentence,
    style,
    "A useful question to ask is what this image wants you to feel before you name any object: atmosphere, stillness, movement, or memory.",
    uncertainty
  ].join(" ");
}

function buildOpeningLine(analysis) {
  const title = analysis.title_guess || "";
  const artist = analysis.artist_guess || "";
  const hasTitle = title && !/^unknown/i.test(title);
  const hasArtist = artist && !/^unknown/i.test(artist);

  if (hasTitle && hasArtist) {
    return `This looks like ${title}, likely by ${artist}.`;
  }
  if (hasArtist) {
    return `This looks like a work likely by ${artist}.`;
  }
  if (hasTitle) {
    return `This looks like ${title}.`;
  }
  return "This looks like an artwork built around light, color, and the act of looking.";
}

function firstSentence(text) {
  const match = String(text || "").trim().match(/^.*?[.!?](?:\s|$)/);
  return match ? match[0].trim() : String(text || "").trim().slice(0, 180);
}

function joinAsSentenceList(items) {
  if (items.length <= 1) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function cleanNoticeFragment(item) {
  return String(item)
    .trim()
    .replace(/[.!?]\s*$/, "")
    .replace(/^notice\s+/i, "")
    .replace(/^the\s+/i, "the ");
}

function lowercaseFirst(value) {
  const text = String(value || "").trim();
  return text ? text[0].toLowerCase() + text.slice(1) : text;
}

function hasUncertaintyLanguage(value) {
  if (typeof value !== "string") return false;
  return /uncertain|not guarantee|limited|educated guess|without catalog|cannot (be )?confirm|cannot be confirmed|should be confirmed|further verification|may vary|subject to scholarly debate|attribution/i.test(
    value
  );
}

function mockNebiusVisionAnalysis() {
  return {
    title_guess: "Water Lilies",
    artist_guess: "Claude Monet",
    confidence: "medium",
    visual_description:
      "A nearly all-over view of water lilies floating across a reflective pond. The surface is broken into loose patches of green, blue, violet, and pale pink, with brushwork that makes the water feel both flat and shimmering.",
    likely_period_or_style:
      "French Impressionism, especially Monet's late Water Lilies series from his Giverny garden.",
    what_to_notice_first: [
      "The painting has almost no horizon, so the pond becomes the whole visual world.",
      "The lilies are not outlined sharply; they appear through color patches and quick brushwork.",
      "The reflections make it hard to separate water, sky, plants, and light."
    ],
    "60_second_audio_tour_script":
      "This looks like Water Lilies, likely by Claude Monet. First, notice how the pond fills the entire frame: there is no clear horizon, no stable foreground, and almost no traditional subject beyond light on water. Monet is asking you to slow down and look at perception itself. The lilies, reflections, and blue-green surface are built from loose strokes, so the image changes as your eye moves. Up close, it can feel abstract; from farther away, the garden reappears. One caveat: this sample is a visual reading and not a museum catalog authentication.",
    "3_follow_up_questions_the_visitor_might_ask": [
      "Why did Monet paint water lilies so many times?",
      "Why is there no clear horizon?",
      "How does Impressionism change the way I should look at this?"
    ],
    safety_note_about_uncertainty:
      "This appears consistent with Monet's Water Lilies, but exact title, date, and collection should be confirmed against museum catalog metadata."
  };
}

function mockVapiCall({ phone, guideScript }) {
  return {
    call_id: "vapi_mock_call_001",
    status: "mock_completed",
    transcript: [
      `Assistant: ${guideScript}`,
      "Visitor: What should I notice first?",
      "Assistant: Start with the first thing your eye lands on, then notice how color, light, and composition guide you around the image."
    ].join("\n"),
    summary: `Mock call to ${maskPhone(phone)}: the guide explained the artwork identification, visual details, likely style, and uncertainty. The visitor asked what to notice first.`
  };
}

function renderVisitCardHtml(artifact, { imageSrc = artifact.image_url } = {}) {
  const checks = artifact.rubric_result.checks
    .map(
      (check) => `<li class="${check.passed ? "pass" : "fail"}">
        <span>${escapeHtml(check.passed ? "PASS" : "FAIL")}</span>
        <strong>${escapeHtml(check.name)}</strong>
        <small>${escapeHtml(check.description)}</small>
      </li>`
    )
    .join("");

  const noticeItems = artifact.artwork_analysis.what_to_notice_first
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  const questions = artifact.suggested_questions
    .map((question) => `<li>${escapeHtml(question)}</li>`)
    .join("");

  const limitations = artifact.known_limitations
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mira Legacy Visit Card</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #171717;
      --muted: #63615c;
      --line: #d9d4ca;
      --paper: #f7f3eb;
      --panel: #fffdf8;
      --accent: #8a3f2b;
      --green: #196b44;
      --red: #a1362f;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--paper);
      color: var(--ink);
      line-height: 1.45;
    }
    main {
      width: min(1120px, calc(100vw - 32px));
      margin: 32px auto;
      display: grid;
      grid-template-columns: minmax(280px, 0.9fr) minmax(320px, 1.1fr);
      gap: 24px;
      align-items: start;
    }
    .artwork, .card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: 0 16px 40px rgb(40 31 22 / 0.08);
    }
    .artwork { padding: 16px; position: sticky; top: 24px; }
    .artwork img {
      width: 100%;
      aspect-ratio: 4 / 5;
      object-fit: cover;
      border-radius: 6px;
      display: block;
      background: #e7dfd3;
    }
    .artwork p, .meta {
      margin: 12px 0 0;
      color: var(--muted);
      font-size: 13px;
    }
    .card { padding: 28px; }
    h1 { margin: 0 0 8px; font-size: clamp(32px, 6vw, 62px); line-height: 0.95; letter-spacing: 0; }
    h2 { margin: 30px 0 10px; font-size: 18px; }
    p { margin: 0 0 14px; }
    ul { margin: 10px 0 0; padding-left: 20px; }
    li { margin: 8px 0; }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--green);
      font-weight: 700;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .status::before {
      content: "";
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: var(--green);
    }
    .script {
      border-left: 4px solid var(--accent);
      padding: 14px 0 14px 18px;
      color: #302a24;
      background: #fbf4e8;
    }
    .checks {
      padding: 0;
      list-style: none;
    }
    .checks li {
      display: grid;
      grid-template-columns: 52px 1fr;
      gap: 2px 12px;
      padding: 12px 0;
      border-top: 1px solid var(--line);
    }
    .checks span {
      grid-row: span 2;
      font-size: 12px;
      font-weight: 800;
      color: var(--green);
      padding-top: 2px;
    }
    .checks .fail span { color: var(--red); }
    .checks small { color: var(--muted); }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 13px;
      background: #eee6d8;
      padding: 2px 5px;
      border-radius: 4px;
    }
    pre {
      white-space: pre-wrap;
      border: 1px solid var(--line);
      background: #fbf8f1;
      border-radius: 6px;
      padding: 14px;
      overflow-x: auto;
      font-size: 13px;
    }
    @media (max-width: 760px) {
      main { grid-template-columns: 1fr; margin: 16px auto; }
      .artwork { position: static; }
      .card { padding: 22px; }
    }
  </style>
</head>
<body>
  <main>
    <section class="artwork">
      <img src="${escapeHtml(imageSrc)}" alt="Sample artwork uploaded to Mira">
      <p>Input: <code>${escapeHtml(artifact.input_summary.source)}</code></p>
      <p>Run: <code>${escapeHtml(artifact.run_id)}</code></p>
    </section>
    <section class="card">
      <div class="status">${escapeHtml(artifact.call_status)} · verifier ${artifact.rubric_result.passed ? "passed" : "failed"}</div>
      <h1>Mira Legacy Visit Card</h1>
      <p class="meta">Created ${escapeHtml(artifact.created_at)}</p>

      <h2>Artwork Analysis</h2>
      <p><strong>${escapeHtml(artifact.artwork_analysis.title_guess)}</strong> by ${escapeHtml(artifact.artwork_analysis.artist_guess)}. Confidence: ${escapeHtml(artifact.artwork_analysis.confidence)}.</p>
      <p>${escapeHtml(artifact.artwork_analysis.visual_description)}</p>
      <p>${escapeHtml(artifact.artwork_analysis.likely_period_or_style)}</p>
      <ul>${noticeItems}</ul>

      <h2>Guide Script</h2>
      <p class="script">${escapeHtml(artifact.guide_script)}</p>

      <h2>Suggested Follow-ups</h2>
      <ul>${questions}</ul>

      <h2>Call Summary</h2>
      <p>${escapeHtml(artifact.summary)}</p>
      <pre>${escapeHtml(artifact.transcript || "No transcript captured yet.")}</pre>

      <h2>Evidence</h2>
      <p>Nebius: ${escapeHtml(artifact.evidence.vision_provider)}</p>
      <p>Vapi: ${escapeHtml(artifact.evidence.voice_provider)}</p>
      <p>InsForge: ${escapeHtml(artifact.evidence.backend_provider)}</p>

      <h2>Verifier</h2>
      <ul class="checks">${checks}</ul>

      <h2>Known Limitations</h2>
      <ul>${limitations}</ul>
    </section>
  </main>
</body>
</html>`;
}

function compactTimestamp(date) {
  return date.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
