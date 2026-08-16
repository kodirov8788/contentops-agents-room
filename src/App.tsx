import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Html, OrbitControls } from '@react-three/drei'
import type { Group } from 'three'
import AgentPipelineDemo from './AgentPipelineDemo'

type AgentStatus = 'working' | 'completed' | 'waiting' | 'idle' | 'error'
type DeepSeekState = 'idle' | 'checking' | 'connected' | 'error'

type Agent = {
  id: string
  name: string
  role: string
  model: string
  status: AgentStatus
  task: string
  position: [number, number, number]
  color: string
  output: string
  tokens: string
  cost: string
}

type RunInfo = {
  id: string
  status: string
  title: string
  topic: string
  current_stage: string
  progress: number
  started_at: string
  updated_at: string
}

type RunSnapshot = {
  run: RunInfo
  agents: Agent[]
  events: Array<{ id: number; agent_id: string; stage: string; status: AgentStatus; task: string; detail: string; created_at: string }>
  claims: Array<{ verdict: string; confidence: number; source_url: string }>
  approval?: { status?: string; notes?: string }
}

type RunSummary = Pick<RunInfo, 'id' | 'status' | 'title' | 'topic' | 'current_stage' | 'progress' | 'started_at' | 'updated_at'>

const agents: Agent[] = [
  {
    id: 'orchestrator',
    name: 'Orchestrator',
    role: 'Workflow manager',
    model: 'GPT-5.6 Luna',
    status: 'working',
    task: 'Run #2026-08-16-001 ni boshqarmoqda',
    position: [0, 0, -1.2],
    color: '#18c96b',
    output: '6 bosqichdan 3 tasi yakunlandi',
    tokens: '—',
    cost: 'Plus quota',
  },
  {
    id: 'research',
    name: 'Researcher',
    role: 'Source intelligence',
    model: 'GPT-5.6 Luna + Web',
    status: 'completed',
    task: '10 candidate va 14 ta source topildi',
    position: [-3.05, 0, 0.6],
    color: '#ff4438',
    output: 'Candidate pack tayyor',
    tokens: '—',
    cost: 'Plus quota',
  },
  {
    id: 'verifier',
    name: 'Fact Checker',
    role: 'Evidence critic',
    model: 'DeepSeek V4 Flash',
    status: 'working',
    task: '8 ta claim tekshirilmoqda',
    position: [2.55, 0, 0.2],
    color: '#247ff0',
    output: '7 supported · 1 partial',
    tokens: '18,420 in · 920 out',
    cost: '$0.0054',
  },
  {
    id: 'producer',
    name: 'Producer',
    role: 'Uzbek script studio',
    model: 'GPT-5.6 Luna',
    status: 'waiting',
    task: 'Fact-check tugashini kutmoqda',
    position: [-2.3, 0, -2.1],
    color: '#ffc928',
    output: '—',
    tokens: '—',
    cost: 'Plus quota',
  },
  {
    id: 'visuals',
    name: 'Visuals',
    role: 'B-roll & captions',
    model: 'GPT-5.6 Luna',
    status: 'idle',
    task: 'Navbatda',
    position: [1.6, 0, -2.2],
    color: '#57bfff',
    output: '—',
    tokens: '—',
    cost: 'Plus quota',
  },
]

function statusLabel(status: AgentStatus) {
  return {
    working: 'Working',
    completed: 'Completed',
    waiting: 'Waiting',
    idle: 'Idle',
    error: 'Error',
  }[status]
}

function AgentFigure({ agent, selected, onSelect }: { agent: Agent; selected: boolean; onSelect: () => void }) {
  const group = useRef<Group>(null)
  const bodyRig = useRef<Group>(null)
  const headRig = useRef<Group>(null)
  const leftArm = useRef<Group>(null)
  const rightArm = useRef<Group>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const phase = useMemo(() => agent.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) * 0.013, [agent.id])
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])
  useFrame((state) => {
    if (!group.current) return
    if (reducedMotion) {
      group.current.position.y = 0
      group.current.rotation.y = 0
      return
    }
    const time = state.clock.elapsedTime
    const working = agent.status === 'working'
    const waiting = agent.status === 'waiting'
    const breathing = Math.sin(time * 1.65 + phase) * (working ? 0.018 : 0.012)
    group.current.position.y = breathing + (working ? Math.sin(time * 2.4 + phase) * 0.018 : 0)
    group.current.rotation.y = Math.sin(time * 0.35 + phase) * 0.035
    if (bodyRig.current) bodyRig.current.rotation.z = Math.sin(time * 0.9 + phase) * 0.018
    if (headRig.current) {
      headRig.current.rotation.y = Math.sin(time * (waiting ? 0.72 : 0.42) + phase) * (waiting ? 0.18 : 0.045)
      headRig.current.rotation.x = Math.sin(time * 0.6 + phase * 1.4) * 0.025
    }
    const handMotion = working ? Math.sin(time * 5.4 + phase) * 0.11 : Math.sin(time * 0.8 + phase) * 0.025
    if (leftArm.current) leftArm.current.rotation.z = -0.22 - handMotion
    if (rightArm.current) rightArm.current.rotation.z = 0.22 + handMotion
  })

  const statusColor = agent.status === 'error' ? '#ff4d6d' : agent.status === 'completed' ? '#52e0b1' : agent.status === 'waiting' ? '#ffc56c' : agent.color

  return (
    <group ref={group} position={agent.position} onClick={(event) => { event.stopPropagation(); onSelect() }}>
      <Float speed={agent.status === 'working' ? 2.2 : 1.2} rotationIntensity={0.05} floatIntensity={agent.status === 'working' ? 0.28 : 0.08}>
        <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.58, selected ? 0.68 : 0.61, 48]} />
          <meshBasicMaterial color={statusColor} transparent opacity={selected ? 0.9 : 0.45} />
        </mesh>
        <group ref={bodyRig} position={[0, 0.76, 0]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.34, 0.62, 6, 12]} />
            <meshStandardMaterial color={agent.color} roughness={0.35} metalness={0.25} />
          </mesh>
        </group>
        <group ref={headRig} position={[0, 1.48, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.38, 24, 16]} />
            <meshStandardMaterial color="#dbe7ff" roughness={0.25} metalness={0.18} />
          </mesh>
          <mesh position={[-0.13, 0.02, 0.35]}>
            <sphereGeometry args={[0.09, 12, 8]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} />
          </mesh>
          <mesh position={[0.13, 0.02, 0.35]}>
            <sphereGeometry args={[0.09, 12, 8]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} />
          </mesh>
          <mesh position={[-0.13, 0.02, 0.43]}>
            <sphereGeometry args={[0.037, 10, 8]} />
            <meshStandardMaterial color="#15253b" emissive={statusColor} emissiveIntensity={agent.status === 'working' ? 2.5 : 0.4} />
          </mesh>
          <mesh position={[0.13, 0.02, 0.43]}>
            <sphereGeometry args={[0.037, 10, 8]} />
            <meshStandardMaterial color="#15253b" emissive={statusColor} emissiveIntensity={agent.status === 'working' ? 2.5 : 0.4} />
          </mesh>
        </group>
        <mesh position={[0, 0.8, 0.32]}>
          <boxGeometry args={[0.28, 0.23, 0.03]} />
          <meshStandardMaterial color="#07182c" emissive={agent.color} emissiveIntensity={0.8} />
        </mesh>
        <group ref={leftArm} position={[-0.43, 0.79, 0]} rotation={[0, 0, -0.22]}>
          <mesh>
            <capsuleGeometry args={[0.08, 0.42, 4, 8]} />
            <meshStandardMaterial color={agent.color} />
          </mesh>
        </group>
        <group ref={rightArm} position={[0.43, 0.79, 0]} rotation={[0, 0, 0.22]}>
          <mesh>
            <capsuleGeometry args={[0.08, 0.42, 4, 8]} />
            <meshStandardMaterial color={agent.color} />
          </mesh>
        </group>
        <Html position={[0, 2.05, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div className={`agent-label ${selected ? 'agent-label--selected' : ''}`}>
            <span className="agent-label__dot" style={{ background: statusColor }} />
            <span>{agent.name}</span>
          </div>
        </Html>
      </Float>
    </group>
  )
}

function OfficeDesk({ position, rugColor, screenColor }: { position: [number, number, number]; rugColor: string; screenColor: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[1.82, 0.07, 1.18]} />
        <meshStandardMaterial color={rugColor} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow>
        <boxGeometry args={[1.32, 0.13, 0.74]} />
        <meshStandardMaterial color="#a56f43" roughness={0.64} />
      </mesh>
      {[-0.52, 0.52].map((x) => <mesh key={x} position={[x, 0.35, -0.23]}><boxGeometry args={[0.1, 0.7, 0.1]} /><meshStandardMaterial color="#49352c" /></mesh>)}
      <mesh position={[0, 1.04, -0.17]}>
        <boxGeometry args={[0.46, 0.31, 0.04]} />
        <meshStandardMaterial color="#1a2632" roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.04, -0.135]}>
        <planeGeometry args={[0.36, 0.21]} />
        <meshBasicMaterial color={screenColor} />
      </mesh>
      <mesh position={[0, 0.87, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.04, 16]} />
        <meshStandardMaterial color="#d2d6db" metalness={0.6} />
      </mesh>
      <mesh position={[0.38, 0.82, 0.12]}>
        <boxGeometry args={[0.19, 0.05, 0.1]} />
        <meshStandardMaterial color="#f2ead9" />
      </mesh>
    </group>
  )
}

function OfficeChair({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.37, 0]} castShadow><boxGeometry args={[0.45, 0.1, 0.43]} /><meshStandardMaterial color={color} roughness={0.8} /></mesh>
      <mesh position={[0, 0.69, -0.17]}><boxGeometry args={[0.44, 0.62, 0.08]} /><meshStandardMaterial color={color} roughness={0.8} /></mesh>
      <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.045, 0.045, 0.42, 10]} /><meshStandardMaterial color="#4b5560" metalness={0.6} /></mesh>
      <mesh position={[0, -0.08, 0]} rotation={[0, 0.4, 0]}><torusGeometry args={[0.22, 0.025, 8, 24]} /><meshStandardMaterial color="#4b5560" metalness={0.6} /></mesh>
    </group>
  )
}

function Plant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.13, 0]}><cylinderGeometry args={[0.13, 0.1, 0.25, 12]} /><meshStandardMaterial color="#b96a36" roughness={0.9} /></mesh>
      <mesh position={[0, 0.4, 0]}><sphereGeometry args={[0.27, 12, 10]} /><meshStandardMaterial color="#2d983f" roughness={0.85} /></mesh>
      <mesh position={[-0.16, 0.45, 0]} rotation={[0, 0, -0.35]}><coneGeometry args={[0.11, 0.44, 8]} /><meshStandardMaterial color="#3eaa4c" /></mesh>
      <mesh position={[0.16, 0.47, 0.02]} rotation={[0, 0, 0.35]}><coneGeometry args={[0.11, 0.48, 8]} /><meshStandardMaterial color="#278b3e" /></mesh>
    </group>
  )
}

function Shelf({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.9, 0]} castShadow><boxGeometry args={[1.35, 1.8, 0.35]} /><meshStandardMaterial color="#75513e" roughness={0.85} /></mesh>
      {[0.38, 0.88, 1.38].map((y) => <mesh key={y} position={[0, y, 0.2]}><boxGeometry args={[1.16, 0.06, 0.04]} /><meshStandardMaterial color="#d0a46c" /></mesh>)}
      {[-0.43, -0.25, -0.05, 0.15, 0.36].map((x, index) => <mesh key={x} position={[x, 0.6 + (index % 2) * 0.5, 0.21]} rotation={[0, 0, (index % 2 ? 0.05 : -0.04)]}><boxGeometry args={[0.11, 0.37, 0.06]} /><meshStandardMaterial color={['#e2b45e', '#41668a', '#b65d4c', '#6d8f68'][index % 4]} /></mesh>)}
    </group>
  )
}

function Whiteboard({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.15, 0]} castShadow><boxGeometry args={[2.4, 1.16, 0.07]} /><meshStandardMaterial color="#f0eee8" roughness={0.5} /></mesh>
      <mesh position={[0, 1.15, 0.045]}><boxGeometry args={[2.15, 0.9, 0.018]} /><meshBasicMaterial color="#ffffff" /></mesh>
      {[-0.78, -0.45, -0.12, 0.21, 0.54].map((x, index) => <mesh key={x} position={[x, 1.38 - (index % 2) * 0.35, 0.062]}><boxGeometry args={[0.24, 0.15, 0.016]} /><meshBasicMaterial color={['#f5c84c', '#e97a5e', '#71b8e7'][index % 3]} /></mesh>)}
      <mesh position={[-0.86, 0.36, 0]} rotation={[0, 0, 0.05]}><cylinderGeometry args={[0.035, 0.035, 1.5, 8]} /><meshStandardMaterial color="#4b5966" metalness={0.5} /></mesh>
      <mesh position={[0.86, 0.36, 0]} rotation={[0, 0, -0.05]}><cylinderGeometry args={[0.035, 0.035, 1.5, 8]} /><meshStandardMaterial color="#4b5966" metalness={0.5} /></mesh>
    </group>
  )
}

function StatusScreen({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.3, 0]} castShadow><boxGeometry args={[1.52, 1.22, 0.08]} /><meshStandardMaterial color="#ece9df" roughness={0.6} /></mesh>
      <mesh position={[0, 1.3, 0.05]}><planeGeometry args={[1.25, 0.93]} /><meshBasicMaterial color="#eff5f3" /></mesh>
      <mesh position={[-0.27, 1.52, 0.065]}><boxGeometry args={[0.55, 0.06, 0.015]} /><meshBasicMaterial color="#2a88b9" /></mesh>
      <mesh position={[-0.36, 1.22, 0.065]}><boxGeometry args={[0.08, 0.34, 0.015]} /><meshBasicMaterial color="#52bfa0" /></mesh>
      <mesh position={[-0.2, 1.33, 0.065]}><boxGeometry args={[0.08, 0.23, 0.015]} /><meshBasicMaterial color="#7ccbe2" /></mesh>
      <mesh position={[-0.04, 1.15, 0.065]}><boxGeometry args={[0.08, 0.14, 0.015]} /><meshBasicMaterial color="#f1b957" /></mesh>
      <mesh position={[0, 0.58, 0]} rotation={[0, 0, 0]}><cylinderGeometry args={[0.04, 0.04, 0.72, 10]} /><meshStandardMaterial color="#4b5966" metalness={0.5} /></mesh>
    </group>
  )
}

function MeetingTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.61, 0]} castShadow><cylinderGeometry args={[0.8, 0.8, 0.12, 32]} /><meshStandardMaterial color="#b7824f" roughness={0.8} /></mesh>
      <mesh position={[0, 0.27, 0]}><cylinderGeometry args={[0.09, 0.09, 0.62, 12]} /><meshStandardMaterial color="#58493e" /></mesh>
      {[[-0.92, 0.25, 0], [0.92, 0.25, 0], [0, 0.25, -0.92], [0, 0.25, 0.92]].map(([x, y, z]) => <mesh key={`${x}-${z}`} position={[x, y, z]} rotation={[0, 0, x ? 0.6 : 0]}><boxGeometry args={[0.38, 0.42, 0.38]} /><meshStandardMaterial color="#8b6a4e" /></mesh>)}
      <Plant position={[0, 0.74, 0]} scale={0.55} />
    </group>
  )
}

function OfficeProps() {
  return (
    <>
      <mesh position={[0, 0.05, 0]} receiveShadow><boxGeometry args={[9.5, 0.12, 6.4]} /><meshStandardMaterial color="#b9b2a8" roughness={0.95} /></mesh>
      <mesh position={[0, 1.85, -3.25]}><boxGeometry args={[9.5, 3.5, 0.12]} /><meshStandardMaterial color="#ddd7ce" roughness={0.98} /></mesh>
      <mesh position={[-4.72, 1.75, 0]}><boxGeometry args={[0.12, 3.35, 6.5]} /><meshStandardMaterial color="#cbc4bb" roughness={0.98} /></mesh>
      <OfficeDesk position={[-3.05, 0, 0.65]} rugColor="#7c3d35" screenColor="#f8f8f5" />
      <OfficeChair position={[-3.05, 0, 1.43]} color="#70463c" />
      <OfficeDesk position={[-2.3, 0, -2.08]} rugColor="#a28a34" screenColor="#e8f6ff" />
      <OfficeChair position={[-2.3, 0, -1.28]} color="#d1a32d" />
      <Whiteboard position={[0.15, 0, -3.12]} />
      <StatusScreen position={[3.35, 0, -3.1]} />
      <Shelf position={[-3.65, 0, -3.1]} />
      <Plant position={[-2.55, 0, -3.04]} scale={0.8} />
      <Plant position={[4.18, 0, -2.96]} scale={0.9} />
      <Plant position={[-4.15, 0, -1.95]} scale={1.1} />
      <MeetingTable position={[3.25, 0, 1.9]} />
      <mesh position={[1.0, 0.45, 1.65]}><boxGeometry args={[0.65, 0.5, 0.53]} /><meshStandardMaterial color="#846344" roughness={0.78} /></mesh>
      <mesh position={[1.0, 0.76, 1.65]}><boxGeometry args={[0.49, 0.08, 0.39]} /><meshStandardMaterial color="#1b2329" roughness={0.4} /></mesh>
      <mesh position={[1.0, 0.82, 1.65]}><boxGeometry args={[0.38, 0.06, 0.27]} /><meshBasicMaterial color="#607786" /></mesh>
    </>
  )
}

function RoomScene({ liveAgents, selectedId, onSelect }: { liveAgents: Agent[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 8.8, 8.8], fov: 47 }}>
      <color attach="background" args={['#d7d0c7']} />
      <fog attach="fog" args={['#d7d0c7', 9, 19]} />
      <ambientLight intensity={2.15} />
      <directionalLight position={[-3, 8, 5]} intensity={4.2} color="#fff8ed" castShadow />
      <pointLight position={[-3, 3, 0]} intensity={8} distance={10} color="#ffd9a8" />
      <pointLight position={[3, 3, -3]} intensity={5} distance={9} color="#d7f1ff" />
      <OfficeProps />
      {liveAgents.map((agent) => <AgentFigure key={agent.id} agent={agent} selected={agent.id === selectedId} onSelect={() => onSelect(agent.id)} />)}
      <OrbitControls enablePan={false} minDistance={6.3} maxDistance={12} maxPolarAngle={Math.PI / 2.05} minPolarAngle={Math.PI / 3.6} target={[0, 0, -0.35]} />
    </Canvas>
  )
}

function WorkspacePage({ menu, runSnapshot, runHistory, onApprove, actionMessage }: { menu: string; runSnapshot: RunSnapshot | null; runHistory: RunSummary[]; onApprove: () => void; actionMessage: string }) {
  const claims = runSnapshot?.claims ?? []
  const events = runSnapshot?.events ?? []
  const supported = claims.filter((claim) => claim.verdict === 'supported').length
  const partial = claims.filter((claim) => claim.verdict === 'partial').length
  const rejected = claims.filter((claim) => claim.verdict === 'rejected').length
  const avgConfidence = claims.length ? Math.round((claims.reduce((sum, claim) => sum + claim.confidence, 0) / claims.length) * 100) : 0
  const sourceUrls = [...new Set(claims.map((claim) => claim.source_url))]

  return (
    <section className="workspace-page">
      <div className="workspace-page__header">
        <div><p className="eyebrow">Workspace view</p><h3>{menu}</h3><p className="workspace-page__description">SQLite state va joriy content run asosida tekshiriladigan ma’lumotlar.</p></div>
        <span className="connection-pill"><span className="status-dot status-dot--green" /> {runSnapshot?.run.status ?? 'No active run'}</span>
      </div>

      {menu === 'Runs' && <div className="workspace-table-card">
        <div className="section-heading"><div><p className="eyebrow">Durable history</p><h3>Recent runs</h3></div><span className="muted">{runHistory.length} stored</span></div>
        <div className="workspace-table" role="table" aria-label="Recent content runs"><div className="workspace-table__row workspace-table__row--head" role="row"><span>Run</span><span>Status</span><span>Stage</span><span>Progress</span></div>
          {runHistory.length === 0 ? <p className="workspace-empty">No runs yet.</p> : runHistory.map((run) => <div className="workspace-table__row" role="row" key={run.id}><span><strong>{run.title}</strong><small>#{run.id}</small></span><span className={`state-pill state-pill--${run.status === 'awaiting_approval' ? 'waiting' : run.status === 'approved' ? 'completed' : run.status === 'error' ? 'working' : 'idle'}`}>{run.status}</span><span>{run.current_stage}</span><span>{Math.round(run.progress * 100)}%</span></div>)}
        </div>
      </div>}

      {menu === 'Evidence' && <div className="workspace-two-column"><div className="workspace-table-card"><div className="section-heading"><div><p className="eyebrow">Evidence ledger</p><h3>Verified claims</h3></div><span className="health-score">{avgConfidence}% confidence</span></div><div className="workspace-table" role="table" aria-label="Fact checked claims"><div className="workspace-table__row workspace-table__row--head" role="row"><span>Claim</span><span>Verdict</span><span>Confidence</span><span>Source</span></div>{claims.length === 0 ? <p className="workspace-empty">Run the pipeline to populate claims.</p> : claims.map((claim, index) => <div className="workspace-table__row workspace-table__row--claim" role="row" key={`${claim.source_url}-${index}`}><span>{claim.verdict === 'supported' ? '✓' : claim.verdict === 'partial' ? '△' : '!' } {claim.source_url}</span><span className={`state-pill state-pill--${claim.verdict === 'supported' ? 'completed' : claim.verdict === 'partial' ? 'waiting' : 'working'}`}>{claim.verdict}</span><span>{Math.round(claim.confidence * 100)}%</span><a href={claim.source_url} target="_blank" rel="noreferrer">Open source ↗</a></div>)}</div></div><div className="evidence-card evidence-card--page"><div className="section-heading"><div><p className="eyebrow">Claim health</p><h3>Summary</h3></div><span className="health-score">{avgConfidence}%</span></div><div className="evidence-counts evidence-counts--page"><div><span className="legend-dot legend-dot--green" /><strong>{supported}</strong><span>supported</span></div><div><span className="legend-dot legend-dot--yellow" /><strong>{partial}</strong><span>partial</span></div><div><span className="legend-dot legend-dot--pink" /><strong>{rejected}</strong><span>rejected</span></div></div></div></div>}

      {menu === 'Approval' && <div className="workspace-two-column"><div className="workspace-table-card approval-panel"><p className="eyebrow">Human gate</p><h3>{runSnapshot?.run.title ?? 'No content package ready'}</h3><p className="workspace-page__description">Faktlar, 30–40 soniyalik o‘zbekcha script va visual package tekshirilgandan keyin publishga ruxsat beriladi.</p><div className="approval-status"><span className={`state-pill state-pill--${runSnapshot?.run.status === 'awaiting_approval' ? 'waiting' : runSnapshot?.run.status === 'approved' ? 'completed' : 'idle'}`}>{runSnapshot?.run.status ?? 'idle'}</span><span>{claims.length} claims · {events.length} events</span></div>{runSnapshot?.run.status === 'awaiting_approval' && <button className="primary-button primary-button--wide" onClick={onApprove}>Approve content package <span>✓</span></button>}{actionMessage && <p className="action-message">{actionMessage}</p>}</div><div className="workspace-table-card"><p className="eyebrow">Approval notes</p><h3>Operator decision</h3><p className="workspace-page__description">{runSnapshot?.approval?.notes ?? 'Approval hali qayd etilmagan.'}</p><div className="approval-checklist"><span>✓ Evidence ledger reviewed</span><span>✓ Uzbek script boundary visible</span><span>✓ Publishing remains manual</span></div></div></div>}

      {menu === 'Analytics' && <div className="analytics-grid"><div className="analytics-card"><span className="field-label">Pipeline events</span><strong>{events.length}</strong><small>durable SQLite records</small></div><div className="analytics-card"><span className="field-label">Claims checked</span><strong>{claims.length}</strong><small>{supported} supported · {partial} partial</small></div><div className="analytics-card"><span className="field-label">Average confidence</span><strong>{avgConfidence}%</strong><small>rejected claims: {rejected}</small></div><div className="analytics-card"><span className="field-label">Current stage</span><strong>{runSnapshot?.run.current_stage ?? '—'}</strong><small>{runSnapshot?.run.status ?? 'No active run'}</small></div></div>}

      {menu === 'Knowledge' && <div className="workspace-table-card"><div className="section-heading"><div><p className="eyebrow">Knowledge base</p><h3>Trusted source registry</h3></div><span className="muted">{sourceUrls.length} sources</span></div><div className="knowledge-list">{sourceUrls.length === 0 ? <p className="workspace-empty">Sources appear after a research run.</p> : sourceUrls.map((url) => <a href={url} target="_blank" rel="noreferrer" key={url}><span className="status-dot status-dot--green" />{url}<span>↗</span></a>)}</div><div className="knowledge-note"><strong>Memory boundary</strong><span>SQLite stores run evidence and feedback locally. Provider keys remain server-side and are never included in this view.</span></div></div>}
    </section>
  )
}

function App() {
  const [selectedId, setSelectedId] = useState('verifier')
  const [liveAgents, setLiveAgents] = useState<Agent[]>(agents)
  const [runSnapshot, setRunSnapshot] = useState<RunSnapshot | null>(null)
  const [runHistory, setRunHistory] = useState<RunSummary[]>([])
  const [deepSeekState, setDeepSeekState] = useState<DeepSeekState>('idle')
  const [deepSeekMessage, setDeepSeekMessage] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [menu, setMenu] = useState('Room')
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      try {
        const [currentResponse, historyResponse] = await Promise.all([fetch('/api/run/current'), fetch('/api/runs')])
        if (!currentResponse.ok) return
        const data = await currentResponse.json() as RunSnapshot
        if (cancelled || !data?.run) return
        setRunSnapshot(data)
        setLiveAgents(data.agents)
        if (historyResponse.ok) {
          const history = await historyResponse.json() as { runs?: RunSummary[] }
          setRunHistory(history.runs ?? [])
        }
      } catch {
        // The room remains usable with its local fallback snapshot if the API is offline.
      }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 1500)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [])

  const selected = useMemo(() => liveAgents.find((agent) => agent.id === selectedId) ?? liveAgents[0], [liveAgents, selectedId])

  const pipelineStages = useMemo(() => {
    const labels = [['Research', 'research'], ['Fact-check', 'fact-check'], ['Topic + script', 'script'], ['Visual package', 'visuals'], ['Approval', 'approval'], ['Publish', 'publish']] as const
    const events = runSnapshot?.events ?? []
    return labels.map(([label, stage], index) => {
      const event = [...events].reverse().find((item) => item.stage === stage)
      let state: AgentStatus = 'idle'
      if (stage === 'publish' && runSnapshot?.run.status === 'approved') state = 'completed'
      else if (event) state = event.status
      else if (runSnapshot?.run.current_stage === stage) state = 'working'
      else if (index > 0 && runSnapshot?.run.current_stage === labels[index - 1]?.[1]) state = 'waiting'
      return [label, state] as const
    })
  }, [runSnapshot])

  const startRun = async () => {
    setActionMessage('Yangi run SQLite’ga yozilmoqda…')
    try {
      const response = await fetch('/api/runs/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      if (!response.ok) throw new Error('Run boshlanmadi.')
      const data = await response.json() as RunSnapshot
      setRunSnapshot(data)
      setLiveAgents(data.agents)
      setActionMessage('Run boshlandi · room real-time kuzatmoqda')
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Run boshlanmadi.')
    }
  }

  const approveRun = async () => {
    const runId = runSnapshot?.run.id
    if (!runId) return
    setActionMessage('Approval SQLite’ga yozilmoqda…')
    try {
      const response = await fetch(`/api/runs/${encodeURIComponent(runId)}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: 'Operator reviewed facts, script and visuals.' }) })
      if (!response.ok) throw new Error('Approval saqlanmadi.')
      const data = await response.json() as RunSnapshot
      setRunSnapshot(data)
      setLiveAgents(data.agents)
      setActionMessage('Tasdiqlandi · publish qo‘lda bajariladi')
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Approval saqlanmadi.')
    }
  }

  const checkDeepSeek = async () => {
    setDeepSeekState('checking')
    setDeepSeekMessage('API connection tekshirilmoqda…')
    try {
      const response = await fetch('/api/deepseek/check')
      const data = await response.json() as { ok?: boolean; model?: string; message?: string }
      if (!response.ok || !data.ok) throw new Error(data.message ?? 'DeepSeek javob bermadi.')
      setDeepSeekState('connected')
      setDeepSeekMessage(`${data.model ?? 'deepseek-v4-flash'} connected`)
    } catch (error) {
      setDeepSeekState('error')
      setDeepSeekMessage(error instanceof Error ? error.message : 'Connection failed')
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark"><span /><span /><span /></div>
          <div><p className="eyebrow">Content intelligence</p><h1>ContentOps</h1></div>
        </div>
        <div className="sidebar-section">
          <p className="sidebar-label">Workspace</p>
          {['Room', 'Runs', 'Evidence', 'Approval', 'Analytics', 'Knowledge'].map((item) => (
            <button key={item} className={`nav-item ${menu === item ? 'nav-item--active' : ''}`} onClick={() => setMenu(item)}>
              <span className="nav-icon">{({ Room: '◈', Runs: '⌁', Evidence: '◎', Approval: '✓', Analytics: '↗', Knowledge: '▤' } as Record<string, string>)[item]}</span>
              <span>{item}</span>
              {item === 'Approval' && <span className="nav-badge">1</span>}
            </button>
          ))}
        </div>
        <div className="sidebar-spacer" />
        <div className="quota-card">
          <div className="quota-card__top"><span>DeepSeek budget</span><span className="status-dot status-dot--green" /></div>
          <strong>$0.0054</strong><span className="muted"> today · $5.00 hard cap</span>
          <div className="quota-bar"><span style={{ width: '4%' }} /></div>
          <button className="text-button" onClick={checkDeepSeek}>{deepSeekState === 'checking' ? 'Checking…' : 'Test API connection →'}</button>
          {deepSeekMessage && <p className={`quota-message quota-message--${deepSeekState}`}>{deepSeekMessage}</p>}
        </div>
        <div className="sidebar-footer"><span className="live-dot" /> Local workspace · :4817</div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div><p className="eyebrow">Daily command center</p><h2>Agents Room</h2></div>
          <div className="topbar-actions"><span className="connection-pill"><span className="status-dot status-dot--green" /> SQLite live state</span><button className="primary-button" onClick={startRun}>Start daily run</button><button className="icon-button" aria-label="Notifications">◌</button><div className="avatar">K</div></div>
        </header>

        <section className="hero-grid">
          <div className="hero-copy">
            <div className="run-line"><span className="run-live"><span className="live-dot" /> {runSnapshot?.run.status === 'awaiting_approval' ? 'APPROVAL' : 'LIVE RUN'}</span><span className="muted">#{runSnapshot?.run.id ?? 'local-fallback'}</span></div>
            <h3>Bugun sizning<br /><span>content engine</span> ishlayapti.</h3>
            <p className="hero-description">Research’dan approval’gacha bo‘lgan barcha bosqichlarni bitta xonada ko‘ring.</p>
            <div className="hero-metrics"><div><strong>{String(liveAgents.filter((agent) => agent.status === 'working').length).padStart(2, '0')}</strong><span>active agents</span></div><div><strong>{String(runSnapshot?.claims.length ?? 0).padStart(2, '0')}</strong><span>claims checked</span></div><div><strong>{runSnapshot ? `${Math.max(0, Math.round((Date.now() - new Date(runSnapshot.run.started_at).getTime()) / 1000))}s` : '00:42'}</strong><span>run duration</span></div></div>
          </div>
          <div className="next-content-card"><div className="card-kicker">Today’s content</div><h4>{runSnapshot?.run.title ?? 'AI agentlar sizning ish stolingizga kelmoqda'}</h4><p>Oldin → Hozir → Keyin formatida. Fact-check tugagach script tayyorlanadi.</p><div className="card-meta"><span>🇺🇿 Uzbek · 30–40 sec</span><span className="confidence"><span className="status-dot status-dot--yellow" /> {runSnapshot ? `${Math.round((runSnapshot.claims.reduce((sum, claim) => sum + claim.confidence, 0) / Math.max(runSnapshot.claims.length, 1)) * 100)}% confidence` : '87% confidence'}</span></div></div>
        </section>

        {menu === 'Room' ? <>
        <section className="room-layout">
          <div className="room-card">
            <div className="room-card__header"><div><p className="eyebrow">Interactive workspace</p><h3>Control floor</h3></div><div className="room-controls"><span className="room-hint">Drag to orbit · click an agent</span><button className="small-button">⌗ Focus</button></div></div>
            <div className="scene-wrap"><AgentPipelineDemo /><div className="scene-legend"><span><i className="legend-dot legend-dot--green" /> completed</span><span><i className="legend-dot legend-dot--yellow" /> waiting</span><span><i className="legend-dot legend-dot--pink" /> active</span></div></div>
          </div>
          <aside className="inspector-card">
            <div className="inspector-header"><div><p className="eyebrow">Selected agent</p><h3>{selected.name}</h3></div><span className={`state-pill state-pill--${selected.status}`}><span className="status-dot" /> {statusLabel(selected.status)}</span></div>
            <div className="agent-profile"><div className="profile-orb" style={{ background: `radial-gradient(circle at 35% 30%, #fff, ${selected.color})` }}>{selected.name.slice(0, 1)}</div><div><strong>{selected.role}</strong><span>{selected.model}</span></div></div>
            <div className="inspector-task"><span className="field-label">Current task</span><p>{selected.task}</p></div>
            <div className="inspector-grid"><div><span className="field-label">Output</span><strong>{selected.output}</strong></div><div><span className="field-label">Tokens</span><strong>{selected.tokens}</strong></div><div><span className="field-label">Cost</span><strong>{selected.cost}</strong></div><div><span className="field-label">Run time</span><strong>00:42</strong></div></div>
            <div className="inspector-log">{(runSnapshot?.events.slice(-3) ?? []).map((event) => <div className="log-line" key={event.id}><span className="log-time">{new Date(event.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span><span className={`log-dot ${event.status === 'error' ? 'log-dot--pink' : ''}`} /><span>{event.detail || event.task}</span></div>)}</div>
            {runSnapshot?.run.status === 'awaiting_approval' && <button className="primary-button primary-button--wide" onClick={approveRun}>Approve content package <span>✓</span></button>}
            {actionMessage && <p className="action-message">{actionMessage}</p>}
            <button className="outline-button">Open full trace <span>↗</span></button>
          </aside>
        </section>

        <section className="lower-grid">
          <div className="timeline-card"><div className="section-heading"><div><p className="eyebrow">Execution trace</p><h3>Today’s pipeline</h3></div><button className="text-button">View run history →</button></div><div className="timeline">{pipelineStages.map(([label, state], index) => <div className={`timeline-step timeline-step--${state}`} key={label}><div className="timeline-node">{state === 'completed' ? '✓' : state === 'working' ? '•' : index + 1}</div><div><strong>{label}</strong><span>{state === 'completed' ? 'Done' : state === 'working' ? 'In progress' : state === 'waiting' ? 'Waiting' : state === 'error' ? 'Error' : 'Queued'}</span></div>{index < pipelineStages.length - 1 && <div className={`timeline-connector ${state === 'completed' ? 'timeline-connector--done' : ''}`} />}</div>)}</div></div>
          <div className="evidence-card"><div className="section-heading"><div><p className="eyebrow">Evidence ledger</p><h3>Claim health</h3></div><span className="health-score">{runSnapshot ? `${Math.round((runSnapshot.claims.reduce((sum, claim) => sum + claim.confidence, 0) / Math.max(runSnapshot.claims.length, 1)) * 100)}%` : '87%'}</span></div><div className="evidence-summary"><div className="donut"><span>{runSnapshot?.claims.length ?? 8}</span><small>claims</small></div><div className="evidence-counts"><div><span className="legend-dot legend-dot--green" /><strong>{runSnapshot?.claims.filter((claim) => claim.verdict === 'supported').length ?? 7}</strong><span>supported</span></div><div><span className="legend-dot legend-dot--yellow" /><strong>{runSnapshot?.claims.filter((claim) => claim.verdict === 'partial').length ?? 1}</strong><span>partial</span></div><div><span className="legend-dot legend-dot--pink" /><strong>{runSnapshot?.claims.filter((claim) => claim.verdict === 'rejected').length ?? 0}</strong><span>rejected</span></div></div></div><button className="outline-button">Inspect sources <span>↗</span></button></div>
        </section>
        </> : <WorkspacePage menu={menu} runSnapshot={runSnapshot} runHistory={runHistory} onApprove={approveRun} actionMessage={actionMessage} />}
        <footer className="app-footer"><span>ContentOps v0.1 · human approval required before publishing</span><span>{now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} JST</span></footer>
      </main>
    </div>
  )
}

export default App
