# GOAL.md

## 1. One-line Goal

Build **Mira**, a demoable web app for the Multi Modal Museum's `Reflections of Light`
exhibition where a visitor enters a phone number, uploads or takes a photo,
gets live LLM image/guide analysis, receives a real Vapi phone guide call in
the deployed demo, and watches one phone-linked Visit Card update live in the UI
with multilingual guide context, follow-up summary, next recommendation,
evidence, and verifier results.

## 1.1 Runtime Mode Policy

Mira has two submission modes:

- **Local mode:** live LLM requests are enabled, but Vapi is mocked. Local
  development and local judging commands must not place a real phone call.
  Instead, local commands must print the exact guide content that would be
  spoken on the phone, including the Vapi first message or guide script, so the
  call can be reviewed before deployment.
- **Deployed mode:** live LLM requests are enabled and Vapi is live. The hosted
  demo must place a real outbound guide call to the entered phone number.

Replay/sample mode remains available only as a failure fallback. It is not the
main success path for product readiness.

## 2. Required Reading

Read these files before editing code:

- `AGENTS.md`: repo-level hackathon rules, demo safety, artifact, and verifier
  requirements.
- `PRD.md`: Mira product scope, exact MVP flow, UI requirements, data model,
  API design, AI/voice behavior, and non-goals.
- `README.md`: current local loop, commands, provider boundaries, and live Vapi
  / Nebius notes.
- `package.json`: available scripts and current command surface.
- `src/cli.mjs` and `src/echoguide.mjs`: existing sample loop, artifact
  generation, verifier, LLM provider path, local mock Vapi path, and deployed
  live Vapi path.
- `sample-data/`: current replay assets and sample artifacts.

Verification: cite the read files in the final build report and preserve links
or command outputs proving the updated commands work.

## 3. Definition of Done

The build is done only when all items are verifiable:

- A web app runs locally with one command and prints a URL.
  - Verification: command output from `npm run dev` or equivalent.
- The first screen is branded `Mira` and prefilled for
  `Multi Modal Museum: Reflections of Light`.
  - Verification: screenshot of the page.
- The user can enter a phone number, choose language, and upload or capture an
  image.
  - Verification: screenshot or Playwright run showing filled form.
- Submitting creates or updates exactly one Visit Card keyed by normalized phone
  number.
  - Verification: JSON artifact or database row showing phone-keyed visit card.
- The Visit Card appears immediately as a live shell, then updates by polling
  `GET /api/visit-card/:id`.
  - Verification: network log or test report showing repeated polling and state
    changes.
- The app uses seeded `Reflections of Light` context for image analysis and guide
  generation.
  - Verification: `sample-data/multimodal-museum-context.json` and artifact evidence
    reference.
- Live LLM requests are enabled for both local and deployed demo modes.
  - Verification: local and deployed artifacts record live LLM provider mode,
    model name, response id, or equivalent provider evidence.
- Local mode uses mock Vapi and must not place a real phone call.
  - Verification: local run artifact records `vapi=mock`, a mock call id, and
    `live_phone_call_happened=false`.
- Local mode prints the phone guide content to the terminal.
  - Verification: local command output or a referenced text file includes the
    guide script/Vapi first message that the deployed phone call will speak.
- Deployed mode uses live Vapi and must place a real outbound phone call.
  - Verification: hosted run artifact records `vapi=live`, call id, provider
    status, destination phone masked in evidence, and call completion or
    terminal failure reason.
- The service is deployed and reachable from a phone.
  - Verification: public HTTPS URL plus hosted `POST /api/start-guide` and
    `GET /api/visit-card/:id` checks.
- The Visit Card records language, uploaded image, guide summary, visitor
  question or mock transcript, next recommendation, evidence, known limitations,
  and verifier result.
  - Verification: `sample-data/sample-visit-card.json` or generated
    `artifacts/*/visit-card.json`.
- The verifier produces pass/fail checks mapped to the PRD rubric.
  - Verification: `npm run verify` or equivalent output and
    `sample-data/sample-verifier.json`.
- Replay mode works from saved sample artifacts as a fallback if live services
  fail during the demo.
  - Verification: command output and screenshot/HTML report from sample data.
- The demo can be explained in 60-90 seconds from the app UI without hidden
  terminal-only steps.
  - Verification: `DEMO_REPORT.md` or final report with demo script, URL, and
    screenshots.

## 4. Scope and Non-scope

### Scope

- Single exhibition: Multi Modal Museum, `Reflections of Light`.
- Single visitor path: phone number -> language -> image upload/capture ->
  live LLM analysis -> Vapi call or local mock call -> live Visit Card.
- Phone number is the MVP visitor key.
- One Visit Card per normalized phone number; multiple requests append to the
  same card.
- Mobile-first web UI.
- Polling-based live updates for P0.
- Seeded exhibition context and sample replay data.
- Live LLM integration for image analysis and guide generation in both local
  and deployed modes.
- Vapi live integration in deployed mode; local mode uses mock Vapi only.
- InsForge deployment and hosted API checks for product readiness. Local
  JSON/SQLite fallback is acceptable only for local development and replay.

### Non-scope

- Museum admin UI.
- Arbitrary museums or arbitrary exhibitions.
- User login.
- Ticketing, payments, membership, social sharing, or full CMS.
- Indoor navigation or realtime location.
- Accurate global artwork authentication.
- SMS delivery in P0.
- Broad chatbot behavior beyond the seeded exhibition guide.
- Large refactors that do not improve the demo path.

## 5. Hard Rules

- Preserve the hackathon scope in `AGENTS.md`: one narrow workflow, one artifact,
  one verifier, replay-safe.
- Do not add SMS to P0.
- Do not expose API keys or raw secrets in source, artifacts, logs, screenshots,
  or reports.
- Keep phone numbers masked in public artifacts and UI screenshots unless using
  a deliberate fake/demo number.
- Do not remove replay mode while adding live integrations.
- Local mode must not place a real phone call. It must print the prepared phone
  guide content to the terminal. Deployed mode must place a real Vapi call for
  the ready criterion.
- LLM requests must be live in both local mode and deployed mode. If live LLM
  credentials are missing, mark the relevant ready criterion red instead of
  silently treating a mock LLM result as product-ready.
- If a live sponsor API fails, switch to replay only as a demo fallback and
  record the failure in artifact evidence. Do not mark deployed readiness green
  without the required live provider proof.
- Keep the Visit Card visible in the web UI; do not make terminal logs the
  primary demo surface.
- Use seeded `Reflections of Light` content before general model knowledge.
- State uncertainty: the system matches against seeded demo context and is not a
  global artwork-authentication tool.
- Prefer polling for P0; InsForge Realtime is P1 only after the core flow works.
- Verify with actual commands and screenshots before declaring done.

## 6. Build Loop

Use this loop until done:

1. Read the required files and inspect current git status.
   - Evidence: note changed files and existing untracked files in final report.
2. Preserve current sample loop.
   - Evidence: `npm run demo` and `npm run verify` either still pass or are
     replaced by documented equivalent commands.
3. Rename/align branding from EchoGuide/CurioGuide to Mira where user-facing.
   - Evidence: `rg "EchoGuide|CurioGuide" README.md package.json src sample-data
     PRD.md` output shows only intentional compatibility names, if any.
4. Add seeded exhibition context and phone-linked Visit Card schema.
   - Evidence: `sample-data/multimodal-museum-context.json`,
     `sample-data/sample-visit-card.json`, and verifier output.
5. Build web app surface and API endpoints.
   - Evidence: running local URL, screenshot, and API response examples.
6. Wire local mode.
   - Evidence: local sample upload uses live LLM requests, mock Vapi, no real
     phone call, prints the phone guide content to terminal, and produces live
     Visit Card updates.
7. Wire deployed mode.
   - Evidence: hosted run uses live LLM requests, live Vapi, a real call id, and
     artifacts name provider mode as live.
8. Add webhook/polling behavior.
   - Evidence: `GET /api/visit-card/:id` changes state over time in live or
     simulated run.
9. Add verifier and demo report.
   - Evidence: verifier JSON, final Visit Card JSON/HTML, screenshots, and
     `DEMO_REPORT.md`.
10. Run final commands and capture final state.
    - Evidence: final report includes commands, URLs, artifacts, screenshots,
      known failures, and fallback path.

## 7. Demo Surface Requirements

The demo must be visible from the browser, not only CLI output.

### Start Page

Required visible elements:

- `Mira`
- `Multi Modal Museum: Reflections of Light`
- Phone number input.
- Language selector with at least English and Mandarin.
- Camera/upload control.
- `Call My Guide` primary action.
- No museum selector, no admin entry, no login.

Verification: screenshot path in `artifacts/demo/start-page.png` or equivalent.

### Preparing/Calling State

Required visible elements:

- Uploaded image preview.
- Status steps:
  - `Reading the image`
  - `Matching it to Reflections of Light`
  - `Preparing your guide`
  - `Calling your phone`
- Suggested questions:
  - `What should I notice first?`
  - `Explain this in Mandarin.`
  - `What should I see next?`

Verification: screenshot path in `artifacts/demo/calling-state.png` or
equivalent.

### Live Visit Card

Required visible fields:

- Exhibition: `Multi Modal Museum - Reflections of Light`.
- Phone-linked visit id with masked phone or token.
- Uploaded image thumbnails.
- Request timeline.
- Guide summary.
- Visitor question or mock transcript.
- Language used.
- Recommended next stop.
- Evidence and limitation note.
- Verifier pass/fail checks.
- Live status: `preparing`, `calling`, `in_progress`, `summarizing`,
  `completed`, or `failed_or_mocked`.

Verification: screenshot path in `artifacts/demo/visit-card.png`, plus
`artifacts/*/visit-card.json`.

## 8. Tickets in Dependency Order

### Ticket 1: Preserve And Document Current Baseline

Run current commands and capture current behavior.

Deliverables:

- `DEMO_REPORT.md` section: `Baseline`.
- Command outputs for `npm run demo` and `npm run verify`, or documented
  failures before edits.

Acceptance:

- Existing sample loop is understood and not accidentally broken.

### Ticket 2: Mira Branding Alignment

Update user-facing branding from EchoGuide/CurioGuide to Mira.

Deliverables:

- Updated `README.md`, `package.json`, generated HTML titles, CLI output, and
  prompts where user-facing.
- Preserve file names only if renaming would add risk; document any remaining
  compatibility names.

Acceptance:

- `rg "EchoGuide|CurioGuide|curioguide" README.md package.json src sample-data
  PRD.md` shows no unintended user-facing old branding.

### Ticket 3: Seed Fictional Exhibition Context

Create the fixed demo exhibition data.

Deliverables:

- `sample-data/multimodal-museum-context.json`.
- At least 4 exhibit/theme entries with source URL, guide context,
  what-to-notice prompts, suggested questions, and next recommendation.
- Update sample artifact to reference this context.

Acceptance:

- Artifact evidence references `Reflections of Light` and seeded source URLs.

### Ticket 4: Phone-linked Visit Card Data Contract

Implement one Visit Card per normalized phone number.

Deliverables:

- Data model in code for visitor, request, visit card, verifier.
- Masking helper for public phone display.
- Sample `sample-data/sample-visitor.json`,
  `sample-data/sample-request.json`, and `sample-data/sample-visit-card.json`.

Acceptance:

- Two sample requests with the same phone append to the same Visit Card in a
  test or script.

### Ticket 5: Web App Shell

Build the browser demo surface.

Deliverables:

- Start page.
- Upload/camera input.
- Phone input.
- Language selector.
- Status/Visit Card route.
- Local dev command.

Acceptance:

- `npm run dev` or equivalent starts a URL.
- Screenshot proves the start page meets Section 7.

### Ticket 6: Start Guide API

Implement `POST /api/start-guide`.

Deliverables:

- Accepts phone, language, image.
- Normalizes phone.
- Creates/loads visitor.
- Stores or references image.
- Generates initial image analysis from the live LLM provider in local and
  deployed modes.
- Creates/updates Visit Card.
- Starts mock Vapi in local mode and live Vapi in deployed mode.
- Returns visit card id/url and request id.

Acceptance:

- `curl` or Playwright request returns JSON with `visitor_id`, `request_id`,
  `status`, `visit_card_url` or `visit_card_id`, and `call_id`.

### Ticket 7: Live Visit Card Polling API

Implement `GET /api/visit-card/:id`.

Deliverables:

- Returns latest Visit Card JSON.
- UI polls every 2 seconds while call is active.
- UI slows/stops after terminal state.

Acceptance:

- Network log or test report shows polling and state changes.

### Ticket 8: Vapi Webhook And Mock Event Simulator

Implement `POST /api/vapi/webhook` and a mock simulator.

Deliverables:

- Handles status update, transcript, and end-of-call summary payloads.
- Updates request and Visit Card.
- Runs verifier on terminal call state.
- Mock simulator updates the card without Vapi credentials.

Acceptance:

- With mock simulator, Visit Card moves through at least three states:
  `calling`, `summarizing`, `completed` or `failed_or_mocked`.

### Ticket 9: Local And Deployed Provider Modes

Implement the explicit provider mode matrix.

Deliverables:

- Updated `.env.example`.
- Local mode: live LLM, mock Vapi, no real phone call, and terminal-printed
  phone guide preview.
- Deployed mode: live LLM, live Vapi, real outbound phone call.
- Replay mode: saved sample artifacts only, clearly labeled as fallback.
- Provider mode recorded in artifact evidence.
- Live failures fall back to replay without crashing the demo, but deployed
  readiness stays red until live proof exists.

Acceptance:

- Local run records live LLM evidence and mock Vapi evidence without calling a
  phone.
- Local run prints the exact guide script or Vapi first message that would be
  spoken in the deployed phone call.
- Hosted run records live LLM evidence and a live Vapi call id/provider status.
- Replay command works from saved artifacts without credentials.

### Ticket 9.5: InsForge Deployment

Deploy the product-ready path.

Deliverables:

- Public HTTPS app URL.
- Hosted `POST /api/start-guide` live-mode smoke command evidence.
- Hosted `GET /api/visit-card/:id` command evidence.
- Deployed artifact proving live LLM and live Vapi provider modes.
- Real-phone test instructions.

Acceptance:

- `artifacts/run-summary.json` records `deployment.status = "deployed"`,
  `deployment.provider = "InsForge"`, a non-empty `deployed_url`, hosted API
  checks, live LLM evidence, and a live Vapi call id/status.

### Ticket 10: Verifier Rubric

Update verifier to match PRD rubric.

Required checks:

- `phone_visit_card_exists`
- `has_image_request`
- `has_voice_interaction`
- `has_multilingual_record`
- `has_next_recommendation`
- `live_visit_card_updated`

Deliverables:

- `sample-data/sample-verifier.json`.
- CLI or API verification command.
- Verifier rendered in Visit Card UI.

Acceptance:

- `npm run verify` or equivalent exits successfully and prints pass/fail checks.

### Ticket 11: Demo Report And Screenshots

Produce final judging package.

Deliverables:

- `DEMO_REPORT.md` with commands, local URL, screenshots, artifact paths,
  provider modes, known limitations, and fallback path.
- `artifacts/demo/start-page.png`.
- `artifacts/demo/calling-state.png`.
- `artifacts/demo/visit-card.png`.
- Latest Visit Card JSON and verifier JSON paths.

Acceptance:

- A judge can follow the report and understand the demo in 60-90 seconds.

## 9. Rubric Mapping

### Judge understands the problem in 30 seconds

Implementation:

- Start page copy: `Mira`, `Multi Modal Museum: Reflections of Light`, and a one-line
  promise.

Evidence:

- `artifacts/demo/start-page.png`.

### Complete workflow in 60-90 seconds

Implementation:

- One visible flow: phone -> language -> image -> call -> live Visit Card.

Evidence:

- Demo script in `DEMO_REPORT.md`.
- Browser screenshots.

### AI is necessary

Implementation:

- Live LLM evidence for image analysis and grounded guide generation in both
  local and deployed modes.
- Local Vapi mock evidence for safe development.
- Deployed live Vapi evidence for real phone interaction.

Evidence:

- Visit Card evidence block names provider mode and AI steps.

### Not just Claude

Implementation:

- Seeded Multi Modal Museum `Reflections of Light` context is used before generic model
  knowledge.
- Artifact includes source/evidence and limitation note.

Evidence:

- `sample-data/multimodal-museum-context.json`.
- Visit Card evidence block.

### Wow moment

Implementation:

- In local mode, mock call begins after upload without ringing a phone.
- In deployed mode, the user's phone rings after upload.
- Visit Card updates while the call progresses.

Evidence:

- `calling-state.png`, `visit-card.png`, and network/polling report.

### Final artifact exists

Implementation:

- Phone-linked Visit Card JSON and UI.

Evidence:

- `artifacts/*/visit-card.json`.
- `artifacts/demo/visit-card.png`.

### Verification

Implementation:

- Verifier JSON and UI checks.

Evidence:

- `npm run verify` output.
- `sample-data/sample-verifier.json`.

### Demo safety

Implementation:

- Local mode prevents accidental phone calls.
- Local mode prints the prepared phone guide content to terminal for review.
- Deployed mode is live by explicit environment/configuration.
- Replay mode remains available from saved sample artifacts.

Evidence:

- `DEMO_REPORT.md` fallback commands.
- Sample data files.
- `artifacts/run-summary.json` provider-mode and live-call evidence.
- Local command output or saved terminal transcript containing the guide script.

## 10. Compact Kickoff Prompt

Use this prompt to start an autonomous build agent:

```text
You are building Mira in /Users/xuantongyan/Documents/MultiModel.

Read AGENTS.md, PRD.md, README.md, package.json, src/cli.mjs, src/echoguide.mjs,
and sample-data/ before editing. Follow GOAL.md exactly.

Goal: build a demoable web app for the Multi Modal Museum's Reflections of Light
exhibition. The visitor enters a phone number, chooses language, uploads or
takes a photo, gets live LLM image/guide analysis, receives a real Vapi phone
guide call in deployed mode, and watches one phone-linked Visit Card update live
in the UI. Local mode must use live LLM requests but mock Vapi so it never rings
a phone, and it must print the exact guide script or Vapi first message to the
terminal for review. The Visit Card must include image analysis, language,
guide summary, visitor question or transcript, next recommendation, evidence,
limitations, and verifier checks.

Do not build museum admin, login, SMS, arbitrary museums, ticketing, maps, or a
full CMS. Use polling for P0 live Visit Card updates. Keep replay mode working.
Deploy to InsForge for the product-ready path. Do not mark deployed readiness
green unless the hosted app proves live LLM requests and a live Vapi call.

Work through GOAL.md tickets in order. Every important requirement must be
verified by a file, command, screenshot, URL, or report. Finish by running the
demo and verifier, capturing screenshots, and writing DEMO_REPORT.md with the
local URL, commands, artifact paths, provider modes, known limitations, and
fallback path.
```
