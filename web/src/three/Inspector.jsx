import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { CameraControls, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { Torch, Studio, LightLevel } from './Torch'
import { light, useLight } from '../store'

// The model's origin is the back edge of the head; this centres the whole torch on the orbit target.
const CENTER = [0, 0, -0.35]

// [camera position, look-at], world units (torch is ×10, lens faces -Z)
export const VIEWS = {
  Hero: [[2.2, 1.6, -2.6], [0, 0, 0]],
  Front: [[0, 0.25, -3.1], [0, 0, 0]],
  Back: [[0, 0.6, 3.1], [0, 0, 0]],
  Side: [[3.1, 0.25, 0], [0, 0, 0]],
  Top: [[0, 3.2, 0.01], [0, 0, 0]],
  Lens: [[0.75, 0.25, -1.5], [0, 0, -0.75]],
  Grip: [[1.15, 0.55, 0.65], [0, 0, 0.35]],
}

export default function Inspector() {
  const ctl = useRef()
  const box = useRef()
  const [view, setView] = useState('Hero')
  const [active, setActive] = useState(false)
  const on = useLight()

  // only render while on screen
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: '200px' })
    io.observe(box.current)
    return () => io.disconnect()
  }, [])

  const go = (name) => {
    setView(name)
    const [p, t] = VIEWS[name]
    ctl.current?.setLookAt(...p, ...t, true)
  }

  return (
    <div className="inspector" ref={box}>
      <div className="inspector-canvas">
        <Canvas
          frameloop={active ? 'always' : 'never'}
          dpr={[1, 1.75]}
          gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping }}
          camera={{ fov: 32, near: 0.05, far: 50, position: VIEWS.Hero[0] }}
        >
          <color attach="background" args={['#08090b']} />
          <LightLevel>
            <Suspense fallback={null}>
              <Studio />
              <group position={CENTER}>
                <Torch onToggle={light.toggle} />
              </group>
              <ContactShadows position={[0, -0.36, 0]} opacity={0.6} scale={5} blur={2.6} far={1} />
            </Suspense>
            <CameraControls
              ref={ctl}
              makeDefault
              minDistance={1.1}
              maxDistance={5.5}
              dollySpeed={0.5}
              smoothTime={0.35}
              onStart={() => setView('')}
            />
          </LightLevel>
        </Canvas>
        <p className="inspector-hint">Drag to rotate · Scroll or pinch to zoom · Click the torch to switch it</p>
      </div>
      <div className="inspector-ui">
        <div className="chips" role="group" aria-label="Camera views">
          {Object.keys(VIEWS).map((k) => (
            <button key={k} className={`chip ${view === k ? 'is-on' : ''}`} onClick={() => go(k)}>
              {k === 'Hero' ? 'Reset view' : k}
            </button>
          ))}
        </div>
        <button className={`switch ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={light.toggle}>
          <span className="switch-knob" aria-hidden="true">
            <i />
          </span>
          <span className="switch-label">
            LIGHT: <b>{on ? 'ON' : 'OFF'}</b>
          </span>
        </button>
      </div>
    </div>
  )
}
