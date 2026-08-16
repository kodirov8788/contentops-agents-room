import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import type { Group } from 'three'
import { MathUtils } from 'three'

type JobStatus = 'idle' | 'running' | 'paused' | 'completed'

type PipelineStage = {
  id: string
  name: string
  shortName: string
  color: string
  position: [number, number, number]
}

const PIPELINE_STAGES: PipelineStage[] = [
  { id: 'research', name: 'Research', shortName: 'Research', color: '#ff5b55', position: [-3.6, 0, 1.65] },
  { id: 'topic', name: 'Topic Planner', shortName: 'Planner', color: '#ffb84c', position: [-1.2, 0, 1.65] },
  { id: 'script', name: 'Script & Localize', shortName: 'Script', color: '#55c7ff', position: [1.2, 0, 1.65] },
  { id: 'editor', name: 'Editor', shortName: 'Editor', color: '#b987ff', position: [3.6, 0, 1.65] },
  { id: 'visuals', name: 'Visuals', shortName: 'Visuals', color: '#48d6a5', position: [3.6, 0, -1.45] },
  { id: 'approval', name: 'Human Approval', shortName: 'Approval', color: '#ff7fae', position: [1.2, 0, -1.45] },
  { id: 'publish', name: 'Publish', shortName: 'Publish', color: '#64a7ff', position: [-1.2, 0, -1.45] },
]

const DEMO_PACKAGE = {
  topic: 'AI agentlar endi jamoa kabi ishlayapti',
  script: 'Oldin bitta AI hamma ishni qilardi. Hozir esa Research, Script va Fact-check agentlari vazifani bo‘lib oladi. Bu xuddi ofisdagi jamoaga o‘xshaydi: biri izlaydi, biri yozadi, biri tekshiradi. Keyin bunday tizimlar kontentni tezroq tayyorlashi mumkin — lekin yakuniy qaror baribir insonda qoladi.',
}

function AgentDesk({ stage, active, status, reducedMotion, onSelect }: { stage: PipelineStage; active: boolean; status: JobStatus; reducedMotion: boolean; onSelect: () => void }) {
  const rig = useRef<Group>(null)
  const phase = useMemo(() => stage.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) * 0.017, [stage.id])
  const dimColor = '#354052'
  const bodyColor = active ? stage.color : dimColor
  const screenColor = active ? '#e9fbff' : '#1a2637'

  useFrame((state) => {
    if (!rig.current) return
    if (reducedMotion) {
      rig.current.position.y = 0
      rig.current.rotation.z = 0
      return
    }
    const time = state.clock.elapsedTime
    const targetY = active && status === 'running' ? Math.sin(time * 3.2 + phase) * 0.07 : 0
    rig.current.position.y = MathUtils.lerp(rig.current.position.y, targetY, 0.14)
    rig.current.rotation.z = Math.sin(time * 0.75 + phase) * (active ? 0.025 : 0.008)
  })

  return (
    <group position={stage.position} onClick={(event) => { event.stopPropagation(); onSelect() }}>
      <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.76, active ? 0.93 : 0.8, 40]} />
        <meshBasicMaterial color={active ? stage.color : '#273346'} transparent opacity={active ? 0.78 : 0.32} />
      </mesh>
      {active && <pointLight position={[0, 1.5, 0]} color={stage.color} intensity={status === 'running' ? 2.5 : 1.2} distance={3.6} />}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[1.9, 0.08, 1.25]} />
        <meshStandardMaterial color={active ? '#24364c' : '#1b2534'} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.68, 0]} castShadow>
        <boxGeometry args={[1.42, 0.12, 0.78]} />
        <meshStandardMaterial color={active ? '#70503c' : '#3b3f48'} roughness={0.8} />
      </mesh>
      {[-0.55, 0.55].map((x) => <mesh key={x} position={[x, 0.36, -0.23]}><boxGeometry args={[0.11, 0.62, 0.11]} /><meshStandardMaterial color={active ? '#4d3429' : '#242c39'} /></mesh>)}
      <mesh position={[0, 1.03, -0.16]}>
        <boxGeometry args={[0.5, 0.33, 0.045]} />
        <meshStandardMaterial color="#111a27" roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.03, -0.133]}>
        <planeGeometry args={[0.39, 0.23]} />
        <meshBasicMaterial color={screenColor} />
      </mesh>
      <mesh position={[0.35, 0.82, 0.13]}>
        <boxGeometry args={[0.18, 0.05, 0.11]} />
        <meshStandardMaterial color={active ? '#f6e6cf' : '#4a4c52'} />
      </mesh>
      <group ref={rig} position={[0, 0, 0]}>
        <mesh position={[0, 1.25, 0.22]} castShadow>
          <capsuleGeometry args={[0.2, 0.34, 6, 10]} />
          <meshStandardMaterial color={bodyColor} emissive={active ? stage.color : '#000000'} emissiveIntensity={active ? 0.65 : 0} roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.78, 0.22]} castShadow>
          <sphereGeometry args={[0.25, 16, 12]} />
          <meshStandardMaterial color={active ? '#d9e8f4' : '#515a68'} roughness={0.45} />
        </mesh>
        <mesh position={[-0.08, 1.8, 0.445]}>
          <sphereGeometry args={[0.045, 10, 8]} />
          <meshStandardMaterial color={active ? '#ffffff' : '#2a3340'} emissive={active ? stage.color : '#000000'} emissiveIntensity={active ? 1.5 : 0} />
        </mesh>
        <mesh position={[0.08, 1.8, 0.445]}>
          <sphereGeometry args={[0.045, 10, 8]} />
          <meshStandardMaterial color={active ? '#ffffff' : '#2a3340'} emissive={active ? stage.color : '#000000'} emissiveIntensity={active ? 1.5 : 0} />
        </mesh>
        <mesh position={[-0.29, 1.28, 0.22]} rotation={[0, 0, -0.42]}>
          <capsuleGeometry args={[0.055, 0.28, 4, 8]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>
        <mesh position={[0.29, 1.28, 0.22]} rotation={[0, 0, 0.42]}>
          <capsuleGeometry args={[0.055, 0.28, 4, 8]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>
      </group>
      <Html position={[0, 2.24, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div className={`pipeline-desk-label ${active ? 'pipeline-desk-label--active' : ''}`} style={{ '--stage-color': active ? stage.color : '#607086' } as CSSProperties}>
          <span className="pipeline-desk-label__dot" />
          <span>{stage.shortName}</span>
        </div>
      </Html>
    </group>
  )
}

function OfficeBackdrop() {
  return (
    <>
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[10.2, 0.12, 5.9]} />
        <meshStandardMaterial color="#111a28" roughness={0.92} />
      </mesh>
      <mesh position={[0, 1.9, -2.95]}>
        <boxGeometry args={[10.2, 3.7, 0.12]} />
        <meshStandardMaterial color="#0c1421" roughness={0.98} />
      </mesh>
      <mesh position={[-4.98, 1.5, 0]}>
        <boxGeometry args={[0.12, 3.1, 5.9]} />
        <meshStandardMaterial color="#0d1725" roughness={0.98} />
      </mesh>
      <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9.7, 5.45]} />
        <meshBasicMaterial color="#152237" transparent opacity={0.65} />
      </mesh>
      <mesh position={[0, 0.095, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <gridHelper args={[9.5, 18, '#283d59', '#182a42']} />
      </mesh>
      <mesh position={[0, 1.6, -2.84]}>
        <boxGeometry args={[3.3, 1.15, 0.05]} />
        <meshStandardMaterial color="#17263b" emissive="#294f7b" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[-1.05, 1.62, -2.82]}>
        <boxGeometry args={[0.08, 0.55, 0.02]} />
        <meshBasicMaterial color="#4bdbb3" />
      </mesh>
      <mesh position={[-0.73, 1.74, -2.82]}>
        <boxGeometry args={[0.08, 0.34, 0.02]} />
        <meshBasicMaterial color="#5daeff" />
      </mesh>
      <mesh position={[-0.41, 1.51, -2.82]}>
        <boxGeometry args={[0.08, 0.15, 0.02]} />
        <meshBasicMaterial color="#ffb84c" />
      </mesh>
    </>
  )
}

function CameraRig() {
  const { camera } = useThree()

  useEffect(() => {
    camera.position.set(7.9, 8.5, 7.9)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [camera])

  return <OrbitControls enableDamping dampingFactor={0.08} enablePan={false} minDistance={7} maxDistance={12} minPolarAngle={Math.PI / 3.5} maxPolarAngle={Math.PI / 2.15} target={[0, 0, 0]} />
}

function PipelineCanvas({ activeIndex, status, reducedMotion, onSelect }: { activeIndex: number; status: JobStatus; reducedMotion: boolean; onSelect: (stage: PipelineStage) => void }) {
  return (
    <Canvas shadows dpr={[1, 1.35]} camera={{ position: [7.9, 8.5, 7.9], fov: 42 }}>
      <PerspectiveCamera makeDefault position={[7.9, 8.5, 7.9]} fov={42} near={0.1} far={100} onUpdate={(camera) => camera.lookAt(0, 0, 0)} />
      <color attach="background" args={['#0a1320']} />
      <fog attach="fog" args={['#0a1320', 9, 18]} />
      <ambientLight intensity={1.1} color="#8ea6c6" />
      <directionalLight position={[-4, 9, 5]} intensity={2.4} color="#d8e9ff" castShadow />
      <pointLight position={[0, 4, 0]} intensity={3.5} distance={12} color="#4577b8" />
      <OfficeBackdrop />
      {PIPELINE_STAGES.map((stage, index) => <AgentDesk key={stage.id} stage={stage} active={index === activeIndex} status={status} reducedMotion={reducedMotion} onSelect={() => onSelect(stage)} />)}
      <CameraRig />
    </Canvas>
  )
}

export default function AgentPipelineDemo() {
  const [status, setStatus] = useState<JobStatus>('idle')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [canvasReady, setCanvasReady] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setCanvasReady(true), 250)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (status !== 'running') return
    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        if (current >= PIPELINE_STAGES.length - 1) {
          setStatus('completed')
          return current
        }
        return Math.max(0, current + 1)
      })
    }, 1800)
    return () => window.clearInterval(timer)
  }, [status])

  const activeStage = activeIndex >= 0 ? PIPELINE_STAGES[activeIndex] : null
  const progress = status === 'completed' ? 100 : activeIndex < 0 ? 0 : Math.round(((activeIndex + 1) / PIPELINE_STAGES.length) * 100)
  const startJob = () => {
    setActiveIndex(0)
    setStatus('running')
    setSelectedStage(PIPELINE_STAGES[0])
  }
  const pauseJob = () => setStatus((current) => current === 'paused' ? 'running' : 'paused')
  const selectStage = (stage: PipelineStage) => setSelectedStage(stage)

  return (
    <div className="pipeline-demo" aria-label="Seven-stage media production pipeline">
      {canvasReady && <PipelineCanvas activeIndex={activeIndex} status={status} reducedMotion={reducedMotion} onSelect={selectStage} />}
      <div className="pipeline-overlay">
        <div className="pipeline-overlay__topline">
          <div>
            <span className="pipeline-eyebrow">Media production engine</span>
            <strong>{status === 'completed' ? 'Daily package ready' : activeStage ? activeStage.name : 'Ready for a new job'}</strong>
          </div>
          <span className={`pipeline-status pipeline-status--${status}`}><span /> {status}</span>
        </div>
        <div className="pipeline-progress"><span style={{ width: `${progress}%` }} /></div>
        <div className="pipeline-overlay__meta"><span>{activeIndex >= 0 ? `${Math.min(activeIndex + 1, PIPELINE_STAGES.length)} / ${PIPELINE_STAGES.length} stages` : '7 stages'}</span><span>{progress}%</span></div>
        <div className="pipeline-stage-list">
          {PIPELINE_STAGES.map((stage, index) => <button key={stage.id} className={`pipeline-stage-chip ${index === activeIndex ? 'pipeline-stage-chip--active' : ''} ${index < activeIndex || status === 'completed' ? 'pipeline-stage-chip--done' : ''}`} onClick={() => selectStage(stage)}><span style={{ background: index === activeIndex ? stage.color : undefined }} />{stage.shortName}</button>)}
        </div>
        <div className="pipeline-controls"><button className="pipeline-action pipeline-action--primary" onClick={startJob}>{status === 'completed' ? 'Start New Job' : 'Start Job'}</button><button className="pipeline-action" onClick={pauseJob} disabled={status === 'idle' || status === 'completed'}>{status === 'paused' ? 'Resume Job' : 'Pause Job'}</button></div>
        {selectedStage && <div className="pipeline-selected"><span>Selected workstation</span><strong>{selectedStage.name}</strong></div>}
        {status === 'completed' && <div className="pipeline-package"><span>Demo result package</span><strong>{DEMO_PACKAGE.topic}</strong><p>{DEMO_PACKAGE.script}</p></div>}
      </div>
    </div>
  )
}
