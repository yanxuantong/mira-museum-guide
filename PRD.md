# Mira PRD

## Product

Mira

Phone-first AI guide for the Multi Modal Museum's `Reflections of Light` exhibition.

## Brand Rationale

`Mira` is short, easy to pronounce across languages, and evokes the act of
seeing without relying on an English pun. The product should feel like a calm
guide that helps visitors look closer, not like a generic AI utility.

Working tagline:

```text
Mira
Your guide to what you see.
```

## One Sentence

Mira lets a visitor open a web app, enter their phone number, upload or
take a photo inside the preloaded Multi Modal Museum `Reflections of Light` exhibition, receive
an AI guide phone call in their preferred language, ask questions naturally, and
watch a live Visit Card update in the web app with everything they asked about
during the visit.

## Current MVP Decision

This hackathon demo is not a generic museum platform.

The museum, exhibition, and content are prefilled with fictional demo content:

- Museum: Multi Modal Museum.
- Exhibition: `Reflections of Light`.
- Visitor action: enter phone number, take or upload photo, receive call.
- Final artifact: one live-updating Visit Card per phone number.

There is no museum admin UI in the MVP. The museum data is seeded in code or
backend storage before the demo.

## Exhibition Context

`Reflections of Light` is a fictional demo exhibition at the fictional
Multi Modal Museum. It uses public-domain impressionist themes and original
looking prompts, but it is not affiliated with any real museum,
exhibition, lender, or rights holder.

The exhibition is especially strong for this demo because it has a clear story:
visitors compare how painters use water, reflection, haze, architecture, and
changing light to guide attention. The show gives the AI guide a grounded
narrative without depending on proprietary wall labels or museum-owned images.

Seeded MVP content should include:

- Exhibition overview.
- 4 to 6 selected exhibit entries or exhibit themes.
- Observation prompts, such as water reflection, repeated architecture,
  atmosphere, color, and comparison with other impressionist painters.
- Suggested next-stop recommendations.
- Multilingual guide copy rules.

Sources used for the seeded background:

- Internal demo seed file: `sample-data/multimodal-museum-context.json`
- Public-domain art-history facts and themes about impressionist light, water,
  and reflection.
- No copied wall labels, museum logos, or museum-owned images are required for
  the MVP.

## User Problem

Museum visitors are curious in the moment, but existing guide experiences are
too rigid.

Common visitor friction:

- They do not know what to notice first.
- Wall labels are dense and easy to skip.
- Traditional audio guides are linear and cannot answer follow-up questions.
- Renting a dedicated device is inconvenient.
- Generic AI apps can explain an image, but they are not grounded in the actual
  exhibition.
- Visitors often forget what they learned after leaving the gallery.
- Non-English visitors may need the same exhibit explained in another language.

Mira solves this by making the visitor's own phone the guide interface,
while keeping the conversation grounded in a preloaded exhibition.

## Target User

Primary user: a Multi Modal Museum visitor attending `Reflections of Light`.

Demo user: a hackathon judge watching a complete visitor flow from phone number
to call to live-updating Visit Card.

Out of scope for MVP: museum staff, admin operators, ticketing users, members,
and full collection managers.

## Differentiation

### Why Not Just Use Claude?

Claude can analyze a photo, but it does not know the preloaded exhibition path
or create a museum-specific visit artifact by phone number.

Mira is different because:

1. The content is pre-grounded in the Multi Modal Museum `Reflections of Light` exhibition.
2. The interaction is phone-first, so the visitor can look at the artwork while
   listening and speaking.
3. The guide can recommend the next exhibit or theme in the same show.
4. The visitor sees a persistent Visit Card update inside the web app.
5. The Visit Card aggregates all requests for the same phone number during the
   visit.
6. The experience supports multilingual conversation without requiring the user
   to write prompts.

### Why Not A Traditional Audio Guide?

Traditional audio guides provide fixed tracks. They do not adapt when the
visitor asks:

- "What should I notice first?"
- "Explain this in Mandarin."
- "How do I explain this to a child?"
- "Why do artists repeat the same view under changing light?"
- "What should I see next?"

Mira keeps the guide experience but makes it conversational,
personalized, and persistent.

## Core Demo User Story

As a visitor at the Multi Modal Museum `Reflections of Light` exhibition, I open a web app,
enter my phone number, take or upload a photo of a light-and-reflection work, receive a
phone call from an AI guide, ask questions in my preferred language, and watch a
personal Visit Card update with the works I asked about, answers I heard, and
recommended next steps.

## Exact MVP Flow

1. Visitor opens the deployed Mira website.
2. The site is already prefilled for the Multi Modal Museum `Reflections of Light` exhibition.
3. Visitor enters a phone number.
4. Visitor takes a photo or uploads an image.
5. Backend creates or updates the visitor record for that phone number.
6. AI analyzes the image against the seeded exhibition context.
7. Backend starts a Vapi phone call to the visitor.
8. The AI guide gives a short explanation in the selected or detected language.
9. Visitor asks follow-up questions by voice.
10. The guide answers and recommends what to look at next.
11. Backend updates the Visit Card associated with that phone number.
12. The web app polls or subscribes for updates and refreshes the Visit Card.
13. The same Visit Card aggregates all requests from that phone number.

## Wow Moment

The wow moment is the full loop:

```text
I open the Multi Modal Museum Reflections guide.
I enter my phone number.
I take a photo.
My phone rings.
The guide explains the work in my language.
I ask a question naturally.
The guide recommends what to see next.
The Visit Card updates on the page with everything from this visit.
```

This is stronger than "AI explains a painting" because the experience combines
image understanding, voice interaction, multilingual guidance, next-step
recommendation, and a persistent artifact.

## 60 Second Pitch

Museums still rely on wall labels and rented audio devices, but visitors already
carry the best guide device in their pocket.

Mira turns the visitor's own phone into an AI guide for a specific
exhibition. For this demo, we preload the Multi Modal Museum's `Reflections of Light`
show. A visitor enters their phone number, takes a photo, and immediately gets a
call from a multilingual AI guide. The guide explains what to notice, answers
follow-up questions, recommends the next stop, and updates a live Visit Card in
the web app.

The key difference from Claude is that Mira is not a generic image chat.
It is a phone-first, exhibition-grounded guide that produces a persistent visit
artifact for the user.

## Demo Script

```text
This demo is set inside the Multi Modal Museum's Reflections of Light exhibition.

The exhibition content is already preloaded, so the visitor does not need to
choose a museum or configure anything.

I open the Mira web app, enter my phone number, and upload a photo from
the exhibition.

Mira analyzes the image against the seeded exhibition context and calls my
phone.

[Phone rings]

The guide starts with a short explanation: what I am looking at, what to notice
first, and why this matters in an impressionist light study period.

Now I can ask a natural question, for example: "Can you explain this in Chinese?"
or "What should I look at next?"

As the call progresses, the Visit Card updates on the page. After the call, it
shows the photo, explanation, questions I asked, language used, and next
recommended stop.
```

## Product Requirements

### P0 Required For Demo

- Deployed web app.
- Prefilled Multi Modal Museum `Reflections of Light` exhibition context.
- Phone number input.
- Camera capture or image upload.
- Backend session keyed by phone number.
- Live LLM-powered image analysis and guide generation against seeded
  exhibition context.
- Vapi outbound call in the deployed demo.
- Multilingual conversation support.
- Next-step recommendation.
- Visit Card generated per phone number.
- Live UI update for the Visit Card by polling or realtime subscription.
- Local mock Vapi mode for safe development that prints the prepared phone guide
  content to terminal, plus replay mode if live services fail during
  presentation.

### P1 If Time Allows

- Visitor language selector before upload.
- More polished mobile-first UI.
- Multiple uploaded photos per phone number.
- Visit Card timeline grouped by artwork.
- Basic transcript summary after call.
- InsForge Realtime subscription instead of polling.
- Optional post-visit SMS or email link after the live demo path is stable.

### Out Of Scope

- Museum admin panel.
- User login.
- Ticketing.
- Payments.
- Full collection search.
- Indoor navigation.
- Real-time location tracking.
- Accurate global artwork authentication.
- Generic museum onboarding.
- Social sharing.

## UI Requirements

The UI should be simple, mobile-first, and demo-safe.

### Page 1: Start

Content:

- Title: `Mira`
- Subtitle: `Multi Modal Museum: Reflections of Light`
- Short line: `Enter your phone number, take a photo, and your AI guide will call you.`
- Phone number input.
- Optional language selector:
  - English
  - Mandarin
  - Spanish
  - French
  - Auto-detect during call
- Camera / upload control.
- Primary button: `Call My Guide`

No museum selection. No admin entry. No account creation.

### Page 2: Preparing Call

Show:

- Uploaded image preview.
- Status steps:
  - `Reading the image`
  - `Matching it to Reflections of Light`
  - `Preparing your guide`
  - `Calling your phone`
- Fallback link: `Open visit card preview`

### Page 3: Call Active

Show:

- `Your guide is calling now`
- Suggested questions:
  - `What should I notice first?`
  - `Explain this in Mandarin.`
  - `What should I see next?`
- Live artifact placeholder:
  - `Your Visit Card is updating here as the call progresses.`

### Page 4: Visit Card

The Visit Card should be visible in the same web session immediately after
`/api/start-guide` returns. It can also have a tokenized URL for replay or
sharing, but SMS delivery is out of scope for P0.

Required sections:

- Exhibition: `Multi Modal Museum - Reflections of Light`
- Phone-linked visit id.
- Uploaded photos.
- Works or themes recognized.
- Guide summaries.
- Visitor questions.
- Language used.
- Recommended next stop.
- Timestamp.
- Evidence and limitation note.

## Backend Requirements

Use InsForge if it is fast enough for the demo. Keep local JSON or SQLite
fallback if setup blocks progress.

### Core Backend Responsibilities

- Store seeded exhibition content.
- Store uploaded image or image reference.
- Normalize phone number.
- Create or update one visitor profile per phone number.
- Create request records for each upload/call.
- Generate or update one Visit Card per phone number.
- Create Vapi outbound call.
- Receive Vapi call webhook.
- Serve a polling endpoint or realtime channel for Visit Card updates.

### Phone Number Rule

For MVP, phone number is the user key.

Each normalized phone number maps to exactly one Visit Card:

```text
phone_number -> visitor_id -> visit_card_url
```

If the same phone number submits multiple photos, the existing Visit Card is
updated rather than creating a new standalone card.

Production note: phone numbers are sensitive data. A production version should
store a hashed phone key and keep raw phone numbers only when needed for active
messaging consent. For hackathon MVP, keep the implementation simple and avoid
printing phone numbers in public artifacts.

## Data Model

### `exhibits`

Seeded records for the fictional Multi Modal Museum demo.

```json
{
  "id": "reflections_light_overview",
  "type": "theme",
  "title": "Reflections of Light",
  "museum": "Multi Modal Museum",
  "source_url": "sample-data/multimodal-museum-context.json",
  "guide_context": "This fictional exhibition explores light, water, atmosphere, and architecture through repeated views.",
  "what_to_notice": [
    "Reflections on water",
    "Soft edges and atmospheric haze",
    "Repeated architecture seen through changing light"
  ],
  "next_recommendation": "Compare this with another waterfront view to see how reflection changes the way architecture appears."
}
```

### `visitors`

```json
{
  "id": "visitor_123",
  "phone_e164": "+14155551234",
  "preferred_language": "Mandarin",
  "visit_card_token": "vc_abcd1234",
  "created_at": "2026-06-19T18:30:00Z",
  "updated_at": "2026-06-19T18:45:00Z"
}
```

### `requests`

One record per photo/call interaction.

```json
{
  "id": "req_001",
  "visitor_id": "visitor_123",
  "image_url": "https://...",
  "status": "completed",
  "matched_exhibit_id": "reflections_light_overview",
  "analysis_json": {},
  "vapi_call_id": "call_123",
  "language": "Mandarin",
  "transcript": "Visitor asked what to look at next...",
  "summary": "The guide explained the fictional exhibition's themes of light, water, reflection, and atmosphere.",
  "created_at": "2026-06-19T18:31:00Z"
}
```

### `visit_cards`

One record per phone number.

```json
{
  "id": "card_123",
  "visitor_id": "visitor_123",
  "token": "vc_abcd1234",
  "public_url": "https://mira.local/v/vc_abcd1234",
  "museum": "Multi Modal Museum",
  "exhibition": "Reflections of Light",
  "requests": ["req_001", "req_002"],
  "highlights": [
    "The visitor explored how water and light change the way architecture appears.",
    "The visitor asked for a Mandarin explanation.",
    "Next recommended stop: compare another waterfront view."
  ],
  "recommended_next_steps": [
    "Look for repeated architectural forms.",
    "Compare water reflections across works.",
    "Ask how repeated reflections change what you notice first."
  ],
  "last_updated_at": "2026-06-19T18:45:00Z"
}
```

## API Design

### `POST /api/start-guide`

Single endpoint for the main demo path.

Input:

```json
{
  "phone": "+14155551234",
  "language": "Mandarin",
  "image": "file-or-base64"
}
```

Backend steps:

1. Normalize phone number.
2. Create or load visitor by phone number.
3. Create request.
4. Store image.
5. Analyze image with seeded exhibition context.
6. Create or update Visit Card.
7. Start Vapi outbound call.
8. Return status and Visit Card URL/id for live UI updates.

Output:

```json
{
  "visitor_id": "visitor_123",
  "request_id": "req_001",
  "status": "calling",
  "visit_card_url": "https://mira.local/v/vc_abcd1234",
  "call_id": "call_123"
}
```

### `POST /api/vapi/webhook`

Receives call status, transcript, summary, and tool events.

Responsibilities:

- Update request status.
- Save transcript or summary.
- Update Visit Card.
- Run verifier when the call ends.

### `GET /api/visit-card/:id`

Returns the latest Visit Card state for UI polling.

The web app should poll this endpoint every 2 seconds while the call is active
and stop or slow down after the call reaches a terminal state.

### Optional P1: `GET /v/:token`

Public Visit Card replay page.

Token should be unguessable. The page should not expose raw phone number.

## AI Requirements

### Image Analysis

The image analysis should be grounded in the preloaded exhibition, not open-ended
art identification.

Prompt behavior:

- Identify visual features.
- Match against seeded light-and-reflection themes or exhibit records.
- Explain uncertainty.
- Generate a short guide script.
- Recommend a next stop or next question.
- Return structured JSON.

Required output:

```json
{
  "matched_context": "reflections_light_overview",
  "confidence": "medium",
  "visual_observations": [
    "water reflection",
    "architectural forms",
    "soft atmospheric edges"
  ],
  "guide_script": "Start by looking at how the water breaks the building into color...",
  "suggested_questions": [
    "Why do artists paint water and light repeatedly?",
    "What should I notice first?",
    "How is this connected to Water studies?"
  ],
  "next_recommendation": "Compare this with a water study to notice how reflections become more abstract.",
  "uncertainty_note": "This is grounded in the seeded Reflections of Light exhibition context, not a global artwork authentication."
}
```

### Voice Guide

The Vapi assistant should:

- Start in the user's selected language when provided.
- Otherwise ask or infer language from the visitor's first response.
- Give a 30 to 60 second explanation.
- Invite follow-up questions.
- Recommend the next thing to look at.
- End by saying the Visit Card is updating on the web page.

Assistant opening:

```text
Hi, this is Mira for the Multi Modal Museum's Reflections of Light exhibition. I looked
at the image you uploaded. I will give you a short guide, then you can ask me
anything in your preferred language.
```

Multilingual requirement:

- MVP must support at least English and Mandarin.
- Nice to have: Spanish and French.
- The Visit Card should record the language used.

## Visit Card Requirements

The Visit Card is the final artifact and must be strong enough for judging.

Each phone number has one Visit Card. Multiple uploads from the same phone
number are appended to the same card.

Required fields:

- Museum.
- Exhibition.
- Visit Card token.
- Uploaded image thumbnails.
- Request timeline.
- Guide summary per request.
- Visitor questions.
- Language used.
- Recommended next stop.
- Source/evidence notes.
- Known limitations.
- Timestamp.
- Live status:
  - `preparing`
  - `calling`
  - `in_progress`
  - `summarizing`
  - `completed`
  - `failed_or_mocked`

Example display copy:

```text
Your Reflections of Light Visit Card

You explored:
- A light-and-water study focused on reflection, atmosphere, and architecture.

You asked:
- "Can you explain this in Chinese?"
- "What should I look at next?"

Your guide recommended:
- Compare the reflections here with another water study.
- Notice how architecture becomes less solid and more atmospheric.
```

## Live Visit Card Update Requirements

The Visit Card is updated in the UI instead of sent by SMS.

P0 implementation:

- After `/api/start-guide`, route the user to the Visit Card view immediately.
- Render an initial shell with image preview, status, and placeholder sections.
- Poll `GET /api/visit-card/:id` every 2 seconds while the call is active.
- Update call status from Vapi webhook events.
- Append transcript snippets if available.
- Replace placeholders with summary, visitor questions, language, and next
  recommendation after the end-of-call report arrives.
- Show verifier pass/fail checks when available.

Why polling for P0:

- It avoids SMS/Twilio/10DLC setup.
- It avoids WebSocket/realtime setup until the core demo is stable.
- It makes the artifact visible to judges during the phone call.

P1 option:

- Replace or supplement polling with InsForge Realtime once persistence is
  stable.

## Sponsor Strategy

### Nebius Token Factory

Use for:

- Multimodal analysis of uploaded photo.
- Grounded guide generation from seeded exhibition context.
- Visit Card summary generation.

Keep the Nebius API key server-side.

### Vapi

Use for:

- Outbound phone call.
- Voice conversation.
- Transcript and end-of-call webhook events.

Mode boundary:

- Local mode uses a mock call record, mock transcript, and mock call summary so
  development commands do not ring a phone. The same local command must print
  the exact guide script or Vapi first message that would be spoken during the
  deployed phone call.
- Deployed mode uses live Vapi and must place a real outbound phone call for
  the product-ready demo.

### InsForge

Use for:

- Visitor records.
- Request records.
- Image storage.
- Visit Card storage.
- Live Visit Card polling endpoint or realtime channel.

Fallback:

- Local JSON files or SQLite if InsForge setup blocks the demo.

## Technical Architecture

```text
Deployed Web App
  - phone input
  - language selector
  - camera/upload
  - status screen
  - Visit Card page

Backend API
  - /api/start-guide
  - /api/vapi/webhook
  - /api/visit-card/:id
  - /v/:token

InsForge or fallback DB
  - visitors
  - requests
  - visit_cards
  - images

Nebius
  - image analysis
  - guide script
  - Visit Card summary

Vapi
  - outbound call
  - multilingual voice Q&A
  - transcript webhook
```

## Verifier Rubric

The verifier should run after each completed request.

```json
{
  "passed": true,
  "checks": [
    {
      "name": "phone_visit_card_exists",
      "passed": true,
      "description": "The phone number maps to exactly one Visit Card."
    },
    {
      "name": "has_image_request",
      "passed": true,
      "description": "The Visit Card includes at least one uploaded image request."
    },
    {
      "name": "has_voice_interaction",
      "passed": true,
      "description": "The request includes Vapi call status, transcript, or mock call record."
    },
    {
      "name": "has_multilingual_record",
      "passed": true,
      "description": "The selected or detected language is stored."
    },
    {
      "name": "has_next_recommendation",
      "passed": true,
      "description": "The guide recommends a next exhibit, theme, or question."
    },
    {
      "name": "live_visit_card_updated",
      "passed": true,
      "description": "The Visit Card is accessible in the UI and reflects the latest call state."
    }
  ]
}
```

## Demo Safety

Required demo order:

1. Deployed live run:
   - real image upload.
   - live LLM analysis and guide generation.
   - live Vapi call.
   - live Visit Card UI update.
   - InsForge persistence.
2. Local safe run:
   - real upload.
   - live LLM analysis and guide generation.
   - mock Vapi call record with no real phone call.
   - terminal-printed guide script or Vapi first message for review.
   - live Visit Card UI update.
3. Replay run:
   - saved visitor, request, transcript, and Visit Card.
4. Recorded path:
   - short screen recording of the successful flow.

Required sample files:

```text
sample-data/multimodal-museum-context.json
sample-data/sample-upload.jpg
sample-data/sample-visitor.json
sample-data/sample-request.json
sample-data/sample-visit-card.json
sample-data/sample-transcript.txt
sample-data/sample-verifier.json
```

Suggested flags:

```text
USE_SAMPLE_MODE=true
MOCK_NEBIUS=false
MOCK_VAPI=false
MOCK_INSFORGE=false
```

## Implementation Plan

### Phase 1: Reliable Web Flow

- Build deployed web app shell.
- Add Multi Modal Museum / Reflections prefilled landing page.
- Add phone input.
- Add language selector.
- Add camera/upload.
- Add status screen.
- Add Visit Card route.
- Add polling from the Visit Card route to the backend.

### Phase 2: Data And Artifact

- Seed fictional exhibition context.
- Create visitor by phone number.
- Append requests to the same phone-linked Visit Card.
- Render Visit Card from stored data.
- Add verifier.

### Phase 3: AI And Voice

- Connect Nebius analysis.
- Connect Vapi outbound call.
- Save transcript or summary from webhook.
- Update Visit Card after call.

### Phase 4: Live Visit Card Updates

- Implement `GET /api/visit-card/:id`.
- Poll every 2 seconds while the call is active.
- Show call status, transcript snippets, summary, and verifier updates.
- Keep InsForge Realtime as a P1 upgrade, not a P0 dependency.

### Phase 5: Demo Polish

- Prepare one stable sample image.
- Prepare one stable phone number.
- Prepare English and Mandarin example call.
- Record fallback walkthrough.
- Keep UI simple and avoid adding admin features.

## Definition Of Done

The demo is done when:

- Website opens to a prefilled Multi Modal Museum `Reflections of Light` guide.
- Visitor can enter a phone number.
- Visitor can upload or take a photo.
- Backend creates or updates one Visit Card for that phone number.
- Local mode uses live LLM requests, does not place a real phone call, and
  prints the prepared phone guide content to terminal for review.
- Deployed mode uses live LLM requests and the visitor receives a live Vapi
  phone call.
- Guide explains the image in exhibition context.
- Visitor can ask at least one follow-up question.
- Guide can respond in English or Mandarin.
- Guide recommends a next exhibit, theme, or question.
- Visit Card updates dynamically in the UI during and after the call.
- Visit Card aggregates all requests for that phone number.
- Replay mode can show a saved fallback flow without live APIs.

## Non-Goals

- Do not build museum admin setup.
- Do not support arbitrary museums.
- Do not support arbitrary exhibitions.
- Do not require login.
- Do not build a full CMS.
- Do not over-optimize image matching.
- Do not add SMS delivery to P0.
- Do not expand beyond the Multi Modal Museum Reflections demo before the core call and Visit
  Card loop works.
