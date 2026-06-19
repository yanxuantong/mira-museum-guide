# MultiModel Hackathon Agent Guide

This project is a 3 to 3.5 hour hackathon build. The goal is not a complete
product. The goal is a demoable workflow artifact that judges can understand,
run, and verify quickly.

## North Star

Build one narrow multimodal workflow that produces a final artifact.

Success means:

- Judges understand the problem in 30 seconds.
- Judges see the complete workflow in 60-90 seconds.
- The system produces a concrete final artifact.
- The artifact includes evidence, verification, and a simple rubric.
- Demo failure is protected by sample data, replay mode, and a recorded path.

Do not optimize for feature count. Optimize for a crisp before/after workflow.

## Sponsor Strategy

Use sponsors when they strengthen the demo without slowing the MVP.

- Nebius Token Factory: default LLM path for multimodal reasoning, extraction,
  summarization, scoring, or artifact generation. Keep API keys server-side or
  in local env files. Do not build a multi-provider abstraction unless needed
  for the demo.
- Vapi: use only if voice is part of the core workflow, such as voice capture,
  voice-based review, or a spoken demo agent. Prepare prerecorded audio or text
  fallback.
- Insforge: use for the simplest backend state and artifact persistence if a
  backend is needed. Keep the schema tiny: sessions, inputs, artifacts,
  evaluations.

Sponsor usage is a demo advantage, not a reason to expand scope.

## MVP Shape

The workflow should have exactly one primary user path:

1. User provides multimodal input.
2. System extracts or interprets the input.
3. Agent performs one bounded transformation or decision.
4. System generates a final artifact.
5. Verifier checks the artifact against a small rubric.
6. Demo shows the artifact, evidence, and pass/fail result.

Prefer a single-page app or a minimal local web workflow. Avoid sign-in,
complex onboarding, settings pages, team management, billing, and broad
assistant behavior.

## Final Artifact Requirement

Every successful run must create an artifact that can stand alone in judging.

Good artifact examples:

- A structured report with source evidence and scores.
- A generated checklist with pass/fail verification.
- A transformed media summary with timestamps and extracted facts.
- A decision memo with input references and confidence notes.
- A replayable JSON file plus a human-readable Markdown or HTML view.

The artifact must include:

- Input summary.
- What the agent did.
- Evidence used.
- Rubric result.
- Known limitations.
- Timestamp or run id.

## Verifier And Rubric

Implement a small verifier before adding more features.

The verifier should answer:

- Did the workflow finish?
- Does the artifact exist?
- Does it include the required fields?
- Are evidence references present?
- Did the output satisfy the demo rubric?

Keep the rubric short, ideally 3-5 checks. A simple JSON result is enough:

```json
{
  "passed": true,
  "checks": [
    { "name": "artifact_exists", "passed": true },
    { "name": "has_evidence", "passed": true },
    { "name": "rubric_complete", "passed": true }
  ]
}
```

## Demo Safety

The demo must survive API, network, and live input failures.

Required safeguards:

- `sample-data/` with at least one complete input set.
- Replay mode that loads a saved run without calling external APIs.
- Mock mode for sponsor APIs if credits, keys, or latency fail.
- A short recorded walkthrough once the happy path works.
- Clear fallback order: live run -> replay run -> recorded demo.

Do not wait until the end to create sample data. Build it early.

## Time Budget

Use this default 3-hour plan:

- 0:00-0:20: pick the narrow workflow, define artifact schema, define rubric.
- 0:20-1:20: implement the core path with sample data.
- 1:20-2:00: connect one sponsor API where it visibly matters.
- 2:00-2:30: implement verifier, replay mode, and artifact viewer.
- 2:30-3:00: polish demo script, record fallback, fix only blocking bugs.
- 3:00-3:30: buffer only. No new major features.

After the 2-hour mark, do not add new product surface unless the core demo is
already stable.

## Scope Rules

Always choose the smallest version that proves the workflow.

Do:

- Use hardcoded sample cases when useful.
- Prefer one route, one page, one artifact schema.
- Log intermediate state for demo clarity.
- Show sponsor usage visibly in the UI or artifact.
- Make failure states explicit.

Do not:

- Build a generic multimodal assistant.
- Build a marketplace, dashboard suite, or full account system.
- Add multi-agent orchestration unless the demo requires it.
- Add complex auth, permissions, billing, or deployment automation.
- Spend time on perfect styling before the workflow works.
- Hide all reasoning in logs that judges cannot see.

## Agent Working Rules

When working on this repo:

- Start by identifying the shortest demoable workflow.
- Keep implementation changes tightly scoped.
- Prefer readable code and explicit data flow over abstractions.
- Verify with an actual sample run before declaring success.
- If live sponsor APIs fail, switch to mock or replay and document it.
- Keep secrets out of source control and artifacts.
- Preserve this file as the project-level source of truth unless the user
  explicitly updates the hackathon direction.

## Demo Script Template

Use this script structure:

1. Problem: "Teams lose time turning multimodal input into a trusted result."
2. Input: show the image/audio/video/text sample.
3. Agent step: show extraction, transformation, or decision.
4. Artifact: show the final report/checklist/output.
5. Verification: show rubric pass/fail and evidence.
6. Sponsor note: name where Nebius, Vapi, or Insforge is used.
7. Fallback: mention replay/sample mode if live services fail.

## Definition Of Done

The MVP is done when:

- A sample input can run end to end.
- A final artifact is generated.
- The verifier produces a pass/fail result.
- The demo can be replayed without live APIs.
- Sponsor usage is either implemented or clearly stubbed with the integration
  point visible.
- A 60-90 second demo script can be followed without explaining hidden steps.

<!-- INSFORGE:START -->
## InsForge backend

This project uses [InsForge](https://insforge.dev): an all-in-one, open-source Postgres-based backend (BaaS) that gives this app a database, authentication, file storage, edge functions, realtime, an AI model gateway, and payments through one platform.

- **Project:** **MultiModel** (API base `https://5b7aw6n2.us-east.insforge.app`)
- **Skills:** these InsForge skills are installed for supported coding agents. Reach for them before implementing any InsForge feature instead of guessing the API:
  - `insforge`: app code with the `@insforge/sdk` client (database CRUD, auth, storage, edge functions, realtime, AI, email, and Stripe payments).
  - `insforge-cli`: backend and infrastructure via the `insforge` CLI (projects, SQL, migrations, RLS policies, storage buckets, functions, secrets, payment setup, schedules, deploys).
  - `insforge-debug`: diagnosing failures (SDK/HTTP errors, RLS denials, auth and OAuth issues) and running security or performance audits.
  - `insforge-integrations`: wiring external auth providers (Clerk, Auth0, WorkOS, Better Auth, etc.) for JWT-based RLS, or the OKX x402 payment facilitator.
  - `find-skills`: discovering additional skills on demand.
- **Credentials:** app code reads keys from `.env.local`; the CLI reads `.insforge/project.json`. Never hardcode or commit keys.

Key patterns:

- Database inserts take an array: `insert([{ ... }])`.
- Reference users with `auth.users(id)`; use `auth.uid()` in RLS policies.
- For storage uploads, persist both the returned `url` and `key`.
<!-- INSFORGE:END -->
