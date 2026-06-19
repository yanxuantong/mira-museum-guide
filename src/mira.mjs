import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { deterministicGuidePreview, generateLiveGuidePreview, identifyArtworkWithLiveLlm } from "./guide-provider.mjs";

const STATUS_STEPS = [
  {
    status: "preparing",
    label: "Reading the image",
    detail: "Analyzing the uploaded photo."
  },
  {
    status: "matching",
    label: "Matching it to Reflections of Light",
    detail: "Using seeded Multi Modal Museum exhibition context."
  },
  {
    status: "calling",
    label: "Preparing your guide",
    detail: "Creating a mocked Vapi guide call."
  },
  {
    status: "in_progress",
    label: "Calling your phone",
    detail: "Simulating the visitor voice interaction."
  },
  {
    status: "summarizing",
    label: "Summarizing",
    detail: "Updating the phone-linked Visit Card."
  },
  {
    status: "completed",
    label: "Completed",
    detail: "Verifier checks are attached."
  }
];

export async function loadMiraContext(rootDir) {
  return JSON.parse(
    await readFile(path.join(rootDir, "sample-data", "multimodal-museum-context.json"), "utf8")
  );
}

export async function createMiraVisitCard({
  rootDir,
  phone,
  language = "en",
  imageName = "uploaded image",
  imageDataUrl = "",
  mode = "mock",
  liveLlm = process.env.MOCK_NEBIUS !== "true"
}) {
  const context = await loadMiraContext(rootDir);
  const createdAt = new Date();
  const normalizedPhone = normalizePhoneNumber(phone);
  const phoneKey = hashPhone(normalizedPhone);
  const visitorId = `phone_${phoneKey}`;
  const visitCardId = `vc_${phoneKey}`;
  const artifactsDir = path.join(rootDir, "artifacts", "mira-live", visitCardId);
  await mkdir(artifactsDir, { recursive: true });

  let imagePath = "sample-data/artwork.jpg";
  let effectiveImageDataUrl = imageDataUrl;
  if (imageDataUrl.startsWith("data:image/")) {
    const extension = imageDataUrl.slice(11, imageDataUrl.indexOf(";")) || "png";
    const base64 = imageDataUrl.split(",")[1] || "";
    imagePath = path.join("artifacts", "mira-live", visitCardId, `uploaded.${extension}`);
    await writeFile(path.join(rootDir, imagePath), Buffer.from(base64, "base64"));
  } else {
    const sampleBytes = await readFile(path.join(rootDir, "sample-data", "artwork.jpg"));
    effectiveImageDataUrl = `data:image/jpeg;base64,${sampleBytes.toString("base64")}`;
  }

  let artworkIdentification = null;
  let artworkIdentificationError = null;
  if (liveLlm) {
    try {
      artworkIdentification = await identifyArtworkWithLiveLlm({
        context,
        imageDataUrl: effectiveImageDataUrl,
        imageName
      });
    } catch (error) {
      artworkIdentificationError = error instanceof Error ? error.message : "Unknown artwork identification error";
    }
  }
  const imageSummary = artworkIdentification
    ? `Likely artwork: ${artworkIdentification.likely_title || "unknown title"} by ${artworkIdentification.likely_artist || "unknown artist"}; confidence ${artworkIdentification.confidence || "low"}. Evidence: ${(artworkIdentification.visual_evidence || []).join("; ")}`
    : "Mira reads the uploaded image as a water, light, and reflection scene, then grounds it in the seeded Multi Modal Museum Reflections of Light context.";
  let guidePreview;
  let llmError = null;
  if (liveLlm) {
    try {
      guidePreview = await generateLiveGuidePreview({ context, language, imageName, imageSummary, now: createdAt });
    } catch (error) {
      llmError = error instanceof Error ? error.message : "Unknown live LLM error";
      guidePreview = deterministicGuidePreview({ context, language });
    }
  } else {
    guidePreview = deterministicGuidePreview({ context, language });
  }

  const card = {
    schema: "mira.visit_card.v1",
    visit_card_id: visitCardId,
    visitor_id: visitorId,
    phone_key: phoneKey,
    masked_phone: maskPhone(normalizedPhone),
    created_at: createdAt.toISOString(),
    updated_at: createdAt.toISOString(),
    status: "preparing",
    exhibition: {
      museum: context.museum,
      name: context.exhibition,
      display_name: context.display_name,
      context_id: context.context_id
    },
    language: buildLanguageRecord(context, language),
    image_request: {
      request_id: `req_${createdAt.getTime()}`,
      source: imagePath,
      uploaded_filename: imageName || "uploaded image",
      captured_or_uploaded: imageDataUrl ? "uploaded_or_captured" : "sample_replay",
      received_at: createdAt.toISOString(),
      analysis_summary: ""
    },
    artwork_identification: artworkIdentification
      ? {
          likely_title: artworkIdentification.likely_title || "Unknown",
          likely_artist: artworkIdentification.likely_artist || "Unknown",
          confidence: artworkIdentification.confidence || "low",
          visual_evidence: artworkIdentification.visual_evidence || [],
          uncertainty_note: artworkIdentification.uncertainty_note || "",
          provider: artworkIdentification.provider,
          model: artworkIdentification.model,
          response_id: artworkIdentification.response_id || null
        }
      : {
          likely_title: "Unknown",
          likely_artist: "Unknown",
          confidence: "low",
          visual_evidence: [],
          uncertainty_note: artworkIdentificationError || "Live image identification was not run.",
          provider: liveLlm ? "Nebius Token Factory" : "deterministic fallback",
          model: liveLlm ? process.env.NEBIUS_MODEL_VISION || "Qwen/Qwen2.5-VL-72B-Instruct" : "local-fallback",
          response_id: null
        },
    voice_interaction: {
      provider: "vapi",
      mode,
      call_id: `vapi_mock_${visitCardId}`,
      live_phone_call_happened: false,
      started_at: null,
      ended_at: null,
      summary: "",
      transcript: [],
      visitor_questions: [],
      first_message: guidePreview.first_message
    },
    provider_modes: {
      llm: guidePreview.provider_mode,
      vapi: mode
    },
    llm_evidence: {
      provider: guidePreview.provider,
      model: guidePreview.model,
      response_id: guidePreview.response_id,
      generated_at: guidePreview.created_at,
      error: llmError
    },
    guide_summary: "",
    next_recommendation: null,
    request_timeline: [
      {
        at: createdAt.toISOString(),
        status: "preparing",
        label: "Reading the image"
      }
    ],
    evidence: [
      {
        type: "seeded_context",
        path: "sample-data/multimodal-museum-context.json",
        quote: "This fictional exhibition uses original demo copy about light, water, atmosphere, reflection, and architecture."
      },
      {
        type: "input_image",
        path: imagePath
      },
      {
        type: "mock_vapi_event",
        id: `vapi_mock_${visitCardId}`
      },
      {
        type: guidePreview.provider_mode === "live" ? "live_llm_response" : "mock_llm_response",
        provider: guidePreview.provider,
        model: guidePreview.model,
        response_id: guidePreview.response_id || "none"
      },
      {
        type: artworkIdentification ? "live_artwork_identification" : "artwork_identification_unavailable",
        provider: artworkIdentification?.provider || "none",
        model: artworkIdentification?.model || process.env.NEBIUS_MODEL_VISION || "none",
        response_id: artworkIdentification?.response_id || "none",
        error: artworkIdentificationError
      }
    ],
    known_limitations: context.limitations,
    verifier_result: {
      passed: false,
      checks: []
    },
    _simulation: {
      created_ms: createdAt.getTime(),
      step_index: 0
    }
  };

  await persistVisitCard(rootDir, card);
  return publicCard(card);
}

export async function getMiraVisitCard(rootDir, visitCardId) {
  const cardPath = path.join(rootDir, "artifacts", "mira-live", visitCardId, "visit-card.json");
  const card = JSON.parse(await readFile(cardPath, "utf8"));
  const nextCard = advanceMiraVisitCard(card);
  await persistVisitCard(rootDir, nextCard);
  return publicCard(nextCard);
}

export async function loadVisitCard(rootDir, artifactPath = "sample-data/sample-visit-card.json") {
  return JSON.parse(await readFile(path.resolve(rootDir, artifactPath), "utf8"));
}

export function verifyMiraVisitCard(card) {
  const checks = [
    {
      name: "phone_visit_card_exists",
      passed: Boolean(
        card?.schema === "mira.visit_card.v1" &&
          card?.visit_card_id &&
          card?.visitor_id?.startsWith("phone_") &&
          card?.masked_phone &&
          card?.phone_key
      ),
      evidence: ["visit_card_id", "visitor_id", "masked_phone"],
      description: "A stable Visit Card exists and is keyed by normalized phone."
    },
    {
      name: "has_image_request",
      passed: Boolean(
        card?.image_request?.request_id &&
          card?.image_request?.source &&
          card?.image_request?.received_at &&
          card?.evidence?.some((item) => item.type === "input_image" && item.path)
      ),
      evidence: ["image_request", "evidence.input_image"],
      description: "The Visit Card records a real image request and input image evidence."
    },
    {
      name: "has_voice_interaction",
      passed: Boolean(
        card?.voice_interaction?.provider === "vapi" &&
          card?.voice_interaction?.mode &&
          card?.voice_interaction?.call_id &&
          card?.voice_interaction?.transcript?.some((turn) => turn.speaker === "visitor") &&
          card?.evidence?.some((item) => item.type === "mock_vapi_event" || item.type === "vapi_call")
      ),
      evidence: ["voice_interaction.transcript", "evidence.mock_vapi_event"],
      description: "The card includes an actual mocked or live voice interaction record."
    },
    {
      name: "has_multilingual_record",
      passed: Boolean(
          card?.language?.requested &&
          card?.language?.label &&
          card?.language?.guide_copy_rule &&
          (card.language.requested === "en" ||
            card?.voice_interaction?.transcript?.some((turn) => /Mandarin|中文|English|Spanish|Español/i.test(turn.text)))
      ),
      evidence: ["language", "voice_interaction.transcript"],
      description: "The requested language and guide-language behavior are recorded."
    },
    {
      name: "has_next_recommendation",
      passed: Boolean(
        card?.next_recommendation?.title &&
          card?.next_recommendation?.description &&
          card?.next_recommendation?.reason
      ),
      evidence: ["next_recommendation"],
      description: "The guide recommends a grounded next stop in the exhibition."
    },
    {
      name: "live_visit_card_updated",
      passed: Boolean(
        card?.status === "completed" &&
          card?.updated_at &&
          card?.created_at &&
          card.updated_at !== card.created_at &&
          (card?.request_timeline || []).length >= 3 &&
          card.request_timeline.some((item) => item.status === "calling") &&
          card.request_timeline.some((item) => item.status === "completed")
      ),
      evidence: ["status", "updated_at", "request_timeline"],
      description: "The Visit Card moved through multiple states and was not only self-asserted."
    }
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks
  };
}

export async function writeVerifiedVisitCard(rootDir, card, artifactPath) {
  const verified = {
    ...card,
    verifier_result: verifyMiraVisitCard(card)
  };
  await writeJson(path.resolve(rootDir, artifactPath), publicCard(verified));
  return verified;
}

export function statusSteps() {
  return STATUS_STEPS;
}

async function persistVisitCard(rootDir, card) {
  const verified = {
    ...card,
    verifier_result: verifyMiraVisitCard(card)
  };
  const cardDir = path.join(rootDir, "artifacts", "mira-live", verified.visit_card_id);
  await mkdir(cardDir, { recursive: true });
  await writeJson(path.join(cardDir, "visit-card.json"), publicCard(verified));
  await writeJson(path.join(rootDir, "artifacts", "latest-visit-card.json"), publicCard(verified));
  return verified;
}

function advanceMiraVisitCard(card) {
  const elapsedMs = Date.now() - (card._simulation?.created_ms || Date.parse(card.created_at));
  const stepIndex = Math.min(STATUS_STEPS.length - 1, Math.floor(elapsedMs / 900));
  if (stepIndex <= (card._simulation?.step_index || 0)) return card;

  const now = new Date().toISOString();
  const next = {
    ...card,
    status: STATUS_STEPS[stepIndex].status,
    updated_at: now,
    _simulation: {
      ...card._simulation,
      step_index: stepIndex
    }
  };

  for (let index = (card._simulation?.step_index || 0) + 1; index <= stepIndex; index += 1) {
    next.request_timeline.push({
      at: now,
      status: STATUS_STEPS[index].status,
      label: STATUS_STEPS[index].label
    });
  }

  if (stepIndex >= 1) {
    next.image_request.analysis_summary =
      next.artwork_identification?.likely_title && next.artwork_identification.likely_title !== "Unknown"
        ? `Mira identifies the image as likely ${next.artwork_identification.likely_title} by ${next.artwork_identification.likely_artist}, with ${next.artwork_identification.confidence} confidence.`
        : "Mira reads the uploaded image as a water, light, and reflection scene, then grounds it in the seeded Multi Modal Museum Reflections of Light context.";
  }
  if (stepIndex >= 2) {
    next.voice_interaction.started_at ||= now;
    next.guide_summary = next.voice_interaction.first_message ||
      "Mira connects the visitor image to impressionist studies of light and water and explains how light, water, haze, and repeated architecture shape the exhibition story.";
  }
  if (stepIndex >= 3 && next.voice_interaction.transcript.length === 0) {
    next.voice_interaction.transcript = buildTranscript(next.language.requested);
    next.voice_interaction.visitor_questions = [
      "What should I notice first?",
      next.language.requested === "zh" ? "Explain this in Mandarin." : "What should I see next?"
    ];
    next.voice_interaction.summary =
      "Mock Vapi guide call delivered a short exhibition-grounded explanation and captured a visitor follow-up question.";
  }
  if (stepIndex >= 4) {
    next.next_recommendation = {
      title: "Compare another waterfront view",
      description:
        "Find a second view of a waterfront facade or a reflective architectural study and compare how much of the scene is built from water and reflected light.",
      reason: "The seeded context emphasizes repeated views and changing atmosphere."
    };
  }
  if (stepIndex >= 5) {
    next.voice_interaction.ended_at ||= now;
    next.status = "completed";
  }

  return next;
}

function buildTranscript(language) {
  if (language === "zh") {
    return [
      {
        speaker: "assistant",
        text: "This is Mira calling for Multi Modal Museum: Reflections of Light. Start with water, reflection, and the softened edges of the architecture."
      },
      {
        speaker: "visitor",
        text: "Explain this in Mandarin."
      },
      {
        speaker: "assistant",
        text: "先看水面和建筑边缘的光。这个展览关注的不是精确轮廓，而是空气、倒影和颜色怎样改变你看到的空间。"
      }
    ];
  }
  return [
    {
      speaker: "assistant",
      text: "This is Mira calling for Multi Modal Museum: Reflections of Light. Start with water, reflection, and the softened edges of the architecture."
    },
    {
      speaker: "visitor",
      text: "What should I notice first?"
    },
    {
      speaker: "assistant",
      text: "Notice how public-domain impressionist painters let color and haze do the work that a hard outline might do in a more descriptive view of water and light."
    }
  ];
}

function buildLanguageRecord(context, language) {
  const labels = {
    en: "English",
    zh: "Mandarin",
    es: "Spanish"
  };
  return {
    requested: language,
    label: labels[language] || "English",
    guide_copy_rule: context.language_rules[language] || context.language_rules.en
  };
}

function publicCard(card) {
  const { _simulation, ...publicFields } = card;
  return publicFields;
}

function normalizePhoneNumber(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (String(phone || "").trim().startsWith("+") && digits.length >= 10) return `+${digits}`;
  throw new Error("Enter a valid US demo phone number.");
}

function maskPhone(phone) {
  return `${phone.slice(0, 3)}******${phone.slice(-2)}`;
}

function hashPhone(phone) {
  return createHash("sha256").update(String(phone)).digest("hex").slice(0, 12);
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
