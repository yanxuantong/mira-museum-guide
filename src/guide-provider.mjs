const DEFAULT_TEXT_BASE_URL = "https://api.tokenfactory.us-central1.nebius.com/v1/";
const DEFAULT_TEXT_MODEL = "Qwen/Qwen3.5-397B-A17B";
const DEFAULT_VISION_BASE_URL = "https://api.tokenfactory.nebius.com/v1/";
const DEFAULT_VISION_MODEL = "Qwen/Qwen2.5-VL-72B-Instruct";

export async function generateLiveGuidePreview({
  context,
  language = "en",
  imageName = "sample-data/artwork.jpg",
  imageDataUrl = "",
  imageSummary = "",
  now = new Date()
}) {
  const config = getNebiusTextConfig();
  if (!config.apiKey) {
    throw new Error("NEBIUS_API_KEY is not set");
  }

  const languageLabel = {
    en: "English",
    zh: "Mandarin Chinese",
    es: "Spanish"
  }[language] || "English";

  const userContent = [
    {
      type: "text",
      text: [
    `Museum: ${context.museum}`,
    `Exhibition: ${context.exhibition}`,
    `Visitor language: ${languageLabel}`,
    `Uploaded image filename: ${imageName}`,
    `Image summary: ${imageSummary || "A light-and-reflection artwork photo uploaded by the visitor."}`,
    `Seeded exhibition overview: ${context.overview}`,
    `Guide rule: ${(context.language_rules || {})[language] || (context.language_rules || {}).en || ""}`,
    "Write the exact first message Mira should speak in an outbound phone call.",
    "Start directly with factual exhibit information: likely artwork title, artist, approximate year or period, historical context, and why it matters in this exhibition.",
    "Do not start with greetings, app introductions, welcome language, or emotional filler.",
    "Keep it 75 to 115 words. Be direct and exhibition-like. Include one concrete next recommendation.",
    "If identification is uncertain, state the confidence briefly; otherwise do not hedge. Do not mention implementation details, APIs, or that this is a demo."
      ].join("\n")
    }
  ];
  if (imageDataUrl) {
    userContent.push({
      type: "image_url",
      image_url: {
        url: imageDataUrl
      }
    });
  }

  const response = await nebiusChatCompletion({
    baseUrl: config.baseUrl,
    model: config.model,
    messages: [
      {
        role: "system",
        content:
          "You are Mira, a factual exhibition audio guide. Return only the exact spoken first message. Start with the artwork facts, not a greeting."
      },
      {
        role: "user",
        content: userContent
      }
    ],
    temperature: 0.35,
    max_tokens: 420,
    extra_body: {
      chat_template_kwargs: {
        enable_thinking: false
      }
    }
  });

  const firstMessage = getMessageContent(response).trim();
  if (!firstMessage) throw new Error("Nebius returned an empty guide message");

  return {
    first_message: firstMessage,
    provider_mode: "live",
    provider: "Nebius Token Factory",
    model: config.model,
    response_id: response.id || null,
    created_at: now.toISOString()
  };
}

export async function identifyArtworkWithLiveLlm({ context, imageDataUrl, imageName = "sample-data/artwork.jpg" }) {
  const config = getNebiusVisionConfig();
  if (!config.apiKey) throw new Error("NEBIUS_API_KEY is not set");
  if (!imageDataUrl) throw new Error("imageDataUrl is required for artwork identification");
  const response = await nebiusChatCompletion({
    baseUrl: config.baseUrl,
    model: config.model,
    messages: [
      {
        role: "system",
        content:
          "You are a cautious museum image identifier. Use visual evidence first and the supplied exhibition context second. Return only valid JSON."
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `Seeded museum context: ${context.display_name || `${context.museum}: ${context.exhibition}`}`,
              `Image filename: ${imageName}`,
              "Identify the artwork or likely subject. Return JSON with keys: likely_title, likely_artist, confidence low|medium|high, visual_evidence array of 3 short strings, uncertainty_note, guide_summary_seed."
            ].join("\n")
          },
          {
            type: "image_url",
            image_url: { url: imageDataUrl }
          }
        ]
      }
    ],
    temperature: 0.1,
    max_tokens: 700,
    extra_body: {
      chat_template_kwargs: {
        enable_thinking: false
      }
    }
  });
  return {
    ...parseJsonFromModel(getMessageContent(response)),
    provider: "Nebius Token Factory",
    model: config.model,
    response_id: response.id || null
  };
}

export function deterministicGuidePreview({ context, language = "en" }) {
  const text =
    language === "zh"
      ? "这很可能是克劳德·莫奈晚期的《睡莲》主题作品，创作背景约在十九世纪末到二十世纪初的吉维尼花园。莫奈反复画池塘、睡莲和水面倒影，不是为了记录地点，而是研究光线如何把空间变成颜色和空气。它适合放在 Reflections of Light 中，因为水面同时是主题和画布。下一站请比较另一幅水景，看建筑或植物如何被倒影重新组织。"
      : "This is likely Claude Monet's Water Lilies, from the late nineteenth to early twentieth century period of his Giverny garden paintings. Monet returned to the pond, lilies, and reflected sky again and again, not to document a place, but to study how light turns space into color and atmosphere. In Reflections of Light, this work anchors the water-as-mirror theme. Next, compare it with another waterfront view and ask what is painted directly versus what only appears as reflection.";
  return {
    first_message: text,
    provider_mode: "mock",
    provider: "deterministic fallback",
    model: "local-fallback",
    response_id: null,
    created_at: new Date().toISOString(),
    fallback_reason: context ? null : "context missing"
  };
}

async function nebiusChatCompletion({ baseUrl, model, messages, temperature, max_tokens, extra_body }) {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.NEBIUS_API_KEY}`,
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
    throw new Error(`Nebius HTTP ${response.status}: ${text.slice(0, 500)}`);
  }
  return JSON.parse(text);
}

function getMessageContent(response) {
  const content = response?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => part.text || "").join("\n");
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
    if (first !== -1 && last !== -1 && last > first) return JSON.parse(trimmed.slice(first, last + 1));
    throw new Error("Could not parse JSON from Nebius response");
  }
}

function getNebiusTextConfig() {
  return {
    apiKey: process.env.NEBIUS_API_KEY,
    baseUrl: process.env.NEBIUS_TEXT_BASE_URL || process.env.NEBIUS_BASE_URL || DEFAULT_TEXT_BASE_URL,
    model: process.env.NEBIUS_MODEL_TEXT || DEFAULT_TEXT_MODEL
  };
}

function getNebiusVisionConfig() {
  return {
    apiKey: process.env.NEBIUS_API_KEY,
    baseUrl: process.env.NEBIUS_VISION_BASE_URL || process.env.NEBIUS_BASE_URL || DEFAULT_VISION_BASE_URL,
    model: process.env.NEBIUS_MODEL_VISION || DEFAULT_VISION_MODEL
  };
}
