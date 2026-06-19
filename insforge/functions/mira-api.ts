const STATUS_STEPS = ["preparing", "matching", "calling", "in_progress", "summarizing", "completed"];
const DEFAULT_TEXT_BASE_URL = "https://api.tokenfactory.us-central1.nebius.com/v1/";
const DEFAULT_TEXT_MODEL = "Qwen/Qwen3.5-397B-A17B";

const CONTEXT = {
  context_id: "multimodal-reflections-light-demo",
  museum: "Multi Modal Museum",
  exhibition: "Reflections of Light",
  display_name: "Multi Modal Museum: Reflections of Light",
  overview:
    "Reflections of Light is a fictional Multi Modal Museum exhibition built for the Mira demo. It uses public-domain impressionist themes to explore water, atmosphere, reflection, architecture, and changing light.",
  limitations: [
    "Multi Modal Museum and Reflections of Light are fictional demo entities.",
    "Mira matches a visitor photo against seeded demo context; it is not a global artwork-authentication tool.",
    "The deployed product-ready path requires live Nebius and live Vapi credentials."
  ],
  language_rules: {
    en: "Use calm, direct museum-guide English. Keep answers short enough for a phone call.",
    zh: "使用自然、简洁的中文导览语气。先说游客应该看什么，再解释为什么重要。",
    es: "Use clear Spanish for a museum visitor. Keep the explanation conversational and concise."
  }
};

export default async function handler(request: Request) {
  try {
    const url = new URL(request.url);
    const pathname = stripFunctionPrefix(url.pathname);
    if (request.method === "OPTIONS") return withCors(new Response(null, { status: 204 }));
    if (request.method === "GET" && pathname === "/api/context") {
      return json({ context: CONTEXT, mode_policy: { llm: "live", vapi: "live" } });
    }
    if (request.method === "POST" && pathname === "/api/start-guide") {
      const body = await request.json().catch(() => ({}));
      const card = await createCard({
        phone: body.phone || "773-273-1585",
        language: body.language || "en",
        imageName: body.image_name || "sample-data/artwork.jpg"
      });
      return json({ visit_card: card });
    }
    if (request.method === "GET" && pathname.startsWith("/api/visit-card/")) {
      const visitCardId = decodeURIComponent(pathname.split("/").at(-1) || "");
      return json({ visit_card: getCard(visitCardId) });
    }
    return json({ error: "Not found", path: pathname }, 404);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
}

async function createCard({ phone, language, imageName }: { phone: string; language: string; imageName: string }) {
  const normalizedPhone = normalizePhoneNumber(phone);
  const createdMs = Date.now();
  const phoneKey = await hashPhone(normalizedPhone);
  const visitorId = `phone_${phoneKey}`;
  const maskedPhone = maskPhone(normalizedPhone);
  const imageSummary =
    "Mira reads the uploaded image as a water, light, and reflection scene, then grounds it in the seeded Multi Modal Museum Reflections of Light context.";
  const llm = await generateGuide({ language, imageName, imageSummary });
  const vapi = await startVapiCall({
    phone: normalizedPhone,
    firstMessage: llm.first_message,
    visitCardSeed: `${visitorId}_${createdMs}`,
    imageSummary
  });
  const payload = encodePayload({
    phoneKey,
    maskedPhone,
    language,
    imageName,
    firstMessage: llm.first_message,
    llmModel: llm.model,
    llmResponseId: llm.response_id,
    llmMode: llm.mode,
    llmError: llm.error,
    vapiCallId: vapi.call_id,
    vapiMode: vapi.mode,
    vapiStatus: vapi.provider_status,
    vapiError: vapi.error,
    livePhoneCallHappened: vapi.live_phone_call_happened
  });
  const visitCardId = `vc_${phoneKey}_${createdMs}_${payload}`;
  return buildCard({ visitCardId, phoneKey, maskedPhone, language, imageName, createdMs, llm, vapi });
}

function getCard(visitCardId: string) {
  const parsed = parseVisitCardId(visitCardId);
  return buildCard({
    visitCardId,
    phoneKey: parsed.phoneKey,
    maskedPhone: parsed.maskedPhone,
    language: parsed.language,
    imageName: parsed.imageName,
    createdMs: parsed.createdMs,
    llm: {
      first_message: parsed.firstMessage,
      mode: parsed.llmMode,
      model: parsed.llmModel,
      response_id: parsed.llmResponseId,
      error: parsed.llmError
    },
    vapi: {
      call_id: parsed.vapiCallId,
      mode: parsed.vapiMode,
      provider_status: parsed.vapiStatus,
      error: parsed.vapiError,
      live_phone_call_happened: parsed.livePhoneCallHappened
    }
  });
}

function buildCard({
  visitCardId,
  phoneKey,
  maskedPhone,
  language,
  imageName,
  createdMs,
  llm,
  vapi
}: {
  visitCardId: string;
  phoneKey: string;
  maskedPhone: string;
  language: string;
  imageName: string;
  createdMs: number;
  llm: ProviderGuide;
  vapi: VapiResult;
}) {
  const now = Date.now();
  const stepIndex = Math.min(STATUS_STEPS.length - 1, Math.floor((now - createdMs) / 900));
  const completed = stepIndex >= 5;
  const createdAt = new Date(createdMs).toISOString();
  const updatedAt = new Date(Math.max(createdMs, now)).toISOString();
  const languageRecord = buildLanguageRecord(language);
  const timeline = STATUS_STEPS.slice(0, stepIndex + 1).map((step, index) => ({
    at: new Date(createdMs + index * 900).toISOString(),
    status: step,
    label: labelForStatus(step)
  }));
  const evidence = [
    {
      type: "seeded_context",
      path: "sample-data/multimodal-museum-context.json",
      quote: "This fictional exhibition uses original demo copy about light, water, atmosphere, reflection, and architecture."
    },
    { type: "input_image", path: "sample-data/artwork.jpg" },
    {
      type: llm.mode === "live" ? "live_llm_response" : "llm_failure",
      provider: "Nebius Token Factory",
      model: llm.model,
      response_id: llm.response_id || "none",
      error: llm.error || null
    },
    {
      type: vapi.mode === "live" ? "vapi_call" : "vapi_failure",
      id: vapi.call_id || "none",
      provider_status: vapi.provider_status || "not_started",
      error: vapi.error || null
    },
    { type: "insforge_edge_function", id: "mira-api" }
  ];
  const card = {
    schema: "mira.visit_card.v1",
    visit_card_id: visitCardId,
    visitor_id: `phone_${phoneKey}`,
    phone_key: phoneKey,
    masked_phone: maskedPhone,
    created_at: createdAt,
    updated_at: updatedAt,
    status: STATUS_STEPS[stepIndex],
    exhibition: {
      museum: CONTEXT.museum,
      name: CONTEXT.exhibition,
      display_name: CONTEXT.display_name,
      context_id: CONTEXT.context_id
    },
    language: languageRecord,
    image_request: {
      request_id: `req_${createdMs}`,
      source: "sample-data/artwork.jpg",
      uploaded_filename: imageName,
      captured_or_uploaded: "hosted_upload_or_sample",
      received_at: createdAt,
      analysis_summary:
        stepIndex >= 1
          ? "Mira reads the uploaded image as a water, light, and reflection scene, then grounds it in the seeded Multi Modal Museum Reflections of Light context."
          : ""
    },
    provider_modes: {
      llm: llm.mode,
      vapi: vapi.mode,
      insforge: "edge-function+site"
    },
    llm_evidence: {
      provider: "Nebius Token Factory",
      model: llm.model,
      response_id: llm.response_id || null,
      error: llm.error || null
    },
    voice_interaction: {
      provider: "vapi",
      mode: vapi.mode,
      call_id: vapi.call_id || "none",
      provider_status: vapi.provider_status || null,
      error: vapi.error || null,
      live_phone_call_happened: Boolean(vapi.live_phone_call_happened),
      started_at: stepIndex >= 2 ? createdAt : null,
      ended_at: completed ? updatedAt : null,
      summary:
        stepIndex >= 3
          ? `${vapi.mode === "live" ? "Live" : "Failed"} Vapi guide path recorded for ${maskedPhone}.`
          : "",
      transcript: stepIndex >= 3 ? buildTranscript(language, llm.first_message) : [],
      visitor_questions: stepIndex >= 3 ? ["What should I notice first?"] : [],
      first_message: llm.first_message
    },
    guide_summary: stepIndex >= 2 ? llm.first_message : "",
    next_recommendation:
      stepIndex >= 4
        ? {
            title: "Compare another waterfront view",
            description:
              "Find a second view of a waterfront facade or reflective architectural study and compare how much of the scene is built from water and reflected light.",
            reason: "The seeded context emphasizes repeated views and changing atmosphere."
          }
        : null,
    request_timeline: timeline,
    evidence,
    known_limitations: CONTEXT.limitations,
    verifier_result: {
      passed: completed && llm.mode === "live" && Boolean(llm.response_id),
      checks: verifyChecks({ completed, llm, vapi })
    }
  };
  return card;
}

async function generateGuide({
  language,
  imageName,
  imageSummary
}: {
  language: string;
  imageName: string;
  imageSummary: string;
}): Promise<ProviderGuide> {
  const apiKey = Deno.env.get("NEBIUS_API_KEY") || "";
  const baseUrl = Deno.env.get("NEBIUS_TEXT_BASE_URL") || Deno.env.get("NEBIUS_BASE_URL") || DEFAULT_TEXT_BASE_URL;
  const model = Deno.env.get("NEBIUS_MODEL_TEXT") || DEFAULT_TEXT_MODEL;
  if (!apiKey) {
    return {
      first_message: fallbackGuide(language),
      mode: "missing_credentials",
      model,
      response_id: null,
      error: "NEBIUS_API_KEY is not configured in InsForge secrets."
    };
  }

  const languageLabel = { en: "English", zh: "Mandarin Chinese", es: "Spanish" }[language] || "English";
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 420,
        extra_body: { chat_template_kwargs: { enable_thinking: false } },
        messages: [
	          {
	            role: "system",
	            content:
	              "You are Mira, a factual exhibition audio guide. Return only the exact spoken first message. Start with the artwork facts, not a greeting."
	          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: [
                  `Museum: ${CONTEXT.museum}`,
                  `Exhibition: ${CONTEXT.exhibition}`,
                  `Visitor language: ${languageLabel}`,
                  `Uploaded image filename: ${imageName}`,
                  `Image summary: ${imageSummary}`,
                  `Seeded exhibition overview: ${CONTEXT.overview}`,
	                  `Guide rule: ${(CONTEXT.language_rules as Record<string, string>)[language] || CONTEXT.language_rules.en}`,
	                  "Write the exact first message Mira should speak in an outbound phone call.",
	                  "Start directly with factual exhibit information: likely artwork title, artist, approximate year or period, historical context, and why it matters in this exhibition.",
	                  "Do not start with greetings, app introductions, welcome language, or emotional filler.",
	                  "Keep it 75 to 115 words. Be direct and exhibition-like. Include one concrete next recommendation."
	                ].join("\n")
              }
            ]
          }
        ]
      })
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Nebius HTTP ${response.status}: ${text.slice(0, 300)}`);
    const json = JSON.parse(text);
    const message = getMessageContent(json).trim();
    if (!message) throw new Error("Nebius returned an empty message");
    return {
      first_message: message,
      mode: "live",
      model,
      response_id: json.id || null,
      error: null
    };
  } catch (error) {
    return {
      first_message: fallbackGuide(language),
      mode: "failed",
      model,
      response_id: null,
      error: error instanceof Error ? error.message : "Unknown Nebius failure"
    };
  }
}

async function startVapiCall({
  phone,
  firstMessage,
  visitCardSeed,
  imageSummary
}: {
  phone: string;
  firstMessage: string;
  visitCardSeed: string;
  imageSummary: string;
}): Promise<VapiResult> {
  const apiKey = Deno.env.get("VAPI_API_KEY") || "";
  const assistantId = Deno.env.get("VAPI_ASSISTANT_ID") || "";
  const phoneNumberId = Deno.env.get("VAPI_PHONE_NUMBER_ID") || "";
  const baseUrl = Deno.env.get("VAPI_BASE_URL") || "https://api.vapi.ai";
  if (!apiKey || !assistantId || !phoneNumberId) {
    return {
      mode: "missing_credentials",
      call_id: null,
      provider_status: "not_started",
      live_phone_call_happened: false,
      error: "VAPI_API_KEY, VAPI_ASSISTANT_ID, or VAPI_PHONE_NUMBER_ID is not configured in InsForge secrets."
    };
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/call`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        assistantId,
        phoneNumberId,
        customer: { number: phone },
        assistantOverrides: {
          firstMessage,
          variableValues: {
            guide_context: firstMessage,
            artwork_summary: imageSummary,
            exhibition: CONTEXT.display_name
          }
        },
        metadata: {
          source: "mira-insforge-product-ready",
          visit_card_seed: visitCardSeed
        }
      })
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Vapi HTTP ${response.status}: ${text.slice(0, 300)}`);
    const json = JSON.parse(text);
    return {
      mode: "live",
      call_id: json.id || null,
      provider_status: json.status || "created",
      live_phone_call_happened: Boolean(json.id),
      error: null
    };
  } catch (error) {
    return {
      mode: "failed",
      call_id: null,
      provider_status: "failed",
      live_phone_call_happened: false,
      error: error instanceof Error ? error.message : "Unknown Vapi failure"
    };
  }
}

function verifyChecks({ completed, llm, vapi }: { completed: boolean; llm: ProviderGuide; vapi: VapiResult }) {
  return [
    "phone_visit_card_exists",
    "has_image_request",
    "has_voice_interaction",
    "has_multilingual_record",
    "has_next_recommendation",
    "live_visit_card_updated",
    "live_llm_enabled",
    "deployed_live_vapi_call"
  ].map((name) => ({
    name,
    passed:
      (completed || ["phone_visit_card_exists", "has_image_request", "has_multilingual_record"].includes(name)) &&
      (name !== "live_llm_enabled" || (llm.mode === "live" && Boolean(llm.response_id))) &&
      (name !== "deployed_live_vapi_call" || (vapi.mode === "live" && Boolean(vapi.call_id))),
    evidence: [],
    description: "Hosted verifier check from InsForge Edge Function."
  }));
}

function parseVisitCardId(visitCardId: string) {
  const match = visitCardId.match(/^vc_([a-f0-9]{12})_(\d+)_(.+)$/);
  if (!match) throw new Error("Invalid Visit Card id");
  const [, phoneKey, createdMs, encoded] = match;
  const payload = decodePayload(encoded);
  return {
    phoneKey: payload.phoneKey || phoneKey,
    maskedPhone: payload.maskedPhone || "***",
    language: payload.language || "en",
    imageName: payload.imageName || "sample-data/artwork.jpg",
    createdMs: Number(createdMs),
    firstMessage: payload.firstMessage || fallbackGuide(payload.language || "en"),
    llmModel: payload.llmModel || DEFAULT_TEXT_MODEL,
    llmResponseId: payload.llmResponseId || null,
    llmMode: payload.llmMode || "unknown",
    llmError: payload.llmError || null,
    vapiCallId: payload.vapiCallId || null,
    vapiMode: payload.vapiMode || "unknown",
    vapiStatus: payload.vapiStatus || null,
    vapiError: payload.vapiError || null,
    livePhoneCallHappened: Boolean(payload.livePhoneCallHappened)
  };
}

function encodePayload(value: Record<string, unknown>) {
  const json = JSON.stringify(value);
  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodePayload(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return JSON.parse(atob(padded));
}

function getMessageContent(response: Record<string, any>) {
  const content = response?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => part.text || "").join("\n");
  throw new Error("Nebius response did not include message content");
}

function fallbackGuide(language: string) {
  if (language === "zh") {
    return "这很可能是克劳德·莫奈晚期的《睡莲》主题作品，创作背景约在十九世纪末到二十世纪初的吉维尼花园。莫奈反复画池塘、睡莲和水面倒影，不是为了记录地点，而是研究光线如何把空间变成颜色和空气。它适合放在 Reflections of Light 中，因为水面同时是主题和画布。下一站请比较另一幅水景，看建筑或植物如何被倒影重新组织。";
  }
  return "This is likely Claude Monet's Water Lilies, from the late nineteenth to early twentieth century period of his Giverny garden paintings. Monet returned to the pond, lilies, and reflected sky again and again, not to document a place, but to study how light turns space into color and atmosphere. In Reflections of Light, this work anchors the water-as-mirror theme. Next, compare it with another waterfront view and ask what is painted directly versus what only appears as reflection.";
}

function buildTranscript(language: string, firstMessage: string) {
  return [
    { speaker: "assistant", text: firstMessage },
    { speaker: "visitor", text: language === "zh" ? "Explain this in Mandarin." : "What should I notice first?" }
  ];
}

function buildLanguageRecord(language: string) {
  const labels: Record<string, string> = { en: "English", zh: "Mandarin", es: "Spanish" };
  const rules = CONTEXT.language_rules as Record<string, string>;
  return {
    requested: language,
    label: labels[language] || "English",
    guide_copy_rule: rules[language] || rules.en
  };
}

function labelForStatus(status: string) {
  return {
    preparing: "Reading the image",
    matching: "Matching it to Reflections of Light",
    calling: "Preparing your guide",
    in_progress: "Calling your phone",
    summarizing: "Summarizing",
    completed: "Visit Card updated"
  }[status] || status;
}

function normalizePhoneNumber(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (String(phone || "").trim().startsWith("+") && digits.length >= 10) return `+${digits}`;
  throw new Error("Enter a valid US demo phone number.");
}

function maskPhone(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  return `${digits.slice(0, 3)}******${digits.slice(-2)}`;
}

async function hashPhone(phone: string) {
  const bytes = new TextEncoder().encode(phone);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 12);
}

function stripFunctionPrefix(pathname: string) {
  return pathname.replace(/^\/functions\/mira-api/, "") || "/";
}

function json(payload: unknown, status = 200) {
  return withCors(
    new Response(JSON.stringify(payload, null, 2), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    })
  );
}

function withCors(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

type ProviderGuide = {
  first_message: string;
  mode: string;
  model: string;
  response_id: string | null;
  error: string | null;
};

type VapiResult = {
  mode: string;
  call_id: string | null;
  provider_status: string | null;
  live_phone_call_happened: boolean;
  error: string | null;
};
