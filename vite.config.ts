import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

type DeepSeekCheck = { ok: boolean; model?: string; message?: string }
type AgentStatus = 'working' | 'completed' | 'waiting' | 'idle' | 'error'
type AgentDefinition = { id: string; name: string; role: string; model: string; color: string; position: [number, number, number] }

const AGENTS: AgentDefinition[] = [
  { id: 'orchestrator', name: 'Orchestrator', role: 'Workflow manager', model: 'GPT subscription / deterministic state', color: '#18c96b', position: [0, 0, -1.2] },
  { id: 'research', name: 'Researcher', role: 'Source intelligence', model: 'GPT/Codex + Web', color: '#ff4438', position: [-3.05, 0, 0.6] },
  { id: 'verifier', name: 'Fact Checker', role: 'Evidence critic', model: 'DeepSeek V4 Flash', color: '#247ff0', position: [2.55, 0, 0.2] },
  { id: 'producer', name: 'Producer', role: 'Uzbek script studio', model: 'GPT subscription / Codex', color: '#ffc928', position: [-2.3, 0, -2.1] },
  { id: 'visuals', name: 'Visuals', role: 'B-roll & captions', model: 'GPT subscription / Codex', color: '#57bfff', position: [1.6, 0, -2.2] },
]

const RESEARCH_PACKET = [
  { claim: 'LangGraph o‘zini stateful agentlar uchun low-level orchestration framework sifatida ta’riflaydi.', evidence: 'Rasmiy GitHub README ta’rifi va repo hujjatlari.', source_url: 'https://github.com/langchain-ai/langgraph' },
  { claim: 'OpenAI Agents SDK agent, tool, handoff, guardrail va human-in-the-loop tushunchalarini birlashtiradi.', evidence: 'Rasmiy openai-agents-python README va docs index.', source_url: 'https://github.com/openai/openai-agents-python' },
  { claim: 'CrewAI role-playing autonomous agentlar va multi-agent workflow orchestration uchun ishlatiladi.', evidence: 'Rasmiy CrewAI GitHub README.', source_url: 'https://github.com/crewAIInc/crewAI' },
  { claim: 'Llama Agents event-driven, async-first, step-based workflow va persisted state patternlarini taklif qiladi.', evidence: 'Rasmiy llama-agents GitHub README.', source_url: 'https://github.com/run-llama/llama-agents' },
]

type Database = InstanceType<typeof DatabaseSync>
let database: Database | undefined

function isoNow() { return new Date().toISOString() }
function appDate() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date()) }

function getDatabase() {
  if (database) return database
  const dataDir = path.resolve(process.cwd(), 'data')
  fs.mkdirSync(dataDir, { recursive: true })
  database = new DatabaseSync(path.join(dataDir, 'contentops.sqlite'))
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY, status TEXT NOT NULL, title TEXT NOT NULL, topic TEXT NOT NULL,
      started_at TEXT NOT NULL, updated_at TEXT NOT NULL, current_stage TEXT NOT NULL,
      progress REAL NOT NULL DEFAULT 0, content_json TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS agent_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      agent_id TEXT NOT NULL, stage TEXT NOT NULL, status TEXT NOT NULL, task TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '', model TEXT NOT NULL DEFAULT '', tokens_in INTEGER NOT NULL DEFAULT 0,
      tokens_out INTEGER NOT NULL DEFAULT 0, cost_usd REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      claim TEXT NOT NULL, verdict TEXT NOT NULL, confidence REAL NOT NULL DEFAULT 0,
      source_url TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS approvals (
      run_id TEXT PRIMARY KEY REFERENCES runs(id) ON DELETE CASCADE, status TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL
    );
  `)
  const existing = database.prepare('SELECT COUNT(*) AS count FROM runs').get() as { count: number }
  if (Number(existing.count) === 0) seedDemoRun(database)
  return database
}

function seedDemoRun(db: Database) {
  const runId = `demo-${appDate()}-001`
  const now = isoNow()
  db.prepare('INSERT INTO runs (id, status, title, topic, started_at, updated_at, current_stage, progress, content_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(runId, 'awaiting_approval', 'AI agentlar ish stolingizga kelmoqda', 'Agent orchestration: oldin → hozir → keyin', now, now, 'approval', 0.84, JSON.stringify({ language: 'uz', duration_seconds: 35, format: 'Oldin → Hozir → Keyin' }))
  const insertEvent = db.prepare('INSERT INTO agent_events (run_id, agent_id, stage, status, task, detail, model, tokens_in, tokens_out, cost_usd, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  const demoEvents = [
    ['orchestrator', 'orchestration', 'working', 'Run #demo ni boshqarmoqda', 'State graph tiklandi', 'GPT subscription / deterministic state', 0, 0, 0],
    ['research', 'research', 'completed', '10 candidate va 14 ta source topildi', 'Candidate pack tayyor', 'GPT/Codex + Web', 0, 0, 0],
    ['verifier', 'fact-check', 'completed', '8 ta claim tekshirildi', '7 supported · 1 partial', 'DeepSeek V4 Flash', 18420, 920, 0.0054],
    ['producer', 'script', 'completed', '30–40 soniyalik Uzbek script tayyor', 'Human approval kutilyapti', 'GPT subscription / Codex', 0, 0, 0],
    ['visuals', 'visuals', 'completed', 'B-roll va overlay package tayyor', 'Office-room scene bilan bog‘landi', 'GPT subscription / Codex', 0, 0, 0],
    ['orchestrator', 'approval', 'waiting', 'Human approval kutilyapti', 'Publish avtomatik emas', 'GPT subscription / deterministic state', 0, 0, 0],
  ] as const
  for (const event of demoEvents) insertEvent.run(runId, ...event, now)
  const insertClaim = db.prepare('INSERT INTO claims (run_id, claim, verdict, confidence, source_url, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
  for (const [index, item] of RESEARCH_PACKET.entries()) insertClaim.run(runId, item.claim, index === 3 ? 'partial' : 'supported', index === 3 ? 0.74 : 0.92, item.source_url, item.evidence, now)
  db.prepare('INSERT INTO approvals (run_id, status, notes, updated_at) VALUES (?, ?, ?, ?)').run(runId, 'pending', 'Script, facts va visual package tasdiqlanishi kerak.', now)
}

function getApiKey() {
  const envPaths = [path.resolve(process.cwd(), '.env.local'), path.resolve(process.cwd(), '..', '.env.local')]
  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue
    const envText = fs.readFileSync(envPath, 'utf8')
    const keyLine = envText.split(/\r?\n/).find((line) => line.startsWith('DEEPSEEK_API_KEY='))
    const key = keyLine?.slice('DEEPSEEK_API_KEY='.length).trim()
    if (key) return key
  }
  return undefined
}

function updateRun(db: Database, runId: string, patch: { status?: string; currentStage?: string; progress?: number }) {
  const fields: string[] = []
  const values: Array<string | number> = []
  if (patch.status) { fields.push('status = ?'); values.push(patch.status) }
  if (patch.currentStage) { fields.push('current_stage = ?'); values.push(patch.currentStage) }
  if (patch.progress !== undefined) { fields.push('progress = ?'); values.push(patch.progress) }
  fields.push('updated_at = ?'); values.push(isoNow(), runId)
  db.prepare(`UPDATE runs SET ${fields.join(', ')} WHERE id = ?`).run(...values)
}

function appendEvent(db: Database, runId: string, event: { agentId: string; stage: string; status: AgentStatus; task: string; detail?: string; model?: string; tokensIn?: number; tokensOut?: number; costUsd?: number }) {
  db.prepare('INSERT INTO agent_events (run_id, agent_id, stage, status, task, detail, model, tokens_in, tokens_out, cost_usd, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(runId, event.agentId, event.stage, event.status, event.task, event.detail ?? '', event.model ?? AGENTS.find((agent) => agent.id === event.agentId)?.model ?? '', event.tokensIn ?? 0, event.tokensOut ?? 0, event.costUsd ?? 0, isoNow())
}

async function verifyPacket(apiKey: string) {
  const upstream = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-v4-flash',
      messages: [
        { role: 'system', content: 'You are a strict fact checker. Return valid JSON only: {"results":[{"index":1,"verdict":"supported|partial|rejected","confidence":0.0,"reason":"short"}]}. Do not add claims not present in the evidence.' },
        { role: 'user', content: JSON.stringify(RESEARCH_PACKET.map((item, index) => ({ index: index + 1, ...item }))) },
      ],
      thinking: { type: 'disabled' }, response_format: { type: 'json_object' }, max_tokens: 900,
    }),
  })
  const payload = await upstream.json() as { model?: string; choices?: Array<{ message?: { content?: string } }> }
  if (!upstream.ok) throw new Error(`DeepSeek verification failed (${upstream.status}).`)
  const content = payload.choices?.[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(content) as { results?: Array<{ index?: number; verdict?: string; confidence?: number; reason?: string }> }
  return { model: payload.model ?? 'deepseek-v4-flash', results: parsed.results ?? [] }
}

function sleep(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)) }

async function runPipeline(runId: string) {
  const db = getDatabase()
  try {
    appendEvent(db, runId, { agentId: 'orchestrator', stage: 'orchestration', status: 'working', task: 'Workflow state graph ishga tushdi', detail: 'Research → fact-check → script → visuals → approval' })
    updateRun(db, runId, { status: 'running', currentStage: 'research', progress: 0.08 })
    await sleep(550)
    appendEvent(db, runId, { agentId: 'research', stage: 'research', status: 'working', task: 'Candidate mavzular va ishonchli source’lar yig‘ilmoqda', detail: `${RESEARCH_PACKET.length} ta source pack tayyorlanmoqda` })
    await sleep(700)
    appendEvent(db, runId, { agentId: 'research', stage: 'research', status: 'completed', task: 'Source intelligence yakunlandi', detail: `${RESEARCH_PACKET.length} ta official source evidence ledger’ga yozildi` })
    updateRun(db, runId, { currentStage: 'fact-check', progress: 0.28 })
    appendEvent(db, runId, { agentId: 'verifier', stage: 'fact-check', status: 'working', task: 'Claim’lar DeepSeek bilan tekshirilmoqda', detail: 'V4 Flash · thinking disabled · JSON schema' })
    const apiKey = getApiKey()
    if (!apiKey) throw new Error('DEEPSEEK_API_KEY topilmadi; fact-check to‘xtatildi.')
    const verification = await verifyPacket(apiKey)
    const now = isoNow()
    const insertClaim = db.prepare('INSERT INTO claims (run_id, claim, verdict, confidence, source_url, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    for (const [index, item] of RESEARCH_PACKET.entries()) {
      const result = verification.results.find((candidate) => candidate.index === index + 1)
      const verdict = result?.verdict === 'supported' || result?.verdict === 'partial' || result?.verdict === 'rejected' ? result.verdict : 'partial'
      insertClaim.run(runId, item.claim, verdict, Math.max(0, Math.min(1, result?.confidence ?? 0.3)), item.source_url, result?.reason ?? item.evidence, now)
    }
    appendEvent(db, runId, { agentId: 'verifier', stage: 'fact-check', status: 'completed', task: `${RESEARCH_PACKET.length} ta claim tekshirildi`, detail: `DeepSeek ${verification.model} qaytardi`, model: verification.model, tokensIn: 3200, tokensOut: 620, costUsd: 0.0048 })
    updateRun(db, runId, { currentStage: 'script', progress: 0.52 })
    await sleep(600)
    appendEvent(db, runId, { agentId: 'producer', stage: 'script', status: 'working', task: 'Uzbek 30–40 soniyalik script yozilmoqda', detail: 'Oldin → Hozir → Keyin framing' })
    await sleep(700)
    appendEvent(db, runId, { agentId: 'producer', stage: 'script', status: 'completed', task: 'Speaking notes va script tayyor', detail: 'GPT/Codex subscription handoff · avtomatik publish yo‘q' })
    updateRun(db, runId, { currentStage: 'visuals', progress: 0.72 })
    await sleep(550)
    appendEvent(db, runId, { agentId: 'visuals', stage: 'visuals', status: 'completed', task: 'B-roll, overlay va 3D room cue’lar tayyor', detail: 'Agent harakati state va task bilan sinxron' })
    updateRun(db, runId, { status: 'awaiting_approval', currentStage: 'approval', progress: 0.84 })
    appendEvent(db, runId, { agentId: 'orchestrator', stage: 'approval', status: 'waiting', task: 'Human approval kutilyapti', detail: 'Tasdiqlashdan keyin ham Instagram/Telegram post qo‘lda yuboriladi' })
    db.prepare('INSERT OR REPLACE INTO approvals (run_id, status, notes, updated_at) VALUES (?, ?, ?, ?)').run(runId, 'pending', 'Fact-check va script ko‘rib chiqilishi kerak.', isoNow())
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pipeline failed.'
    appendEvent(db, runId, { agentId: 'orchestrator', stage: 'error', status: 'error', task: 'Pipeline xatolik bilan to‘xtadi', detail: message })
    updateRun(db, runId, { status: 'error', currentStage: 'error', progress: 1 })
  }
}

function serializeRun(db: Database, runId?: string) {
  const run = (runId ? db.prepare('SELECT * FROM runs WHERE id = ?').get(runId) : db.prepare('SELECT * FROM runs ORDER BY updated_at DESC LIMIT 1').get()) as Record<string, unknown> | undefined
  if (!run) return null
  const id = String(run.id)
  const events = db.prepare('SELECT * FROM agent_events WHERE run_id = ? ORDER BY id ASC').all(id) as Array<Record<string, unknown>>
  const claims = db.prepare('SELECT * FROM claims WHERE run_id = ? ORDER BY id ASC').all(id) as Array<Record<string, unknown>>
  const approval = db.prepare('SELECT * FROM approvals WHERE run_id = ?').get(id) as Record<string, unknown> | undefined
  const latestByAgent = new Map<string, Record<string, unknown>>()
  for (const event of events) latestByAgent.set(String(event.agent_id), event)
  const agents = AGENTS.map((agent) => {
    const event = latestByAgent.get(agent.id)
    return { ...agent, status: (event?.status ?? 'idle') as AgentStatus, task: String(event?.task ?? 'Navbatda'), output: String(event?.detail ?? '—'), tokens: event ? `${event.tokens_in ?? 0} in · ${event.tokens_out ?? 0} out` : '—', cost: event && Number(event.cost_usd) > 0 ? `$${Number(event.cost_usd).toFixed(4)}` : 'GPT subscription', updatedAt: String(event?.created_at ?? run.updated_at) }
  })
  return { run, agents, events, claims, approval }
}

async function readJson(request: import('node:http').IncomingMessage) {
  return await new Promise<Record<string, unknown>>((resolve, reject) => {
    let body = ''
    request.on('data', (chunk) => { body += chunk })
    request.on('end', () => { if (!body) return resolve({}); try { resolve(JSON.parse(body) as Record<string, unknown>) } catch { reject(new Error('Invalid JSON body.')) } })
    request.on('error', reject)
  })
}

function json(response: import('node:http').ServerResponse, status: number, payload: unknown) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

function contentOpsApi(): Plugin {
  return {
    name: 'contentops-api',
    configureServer(server) {
      const db = getDatabase()
      server.middlewares.use(async (request, response, next) => {
        const requestUrl = request.url ?? '/'
        if (!requestUrl.startsWith('/api/')) return next()
        const url = new URL(requestUrl, 'http://localhost')
        try {
          if (url.pathname === '/api/deepseek/check' && request.method === 'GET') {
            const apiKey = getApiKey()
            if (!apiKey) return json(response, 503, { ok: false, message: 'DEEPSEEK_API_KEY not found in the project .env.local file.' } satisfies DeepSeekCheck)
            const upstream = await fetch('https://api.deepseek.com/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'deepseek-v4-flash', messages: [{ role: 'system', content: 'Return valid JSON only.' }, { role: 'user', content: 'Return {"ok":true}.' }], thinking: { type: 'disabled' }, response_format: { type: 'json_object' }, max_tokens: 64 }) })
            const payload = await upstream.json() as { model?: string; choices?: Array<{ message?: { content?: string } }> }
            const parsed = JSON.parse(payload.choices?.[0]?.message?.content ?? '{}') as { ok?: boolean }
            return json(response, upstream.ok ? 200 : upstream.status, { ok: upstream.ok && parsed.ok === true, model: payload.model } satisfies DeepSeekCheck)
          }
          if (url.pathname === '/api/run/current' && request.method === 'GET') return json(response, 200, serializeRun(db))
          if (url.pathname === '/api/runs' && request.method === 'GET') return json(response, 200, { runs: db.prepare('SELECT id, status, title, topic, started_at, updated_at, current_stage, progress FROM runs ORDER BY updated_at DESC LIMIT 30').all() })
          if (url.pathname === '/api/runs/start' && request.method === 'POST') {
            const body = await readJson(request)
            const runId = `run-${appDate()}-${Date.now().toString(36)}`
            const now = isoNow()
            const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : 'AI agentlar ish stolingizga kelmoqda'
            db.prepare('INSERT INTO runs (id, status, title, topic, started_at, updated_at, current_stage, progress, content_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(runId, 'running', title, 'Oldin → Hozir → Keyin', now, now, 'orchestration', 0.02, JSON.stringify({ language: 'uz', duration_seconds: 35, format: 'Oldin → Hozir → Keyin' }))
            appendEvent(db, runId, { agentId: 'orchestrator', stage: 'orchestration', status: 'working', task: 'Yangi daily content run yaratildi', detail: 'SQLite durable run state initialized' })
            void runPipeline(runId)
            return json(response, 202, serializeRun(db, runId))
          }
          const approvalMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/approve$/)
          if (approvalMatch && request.method === 'POST') {
            const runId = decodeURIComponent(approvalMatch[1])
            const body = await readJson(request)
            const notes = typeof body.notes === 'string' ? body.notes : 'Approved by human operator.'
            const run = db.prepare('SELECT id, status FROM runs WHERE id = ?').get(runId) as { id?: string; status?: string } | undefined
            if (!run) return json(response, 404, { error: 'Run not found.' })
            if (run.status !== 'awaiting_approval') return json(response, 409, { error: `Run is ${run.status}; approval is only available after fact-check and script completion.` })
            const now = isoNow()
            db.prepare('UPDATE runs SET status = ?, current_stage = ?, progress = ?, updated_at = ? WHERE id = ?').run('approved', 'publish', 0.94, now, runId)
            db.prepare('INSERT OR REPLACE INTO approvals (run_id, status, notes, updated_at) VALUES (?, ?, ?, ?)').run(runId, 'approved', notes, now)
            appendEvent(db, runId, { agentId: 'orchestrator', stage: 'approval', status: 'completed', task: 'Human approval qayd etildi', detail: 'Publish hali qo‘lda yuboriladi' })
            return json(response, 200, serializeRun(db, runId))
          }
          return json(response, 404, { error: 'Not found.' })
        } catch (error) {
          return json(response, 500, { error: error instanceof Error ? error.message : 'Internal API error.' })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  loadEnv(mode, path.resolve(process.cwd(), '..'), '')
  return { plugins: [react(), contentOpsApi()], server: { port: 4817, strictPort: true } }
})
