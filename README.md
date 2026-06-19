# Mira Product-Ready Demo

Mira is a phone-first guide for the fictional Multi Modal Museum's
`Reflections of Light` exhibition.

Current target:

```text
Mira · Multi Modal Museum: Reflections of Light
```

The first screen is the product flow: phone number, language, image upload, and
`Call My Guide`. The Visit Card shown to visitors is intentionally simple:
`Guide Summary` and `Next Recommendation`. Verification evidence, limitations,
provider modes, and rubric checks are kept in JSON artifacts for judging.

## Runtime Modes

- **Local product preview:** live Nebius LLM, mock Vapi, no real phone call.
  The terminal prints `PHONE GUIDE PREVIEW` with the exact first message that
  would be spoken.
- **Deployed phone test:** InsForge Site + Edge Function, live Nebius LLM, live
  Vapi outbound call.
- **Replay:** saved fallback only; not the product-ready success path.

## Local Safe Test

```bash
npm run demo
```

Expected behavior:

- Uses live Nebius for image identification and guide generation.
- Uses mock Vapi only.
- Does not place a real phone call.
- Prints `PHONE GUIDE PREVIEW`.
- Writes `artifacts/local/phone-guide-preview.txt`.
- Writes `artifacts/local/llm-image-debug.json`.

Run the local web app:

```bash
npm run dev
```

Open the printed URL, usually `http://127.0.0.1:4173`.

## Hosted InsForge Demo

- Site: https://5b7aw6n2.insforge.site
- API base: https://5b7aw6n2.function2.insforge.app/mira-api
- Function: `mira-api`

Hosted API proof is written to:

- `artifacts/deployment/insforge-proof.json`
- `artifacts/deployment/start-page-response.txt`
- `artifacts/deployment/start-guide-response.txt`
- `artifacts/deployment/visit-card-response.txt`
- `artifacts/deployment/vapi-live-call-proof.json`

Run hosted smoke:

```bash
MIRA_EXPECT_LIVE_VAPI=true npm run smoke:hosted
```

This command can place a real outbound phone call. If Vapi returns a provider
quota error, the failure is recorded instead of hidden.

## Real-Phone Test

1. Open https://5b7aw6n2.insforge.site on the phone.
2. Confirm the phone field is prefilled and language is English.
3. Upload or capture an image.
4. Tap `Call My Guide`.
5. The hosted function calls live Nebius and attempts a live Vapi outbound call.
6. If Vapi reports a daily outbound-call limit, wait for quota reset or use an
   imported Twilio number in Vapi.

## Evidence Pipeline

```bash
npm run orchestrate
```

This command:

- runs live local guide preview without a phone call
- runs the replay fallback
- creates and polls a local Visit Card
- runs `npm run verify`
- captures iPhone-sized screenshots
- reads `done.rubric.json`
- grades every critical criterion against real evidence
- writes `DEMO_REPORT.md`
- writes `artifacts/run-summary.json`
- exits nonzero if any critical criterion is red

Proof files:

- `artifacts/demo/start-page.png`
- `artifacts/demo/calling-state.png`
- `artifacts/demo/visit-card.png`
- `artifacts/demo/visit-card-full.png`
- `artifacts/latest-visit-card.json`
- `sample-data/sample-visit-card.json`
- `sample-data/sample-verifier.json`
- `artifacts/run-summary.json`
- `DEMO_REPORT.md`

## Image Debug

```bash
npm run debug:llm-image
```

For the current sample image, the live vision call identifies the likely work as
`Water Lilies` by `Claude Monet` with high confidence. The proof file is
`artifacts/local/llm-image-debug.json`.

## Verify

```bash
npm run verify
```

The verifier checks:

- `phone_visit_card_exists`
- `has_image_request`
- `has_voice_interaction`
- `has_multilingual_record`
- `has_next_recommendation`
- `live_visit_card_updated`

## Replay Fallback

```bash
npm run demo:replay
```

Replay uses saved sample artifacts and mock providers. It is useful for a
fallback demo if live LLM/Vapi is unavailable, but it is not the product-ready
success path.
