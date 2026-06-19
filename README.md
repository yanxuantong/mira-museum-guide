# Mira

Mira is a phone-first AI museum guide for the fictional **Multi Modal Museum:
Reflections of Light** exhibition.

Visitors open the web app, enter a phone number, choose a language, upload or
capture an artwork image, receive an AI guide call, and watch a phone-linked
Visit Card update in the browser.

- Live demo: [https://5b7aw6n2.insforge.site](https://5b7aw6n2.insforge.site)
- Demo deck: [docs/Hackathon_Demo_Website.pdf](docs/Hackathon_Demo_Website.pdf)
- Hosted API: `https://5b7aw6n2.function2.insforge.app/mira-api`

## What It Demonstrates

Mira is intentionally narrow: one visitor, one exhibition, one artifact.

The demo combines:

- multimodal artwork input
- live LLM image identification and guide generation
- outbound voice through Vapi in the deployed flow
- a mobile-first Visit Card keyed by phone
- replayable sample data and verifier artifacts for judging

The visitor-facing Visit Card stays simple: it shows the guide summary and the
next recommendation. The deeper evidence, limitations, provider modes, and
verifier results are stored in JSON artifacts for review.

## Product Flow

1. Open Mira on a phone.
2. Confirm the prefilled phone number and English language setting.
3. Upload or capture an artwork image.
4. Tap `Call My Guide`.
5. Mira generates a factual exhibit-style guide script.
6. The deployed backend attempts a live Vapi outbound call.
7. The Visit Card updates with the guide summary and next stop.

## Runtime Modes

### Local Preview

Local preview uses live Nebius LLM calls but mocks Vapi. It never places a real
phone call.

```bash
npm run demo
```

Expected output:

- `PHONE GUIDE PREVIEW` printed in the terminal
- live LLM model and response id
- artwork identification result
- `Vapi: mock`
- `Live phone call happened: false`

### Local Web App

```bash
npm run dev
```

Open the printed URL, usually:

```text
http://127.0.0.1:4173
```

The local web app uses the same visitor interface, but the phone call remains
mocked for safety.

### Hosted Phone Test

```bash
MIRA_EXPECT_LIVE_VAPI=true npm run smoke:hosted
```

This command hits the deployed InsForge backend and can place a real outbound
phone call through Vapi.

If Vapi returns a daily outbound-call limit or provider error, the failure is
recorded in the hosted smoke output instead of hidden.

## Evidence And Verification

Run the full evidence pipeline:

```bash
npm run orchestrate
```

The orchestrator:

- runs the live local guide preview
- runs replay fallback
- creates and polls a local Visit Card
- runs verifier checks
- captures mobile-sized screenshots
- grades `done.rubric.json` against real evidence
- writes `DEMO_REPORT.md`
- writes `artifacts/run-summary.json`

The main verifier command is:

```bash
npm run verify
```

Verifier checks include:

- `phone_visit_card_exists`
- `has_image_request`
- `has_voice_interaction`
- `has_multilingual_record`
- `has_next_recommendation`
- `live_visit_card_updated`

## Replay Fallback

Replay mode uses saved sample artifacts and mock providers:

```bash
npm run demo:replay
```

Replay is a presentation fallback, not the product-ready success path.

## Project Structure

```text
public/                 mobile-first web UI
src/server.mjs          local web server and API
src/mira.mjs            Visit Card workflow and verifier
src/guide-provider.mjs  live LLM guide generation
src/hosted-smoke.mjs    hosted API smoke test
insforge/functions/     deployed Edge Function
sample-data/            seeded exhibition context and replay data
docs/                   public demo deck PDF
```

## Provider Notes

- **Nebius** powers live image identification and guide generation.
- **Vapi** powers live outbound calls in the deployed flow.
- **InsForge** hosts the public site and Edge Function backend.

Secrets are not committed. Use local `.env` files and InsForge secrets for live
provider credentials.

## Scope

Mira is not a generic museum platform. There is no admin UI, login, SMS flow,
ticketing, or collection CMS. The MVP focuses on one complete, verifiable
visitor workflow for `Multi Modal Museum: Reflections of Light`.
