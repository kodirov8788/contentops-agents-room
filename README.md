# ContentOps Agents Room

Local visual control room for the daily Uzbek ContentOps pipeline.

## Start

The dashboard uses `http://127.0.0.1:4817` (the user-facing alias is `http://localhost:4817`).

```bash
cd /Users/Kodirovdev/.codex/.chatgpt-projects/g-p-69b04c0df5f08191b78182f7fb0ce263/contentops
npm install
npm run dev
```

The DeepSeek key is read server-side from:

```text
/Users/Kodirovdev/.codex/.chatgpt-projects/g-p-69b04c0df5f08191b78182f7fb0ce263/contentops/.env.local
```

For compatibility with the existing workspace setup, the server also checks the parent project `.env.local`. Keep `DEEPSEEK_API_KEY` in one of those ignored files; never place the real key in GitHub.

The browser never receives the key. The sidebar's “Test API connection” button calls the local backend proxy and runs a minimal `deepseek-v4-flash` JSON check.

## Current room

- 3D animated seven-stage office room inspired by the supplied reference: Research, Topic Planner, Script & Localize, Editor, Visuals, Human Approval, and Publish.
- The reusable `AgentDesk` scene uses procedural meshes only. Idle desks are dimmed; the active desk glows and gently bounces. OrbitControls supports an isometric-style orbit.
- `Start Job`, `Pause Job`, and `Resume Job` run the visual state machine. The overlay reports the active stage, progress, and selected workstation.
- At 7/7 the room shows a demo Uzbek result package. This visual demo package is intentionally separate from the SQLite-backed production run below.
- Evidence health, pipeline timeline, approval state, and DeepSeek quota are visible in the same room.
- Runs, Evidence, Approval, Analytics, and Knowledge navigation items open working views backed by the same SQLite snapshot.
- The surrounding dashboard polls a durable local SQLite run state and keeps its own agent inspector and timeline.
- The visual scene has a reduced-motion fallback; a 1024px layout was checked in the browser and the scene remains usable at the desktop breakpoint.
- Publishing remains human-approved and is not sent to Instagram or Telegram by this local build.

The standalone scene component lives at `src/AgentPipelineDemo.tsx`; it can be dropped into another Vite or Next.js R3F page without the SQLite dashboard wrapper.

## Local orchestration

The Vite server creates `data/contentops.sqlite` using Node 22's built-in SQLite driver. The database stores runs, agent events, claims, and approvals; the SQLite files are ignored by Git.

Node 22.5+ is required because the local database uses the built-in `node:sqlite` driver.

Useful local endpoints:

- `GET /api/run/current` — current run, agents, event trace, claims, and approval state.
- `GET /api/runs` — recent durable runs.
- `POST /api/runs/start` — start a new research → fact-check → script → visuals → approval run.
- `POST /api/runs/:id/approve` — record human approval without publishing.
- `GET /api/deepseek/check` — server-side DeepSeek connectivity check.

Approval is rejected with HTTP 409 until a run reaches `awaiting_approval`; publishing is intentionally still manual.

Model routing is intentionally conservative: DeepSeek V4 Flash performs the structured fact-check call; GPT/Codex subscription work is represented as a handoff because a ChatGPT subscription is not an embeddable API credential. No Claude dependency is used.

The research packet in the demo run is based on official repository sources reviewed during implementation. Replace it with a scheduled GPT/Codex web-research job before treating it as a production daily source feed. The seven-stage room animation is a UI simulation and does not claim that the backend has already completed each of those seven production roles.

## Build

```bash
npm run build
```

The app intentionally uses a local-first setup. The current build is a working control-room foundation: it persists state, executes a real DeepSeek verification request, exposes an approval boundary, and keeps publishing/analytics integrations behind explicit credentials and operator approval.
