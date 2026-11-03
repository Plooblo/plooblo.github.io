import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, AdaptiveDpr } from '@react-three/drei'
import * as THREE from 'three'
import { Torch, Studio, LightLevel, useLevel, LENS, ANCHORS } from './Torch'
import { rig } from '../rig'
import { light, pointer, reducedMotion, isTouch } from '../store'

const v3 = new THREE.Vector3()
const lensW = new THREE.Vector3()
const lensDir = new THREE.Vector3()

// ─── torch pose: scroll keyframe + pointer spring + idle drift + float ───
function Rig({ children }) {
  const g = useRef()
  const lv = useLevel()
  const { camera, scene } = useThree()
  const s = useRef({ yaw: 0, pitch: 0, vy: 0, vp: 0, look: new THREE.Vector3(0, 0, 0), idle: 0 }).current
  useFrame(({ clock }, dt) => {
    dt = Math.min(dt, 1 / 30)
    const t = clock.elapsedTime
    const idleFor = (performance.now() - pointer.t) / 1000
    // blend toward a slow idle sway once the visitor stops moving
    s.idle += ((idleFor > 2.5 || reducedMotion ? 1 : 0) - s.idle) * (1 - Math.exp(-dt * 1.2))
    const track = rig.track * (reducedMotion ? 0.4 : 1)
    const tYaw = (pointer.x * 0.55 * (1 - s.idle) + Math.sin(t * 0.35) * 0.32 * s.idle * (reducedMotion ? 0 : 1)) * track
    const tPitch = (-pointer.y * 0.3 * (1 - s.idle) + Math.sin(t * 0.23) * 0.06 * s.idle * (reducedMotion ? 0 : 1)) * track
    // under-damped spring: a little weight, a soft settle, no jitter
    const k = 38, c = 9.5
    s.vy += (tYaw - s.yaw) * k * dt
    s.vy *= Math.exp(-c * dt)
    s.yaw += s.vy * dt
    s.vp += (tPitch - s.pitch) * k * dt
    s.vp *= Math.exp(-c * dt)
    s.pitch += s.vp * dt

    const o = g.current
    const f = 1 - Math.exp(-dt * 5)
    const float = reducedMotion ? 0 : Math.sin(t * 0.9) * 0.04 * rig.float
    o.position.lerp(v3.set(rig.px, rig.py + float, rig.pz), f)
    o.rotation.order = 'YXZ'
    o.rotation.x += (rig.rx + s.pitch - o.rotation.x) * f
    o.rotation.y += (rig.ry + s.yaw - o.rotation.y) * f
    o.rotation.z += (rig.rz + (reducedMotion ? 0 : Math.sin(t * 0.6) * 0.02 * rig.float) - o.rotation.z) * f
    o.scale.setScalar(o.scale.x + (rig.s - o.scale.x) * f)

    // camera with a touch of cursor parallax
    const par = isTouch ? 0 : 0.18 * rig.track
    camera.position.lerp(v3.set(rig.cx + pointer.x * par, rig.cy + pointer.y * par * 0.6, rig.cz), f)
    s.look.lerp(v3.set(rig.tx, rig.ty, rig.tz), f)
    camera.lookAt(s.look)


    // shared lens world position/direction for dust + floor glow
    o.updateMatrixWorld()
    lensW.copy(LENS).multiplyScalar(10).applyMatrix4(o.matrixWorld)
    lensDir.set(0, 0, -1).transformDirection(o.matrixWorld)
  })
  return <group ref={g}>{children}</group>
}

// ─── ground: dark satin floor that only the torch (and a faint rim) can light ───
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.25, 0]} receiveShadow={false} raycast={() => null}>
      <circleGeometry args={[30, 64]} />
      <meshPhongMaterial color="#17191d" specular="#2a2d33" shininess={18} />
    </mesh>
  )
}

// ─── a quiet landscape the 180° beam reveals (only real light reaches it) ───
function Props() {
  const items = useMemo(() => {
    const out = []
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 80; i++) {
      const a = THREE.MathUtils.degToRad(-180 + rnd() * 360) // all round: only the front half gets lit
      const r = 2.2 + rnd() * 6
      const x = Math.sin(a) * r, z = -Math.cos(a) * r
      if (Math.abs(x) < 0.9 && z < 0) continue // keep the path ahead clear
      const h = 1.2 + rnd() * 2.4
      out.push({ kind: rnd() < 0.78 ? 'tree' : 'rock', x, z, h, s: 0.5 + rnd() * 0.6, r: rnd() * 6 })
    }
    return out
  }, [])
  const mat = useMemo(() => new THREE.MeshLambertMaterial({ color: '#30343b' }), [])
  const g = useRef()
  useFrame(() => g.current && (g.current.visible = rig.props > 0.5))
  return (
    <group ref={g} position={[0, -1.25, 0]}>
      {items.map((p, i) =>
        p.kind === 'tree' ? (
          <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.r, 0]}>
            <mesh material={mat} position={[0, p.h * 0.18, 0]}>
              <cylinderGeometry args={[0.04 * p.s, 0.07 * p.s, p.h * 0.36, 6]} />
            </mesh>
            <mesh material={mat} position={[0, p.h * 0.62, 0]}>
              <coneGeometry args={[0.42 * p.s, p.h * 0.85, 7]} />
            </mesh>
          </group>
        ) : (
          <mesh key={i} material={mat} position={[p.x, 0.08, p.z]} scale={[p.s * 0.5, p.s * 0.3, p.s * 0.45]} rotation={[p.r, p.r * 2, 0]}>
            <dodecahedronGeometry args={[0.6, 0]} />
          </mesh>
        ),
      )}
      {/* path edges */}
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.003, -6]}>
          <planeGeometry args={[0.03, 12]} />
          <meshLambertMaterial color="#3a3e46" />
        </mesh>
      ))}
    </group>
  )
}

// ─── dust motes: faint in the dark, catching light inside the beam ───
const dustVert = /* glsl */ `
  uniform float uTime; uniform float uLevel; uniform vec3 uLens; uniform vec3 uDir; uniform float uPx;
  attribute float aSeed; varying float vA;
  void main(){
    vec3 p = position;
    p.x += sin(uTime * 0.11 + aSeed * 6.0) * 0.25;
    p.y += sin(uTime * 0.07 + aSeed * 11.0) * 0.3;
    p.z += cos(uTime * 0.09 + aSeed * 4.0) * 0.25;
    vec3 d = p - uLens; float dist = length(d);
    float front = smoothstep(-0.05, 0.25, dot(d / dist, uDir));
    float lit = front * exp(-dist * 0.35);
    vA = 0.05 + uLevel * lit * 1.6;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uPx * (0.6 + aSeed) * (1.0 + uLevel * lit) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }`
// note: smoothstep with reversed edges is undefined in GLSL, so the falloff is written as 1 - smoothstep
const dustFrag = /* glsl */ `
  varying float vA;
  void main(){ float r = length(gl_PointCoord - 0.5); float a = (1.0 - smoothstep(0.0, 0.5, r)) * vA; gl_FragColor = vec4(vec3(0.9,0.95,1.0) * a, a); }`

function Dust({ count }) {
  const lv = useLevel()
  const { gl } = useThree()
  const [geo, mat] = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const p = new Float32Array(count * 3)
    const s = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 10
      p[i * 3 + 1] = -1.2 + Math.random() * 4
      p[i * 3 + 2] = -7 + Math.random() * 10
      s[i] = Math.random()
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(s, 1))
    const m = new THREE.ShaderMaterial({
      vertexShader: dustVert,
      fragmentShader: dustFrag,
      uniforms: { uTime: { value: 0 }, uLevel: { value: 0 }, uLens: { value: lensW }, uDir: { value: lensDir }, uPx: { value: 26 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    return [g, m]
  }, [count])
  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime
    mat.uniforms.uLevel.value = lv.v
    mat.uniforms.uPx.value = 26 * gl.getPixelRatio()
  })
  return <points geometry={geo} material={mat} raycast={() => null} />
}

// ─── backdrop: deep radial gradient that warms up very slightly when lit ───
function Backdrop() {
  const lv = useLevel()
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uLevel: { value: 0 } },
        vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform float uLevel; varying vec3 vP;
          void main(){ float h = vP.y; float q = (h - 0.32) / 0.38; float glow = exp(-q * q) * smoothstep(-0.05, 0.25, h);
            vec3 base = mix(vec3(0.0196,0.0196,0.0235), vec3(0.04,0.043,0.052), glow);
            base += vec3(0.022,0.025,0.03) * uLevel * glow;
            gl_FragColor = vec4(base, 1.0); }`,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  )
  useFrame(() => (mat.uniforms.uLevel.value = lv.v))
  return (
    <mesh material={mat} scale={40} raycast={() => null} renderOrder={-1}>
      <sphereGeometry args={[1, 32, 16]} />
    </mesh>
  )
}

// ─── 3D-anchored callouts for the design chapter ───
const LABELS = [
  { step: 1, at: 'head', t: 'T-shaped head', d: '4" across, the whole front is light', side: 'r', len: 150 },
  { step: 1, at: 'button', t: 'One-touch button', d: 'High · Low · Strobe', side: 'l', len: 170 },
  { step: 1, at: 'logo', t: 'Aircraft aluminium body', d: 'Anodised, impact resistant', side: 'l', dy: 1, len: 170 },
  { step: 2, at: 'lens', t: 'Curved 180° lens', d: 'Light that wraps around you', side: 'r' },
  { step: 2, at: 'lensEdge', t: 'Water resistant', d: 'Built for rain and wet hands', side: 'l', dy: 1 },
  { step: 3, at: 'grip', t: 'Knurled grip', d: 'Sure hold, wet or dry', side: 'l' },
  { step: 3, at: 'cap', t: 'Magnetic handle', d: 'Hands-free on any steel', side: 'r' },
  { step: 3, at: 'lanyard', t: 'Lanyard', d: 'Included', side: 'l', dy: 1 },
]

function Callouts({ portal }) {
  const refs = useRef([])
  useFrame(() =>
    refs.current.forEach((el, i) => {
      if (!el) return
      const a = Math.max(0, 1 - Math.abs(rig.label - LABELS[i].step) * 2.6) * rig.vis * rig.callouts
      el.style.opacity = a
      el.style.transform = `translateY(${(1 - a) * 8}px)`
    }),
  )
  return LABELS.map((l, i) => (
    <Html key={i} portal={portal} position={ANCHORS[l.at]} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      <div ref={(r) => (refs.current[i] = r)} className={`callout callout-${l.side} ${l.dy ? 'callout-low' : ''}`} style={{ opacity: 0, '--len': `${l.len || 120}px` }}>
        <i className="callout-dot" />
        <i className="callout-line" />
        <div className="callout-text">
          <b>{l.t}</b>
          <span>{l.d}</span>
        </div>
      </div>
    </Html>
  ))
}

function Visibility({ wrap }) {
  // fade the canvas between chapters and stop rendering while hidden
  const { set } = useThree()
  const shown = useRef(true)
  useFrame(() => {
    if (wrap.current) wrap.current.style.opacity = rig.vis
  })
  useEffect(() => {
    let raf
    const loop = () => {
      const want = rig.vis > 0.01
      if (want !== shown.current) {
        shown.current = want
        set({ frameloop: want ? 'always' : 'never' })
        if (wrap.current) wrap.current.style.opacity = rig.vis
      }
      if (wrap.current && !want) wrap.current.style.opacity = 0
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return null
}

export default function Stage({ onReady }) {
  const wrap = useRef()
  const [mobile] = useState(() => innerWidth < 760)
  return (
    <div className="stage" ref={wrap} aria-hidden="true">
      <Canvas
        eventSource={document.getElementById('root')}
        eventPrefix="client"
        dpr={[1, mobile ? 1.5 : 1.8]}
        gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.NeutralToneMapping }}
        camera={{ fov: 30, near: 0.1, far: 100, position: [0, 0.3, 5.2] }}
        onCreated={(st) => import.meta.env.DEV && (window.__three = st)}
      >
        <fog attach="fog" args={['#050506', 6, 16]} />
        <LightLevel>
          <Suspense fallback={null}>
            <Studio factor={(l) => rig.env * (1 - 0.75 * l)} />
            <Backdrop />
            <Floor />
            <Props />
            <Dust count={mobile ? 220 : 520} />
            <Rig>
              <Torch onToggle={light.toggle} />
              <group scale={10}>
                <Callouts portal={wrap} />
              </group>
            </Rig>
            <ambientLight intensity={0.04} />
            <ReadySignal onReady={onReady} />
          </Suspense>
          <Visibility wrap={wrap} />
          <AdaptiveDpr pixelated={false} />
        </LightLevel>
      </Canvas>
    </div>
  )
}

function ReadySignal({ onReady }) {
  useEffect(() => {
    document.documentElement.classList.add('model-ready')
    onReady?.()
  }, [])
  return null
}
