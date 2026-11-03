import { useMemo, useRef, createContext, useContext } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, Environment, Lightformer, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { useLight } from '../store'

export const MODEL = '/models/triplelite.glb'
const DRACO = '/draco/'
useGLTF.preload(MODEL, DRACO)

// Model space (metres, from Blender): lens faces -Z, top face (logo, button) +Y, handle runs to +Z, head along X.
export const LENS = new THREE.Vector3(0, 0, -0.046)
export const ANCHORS = {
  lens: [0.03, 0.004, -0.044],
  lensEdge: [-0.038, -0.004, -0.036],
  button: [0, 0.0195, -0.011],
  head: [0.05, 0.012, -0.004],
  logo: [0.016, 0.0195, -0.03],
  grip: [0, 0.0134, 0.05],
  ring: [0, 0.0134, 0.093],
  cap: [0, 0, 0.112],
  lanyard: [0, -0.012, 0.128],
}

// ─── light level: one damped value per canvas, driven by the global switch ───
const LevelCtx = createContext(null)
export const useLevel = () => useContext(LevelCtx)

export function LightLevel({ children }) {
  const on = useLight()
  const lv = useRef({ v: 0, flash: 0, last: false }).current
  useFrame((_, dt) => {
    if (on !== lv.last) {
      lv.last = on
      if (on) lv.flash = 1
    }
    const k = on ? 7 : 5
    lv.v += ((on ? 1 : 0) - lv.v) * (1 - Math.exp(-dt * k))
    lv.flash *= Math.exp(-dt * 5)
  }, -10)
  return <LevelCtx.Provider value={lv}>{children}</LevelCtx.Provider>
}

// ─── studio environment: soft boxes that read as long reflections on black anodising ───
export function Studio({ intensity = 1, factor }) {
  const lv = useLevel()
  const dl = useRef([])
  const { scene } = useThree()
  useFrame(() => {
    // the studio dims as the torch takes over the scene
    const f = factor ? factor(lv.v) : 1 - 0.6 * lv.v
    scene.environmentIntensity = f
    dl.current.forEach((l) => l && (l.intensity = l.userData.base * f))
  })
  return (
    <>
      <Environment resolution={256} frames={1} environmentIntensity={intensity}>
        <color attach="background" args={['#000']} />
        {/* key softbox, front-right-high: the long highlight across the top of the head */}
        <Lightformer form="rect" intensity={7} position={[3, 3, 3]} scale={[5, 2, 1]} target={[0, 0, 0]} />
        {/* broad fill from the left */}
        <Lightformer form="rect" intensity={1.6} position={[-5, 1, 2]} scale={[6, 4, 1]} target={[0, 0, 0]} />
        {/* tall rim strips behind: crisp edge lines that draw the T silhouette */}
        <Lightformer form="rect" intensity={9} position={[-3.5, 0.5, -3]} scale={[0.5, 8, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={8} position={[3.5, 0.2, -2.8]} scale={[0.5, 8, 1]} target={[0, 0, 0]} />
        {/* overhead */}
        <Lightformer form="rect" intensity={2.5} position={[0, 6, 0]} scale={[6, 6, 1]} target={[0, 0, 0]} />
        {/* low front strip: catches the underside and the knurl */}
        <Lightformer form="rect" intensity={3} position={[0, -3, 4]} scale={[8, 0.6, 1]} target={[0, 0, 0]} />
        <Lightformer form="ring" intensity={1.2} color="#cfe3ff" position={[0, 0, 7]} scale={3} target={[0, 0, 0]} />
      </Environment>
      {[
        [[3, 4, 3], 1.2, '#ffffff'],
        [[-4, 1.5, -3], 2.2, '#cfe0ff'],
        [[4, 0.5, -4], 1.6, '#ffffff'],
      ].map(([p, i, c], k) => (
        <directionalLight key={k} ref={(r) => (dl.current[k] = r)} position={p} intensity={i} color={c} userData={{ base: i }} />
      ))}
    </>
  )
}

// ─── knurl: the Blender bump was procedural, so it is rebuilt here from model-space position ───
const KNURL = { count: Math.round((2 * Math.PI * 13) / 1.45), pitch: 0.00145, from: 0.0215, to: 0.084 }
function addKnurl(m, amp = 0.0028) {
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vKP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvKP = position;')
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vKP;').replace(
      '#include <normal_fragment_maps>',
      /* glsl */ `#include <normal_fragment_maps>
      {
        float band = smoothstep(${KNURL.from}, ${KNURL.from + 0.0012}, vKP.z) * (1.0 - smoothstep(${KNURL.to - 0.0012}, ${KNURL.to}, vKP.z));
        if (band > 0.0 && length(vKP.xy) > 1e-4) { // atan(0,0) on the end cap axis is NaN, which bloom smears across the frame
          float a = atan(vKP.y, vKP.x) / 6.2831853 * ${KNURL.count.toFixed(1)};
          float v = vKP.z / ${KNURL.pitch};
          float h = (1.0 - abs(2.0 * fract(a) - 1.0)) * (1.0 - abs(2.0 * fract(v) - 1.0));
          h = smoothstep(0.0, 0.7, h);
          float aa = clamp(1.0 - 2.2 * max(fwidth(a), fwidth(v)), 0.0, 1.0); // fade out before it aliases
          h *= band * aa * ${amp};
          vec3 dpdx = dFdx(-vViewPosition), dpdy = dFdy(-vViewPosition);
          vec3 r1 = cross(dpdy, normal), r2 = cross(normal, dpdx);
          float det = dot(dpdx, r1);
          vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
          vec3 nn = abs(det) * normal - grad;
          if (abs(det) > 1e-14 && dot(nn, nn) > 1e-28) normal = normalize(nn);
        }
      }`,
    )
  }
  m.customProgramCacheKey = () => 'knurl'
}

// ─── the actual TripleLite model ───
export function Torch({ onToggle, scale = 10 }) {
  const { scene } = useGLTF(MODEL, DRACO)
  const lv = useLevel()
  const { root, lens } = useMemo(() => {
    const root = scene.clone(true)
    let lens
    root.traverse((o) => {
      if (!o.isMesh) return
      o.material = o.material.clone()
      const m = o.material
      const n = m.name
      if (n === 'Body_Anodised_Black') Object.assign(m, { roughness: 0.3, metalness: 0.75 }), m.color.set('#141518')
      if (n === 'Grip_Knurl') {
        Object.assign(m, { roughness: 0.36, metalness: 0.75 }), m.color.set('#141518')
        addKnurl(m)
      }
      if (n === 'Ring_Anodised_Yellow') Object.assign(m, { roughness: 0.3, metalness: 1 })
      if (n === 'Lanyard_Cord') Object.assign(m, { roughness: 0.9 })
      if (n === 'Lens_Diffuser') {
        o.material = new THREE.MeshPhysicalMaterial({
          name: n,
          color: '#c9ced6',
          roughness: 0.32,
          clearcoat: 0.5,
          clearcoatRoughness: 0.08,
          emissive: new THREE.Color('#eef6ff'),
          emissiveIntensity: 0,
        })
        lens = o
      }
    })
    root.children.filter((c) => c.name.startsWith('Cam_')).forEach((c) => root.remove(c))
    return { root, lens }
  }, [scene])

  useFrame(() => {
    if (!lens) return
    // emissive above 1 feeds the bloom pass; the flash gives a tiny ignition kick
    lens.material.emissiveIntensity = lv.v * 2.2 + lv.flash * 1.5
    lens.material.color.setScalar(0.79 + lv.v * 0.2)
  })

  const down = useRef(null)
  return (
    <group scale={scale}>
      <primitive
        object={root}
        onPointerDown={(e) => (down.current = [e.clientX, e.clientY])}
        onPointerUp={(e) => {
          const d = down.current
          if (onToggle && d && Math.hypot(e.clientX - d[0], e.clientY - d[1]) < 6) {
            e.stopPropagation()
            onToggle()
          }
        }}
        onPointerOver={() => onToggle && (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      />
      <TorchLights />
    </group>
  )
}

// ─── the light the torch casts: three wide spots fanned across 180°, plus a soft fill at the lens ───
function TorchLights() {
  const lv = useLevel()
  const spots = useRef([])
  const fill = useRef()
  const fan = [-62, 0, 62].map((deg) => {
    const r = THREE.MathUtils.degToRad(deg)
    return [Math.sin(r) * 0.2, -0.03, -Math.cos(r) * 0.2] // target, model space (metres)
  })
  const targets = useMemo(() => fan.map((p) => new THREE.Object3D()), [])
  useFrame(() => {
    spots.current.forEach((s, i) => s && (s.intensity = lv.v * (i === 1 ? 60 : 50)))
    if (fill.current) fill.current.intensity = lv.v * 0.35
  })
  return (
    <group position={LENS.toArray()}>
      {fan.map((p, i) => (
        <group key={i}>
          <primitive object={targets[i]} position={p} />
          <spotLight
            ref={(r) => (spots.current[i] = r)}
            target={targets[i]}
            angle={0.82}
            penumbra={1}
            decay={1.6}
            distance={0}
            color="#eef5ff"
            intensity={0}
            position={[0, 0, -0.025]} // keep clear of the lens: closer and the irradiance overflows half-float
          />
        </group>
      ))}
      <LensGlow />
      <pointLight ref={fill} position={[0, 0.01, -0.05]} distance={3} decay={2} color="#eef5ff" intensity={0} />
      <LightFan />
    </group>
  )
}

// ─── lens glow: camera-facing additive sprites spread along the curved lens (cheap, robust bloom stand-in) ───
const glowFrag = /* glsl */ `
  uniform float uA; varying vec2 vUv;
  void main(){
    vec2 p = vUv * 2.0 - 1.0; p.x *= 0.62; // a little wider than tall, like the lens band
    float r = length(p);
    float core = exp(-r * r * 9.0);
    float halo = exp(-r * 3.2) * (1.0 - smoothstep(0.75, 1.0, r));
    float a = uA * (core * 0.9 + halo * 0.35);
    gl_FragColor = vec4(vec3(0.9, 0.95, 1.0) * a, a);
  }`
const glowVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3()

function LensGlow() {
  const lv = useLevel()
  const g = useRef()
  const mat = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: glowVert, fragmentShader: glowFrag, uniforms: { uA: { value: 0 } }, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }),
    [],
  )
  useFrame(({ camera }) => {
    if (!g.current) return
    // brightest seen face-on, gone once the lens points away from the viewer
    g.current.getWorldPosition(tmpA)
    tmpB.set(0, 0, -1).transformDirection(g.current.matrixWorld)
    const facing = THREE.MathUtils.smoothstep(tmpB.dot(camera.position.clone().sub(tmpA).normalize()), -0.05, 0.45)
    mat.uniforms.uA.value = (lv.v + lv.flash * 0.6) * facing
    g.current.visible = mat.uniforms.uA.value > 0.002
  })
  return (
    <group ref={g} position={[0, 0, -0.006]}>
      {[-0.026, 0, 0.026].map((x, i) => (
        <Billboard key={i} position={[x, 0, x === 0 ? -0.004 : 0.004]}>
          <mesh material={mat} renderOrder={20} raycast={() => null}>
            <planeGeometry args={[x === 0 ? 0.13 : 0.1, 0.07]} />
          </mesh>
        </Billboard>
      ))}
    </group>
  )
}

// ─── volumetric-looking fan: concentric half-shells, additive, brightest where the view grazes them ───
const fanVert = /* glsl */ `
  varying vec3 vN; varying vec3 vV; varying vec3 vP;
  void main(){
    vP = position;
    vec4 wp = modelMatrix * vec4(position,1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vV = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`
const fanFrag = /* glsl */ `
  uniform float uLevel; uniform float uTime; uniform float uShell;
  varying vec3 vN; varying vec3 vV; varying vec3 vP;
  void main(){
    vec3 d = normalize(vP);
    float az = atan(d.x, d.z);                  // 0 straight ahead, +-pi/2 at the sides
    float el = asin(clamp(d.y, -1.0, 1.0));
    float side = 1.0 - smoothstep(1.25, 1.6, abs(az));
    float e = el / 0.33;
    float vert = exp(-e * e); // pow() of a negative base is NaN in GLSL
    float graze = pow(1.0 - abs(dot(vN, vV)), 1.6);
    float rays = 0.75 + 0.25 * sin(az * 23.0 + uTime * 0.35) * sin(az * 7.0 - uTime * 0.2);
    float a = uLevel * side * vert * (0.06 + graze) * rays * (1.0 - uShell) * 0.09;
    gl_FragColor = vec4(vec3(0.86, 0.92, 1.0) * a, a);
  }`

function LightFan() {
  const lv = useLevel()
  const shells = [0.06, 0.12, 0.2, 0.3, 0.42]
  const mats = useMemo(
    () =>
      shells.map(
        (_, i) =>
          new THREE.ShaderMaterial({
            vertexShader: fanVert,
            fragmentShader: fanFrag,
            uniforms: { uLevel: { value: 0 }, uTime: { value: 0 }, uShell: { value: i / shells.length } },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
          }),
      ),
    [],
  )
  useFrame(({ clock }) =>
    mats.forEach((m) => {
      m.uniforms.uLevel.value = lv.v
      m.uniforms.uTime.value = clock.elapsedTime
    }),
  )
  return shells.map((r, i) => (
    // half sphere band in front of the lens (model space metres)
    <mesh key={i} material={mats[i]} rotation={[0, Math.PI, 0]} renderOrder={10} raycast={() => null}>
      <sphereGeometry args={[r, 64, 24, 0, Math.PI, Math.PI * 0.22, Math.PI * 0.56]} />
    </mesh>
  ))
}
