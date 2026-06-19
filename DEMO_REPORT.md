# Mira Demo Report

## Mode Policy

- Local: live LLM, mock Vapi, no real phone call.
- Local guide preview: `artifacts/local/phone-guide-preview.txt`.
- Deployed: InsForge Site + Edge Function, live LLM, live Vapi when provider quota permits.
- Replay: `npm run demo:replay` fallback only.

## Local Proof

- `npm run demo`: exit 0
- `npm run verify`: exit 0
- Local LLM mode: live
- Local Vapi mode: mock
- Local phone call happened: false
- Artwork identification: Water Lilies by Claude Monet, confidence high
- LLM image debug: `artifacts/local/llm-image-debug.json`

## Hosted Proof

- Hosted URL: https://5b7aw6n2.insforge.site
- API base: https://5b7aw6n2.function2.insforge.app/mira-api
- Hosted POST status: 200
- Hosted GET status: 200
- Hosted LLM mode: live
- Hosted Vapi mode: live
- Live Vapi call proof: `artifacts/deployment/vapi-live-call-proof.json`
- Latest hosted Vapi blocker: none

## Screenshots

- Start page: `artifacts/demo/start-page.png`
- Calling state: `artifacts/demo/calling-state.png`
- Visit Card: `artifacts/demo/visit-card.png`
- Full Visit Card: `artifacts/demo/visit-card-full.png`

## Verification

- Verifier passed: true
- Poll endpoint: `/api/visit-card/:id`
- Poll count: 7
- Observed state changes: 1

## 60-90 Second Script

Mira opens directly to the Multi Modal Museum: Reflections of Light visitor flow. The visitor enters a phone number, keeps English selected, uploads a photo, and starts the guide. In local mode, Mira makes a live Nebius image/guide request, identifies the sample as likely Monet's Water Lilies, prints the exact phone guide preview, and records a mock Vapi call with no real phone call. In deployed mode, the InsForge function makes the same live LLM guide request and calls Vapi. The Visit Card shows only the guide summary and next recommendation to the visitor, while artifacts keep evidence, limitations, and verifier results.

## Real-phone Test

1. Open https://5b7aw6n2.insforge.site on the phone.
2. Confirm the phone field is prefilled and language is English.
3. Upload or capture an image.
4. Tap `Call My Guide`.
5. The hosted function will attempt a live Vapi outbound call. If Vapi reports a daily call limit, wait for quota reset or switch to an imported Twilio number in Vapi.

## Fallback

Use `npm run demo:replay` for saved replay mode. It is a fallback path, not product-ready success evidence.
