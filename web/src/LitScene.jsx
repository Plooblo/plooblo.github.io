import { useEffect, useId, useRef } from 'react'
import { reducedMotion } from './store'

// A dark illustrated scene, drawn twice: a near-black copy and a lit copy revealed through a wedge of light
// that grows from the source at the bottom centre. mode 'wide' = 180° TripleLite fan, 'narrow' = ordinary torch.
const W = 1600, H = 900, SX = 800, SY = 905
const SHAPE = { wide: { span: 90, r: 860 }, narrow: { span: 10, r: 1150 } }

function wedge(span, r, aim) {
  const p = (deg) => {
    const a = ((deg + aim) * Math.PI) / 180
    return `${(SX + Math.sin(a) * r).toFixed(1)} ${(SY - Math.cos(a) * r).toFixed(1)}`
  }
  if (span >= 89.5) return `M ${SX - r} ${SY} A ${r} ${r} 0 0 1 ${SX + r} ${SY} Z`
  return `M ${SX} ${SY} L ${p(-span)} A ${r} ${r} 0 0 1 ${p(span)} Z`
}

export default function LitScene({ Scene, image, mode = 'wide', on, aim = 0, label }) {
  const id = useId().replace(/:/g, '')
  const st = useRef({ k: 0, aim: 0 }).current
  const path = useRef(), glow = useRef(), grad = useRef()
  const target = useRef({ on, aim })
  target.current = { on, aim }

  useEffect(() => {
    let raf, last = performance.now()
    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const t = target.current
      const f = reducedMotion ? 1 : 1 - Math.exp(-dt * (t.on ? 4 : 6))
      st.k += ((t.on ? 1 : 0) - st.k) * f
      st.aim += ((mode === 'wide' ? t.aim * 0.25 : t.aim) - st.aim) * (reducedMotion ? 1 : 1 - Math.exp(-dt * 5))
      const s = SHAPE[mode]
      const k = st.k
      // idle once settled: no repaint of the blurred mask while nothing changes
      const key = `${k.toFixed(4)}|${st.aim.toFixed(3)}`
      if (key === st.key) return (raf = requestAnimationFrame(tick))
      st.key = key
      const d = wedge(s.span * (0.35 + 0.65 * k), s.r * (0.25 + 0.75 * k), st.aim)
      path.current?.setAttribute('d', d)
      glow.current?.setAttribute('d', d)
      grad.current?.setAttribute('r', s.r * (0.25 + 0.75 * k))
      if (path.current) path.current.style.opacity = k
      if (glow.current) glow.current.style.opacity = k * 0.5
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [mode])

  const content = image ? (
    <image href={image} x="0" y="0" width={W} height={H} preserveAspectRatio="xMidYMid slice" />
  ) : (
    <Scene />
  )

  return (
    <svg className="litscene" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" role="img" aria-label={label}>
      <defs>
        <radialGradient id={`g${id}`} ref={grad} cx={SX} cy={SY} r="900" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id={`b${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={mode === 'wide' ? 22 : 14} />
        </filter>
        <mask id={`m${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
          <path ref={path} fill={`url(#g${id})`} filter={`url(#b${id})`} />
        </mask>
      </defs>
      <g className={image ? 'ph-dim' : 'dim'}>{content}</g>
      <g className={image ? 'ph-lit' : 'lit'} mask={`url(#m${id})`}>
        {content}
      </g>
      <path ref={glow} className="beam-glow" fill={`url(#g${id})`} filter={`url(#b${id})`} />
      <g className="src" transform={`translate(${SX} ${H - 8})`}>
        <ellipse rx="54" ry="10" className="src-glow" style={{ opacity: on ? 1 : 0 }} />
      </g>
    </svg>
  )
}

// ─── illustrations (1600×900, light source bottom centre, horizon ≈ y430) ───
const rand = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

function Pine({ x, y, h }) {
  const w = h * 0.36
  return (
    <g>
      <rect className="fl" x={x - h * 0.025} y={y - h * 0.22} width={h * 0.05} height={h * 0.22} />
      <path className="fl ln" d={`M${x} ${y - h} L${x + w * 0.55} ${y - h * 0.6} L${x + w * 0.3} ${y - h * 0.6} L${x + w * 0.8} ${y - h * 0.32} L${x + w * 0.45} ${y - h * 0.32} L${x + w} ${y - h * 0.18} L${x - w} ${y - h * 0.18} L${x - w * 0.45} ${y - h * 0.32} L${x - w * 0.8} ${y - h * 0.32} L${x - w * 0.3} ${y - h * 0.6} L${x - w * 0.55} ${y - h * 0.6} Z`} />
    </g>
  )
}

export function Trail() {
  const r = rand(11)
  const trees = []
  for (let i = 0; i < 26; i++) {
    const depth = r() // 0 far .. 1 near
    const y = 440 + depth * depth * 440
    const side = i % 2 ? 1 : -1
    const off = 120 + depth * 520 + r() * 260
    const x = 800 + side * off
    trees.push({ x, y, h: 70 + depth * 520 + r() * 60 })
  }
  trees.sort((a, b) => a.y - b.y)
  const posts = Array.from({ length: 7 }, (_, i) => {
    const t = i / 6
    const y = 450 + t * t * 430
    return { x: 900 + (y - 430) * 0.86 + 40, y, h: 18 + t * 120 }
  })
  return (
    <g>
      <path className="fl" d="M0 430 C200 380 380 352 560 396 S900 372 1100 410 S1450 362 1600 398 V430 H0Z" />
      <path className="ln" d="M0 430 H1600" />
      <path className="fl2" d="M760 430 L840 430 L1260 900 L340 900 Z" />
      <path className="ln" d="M760 430 L340 900 M840 430 L1260 900" />
      {[0.15, 0.32, 0.55, 0.8].map((t) => (
        <path key={t} className="ln faint" d={`M${800 - (40 + t * 420) * 0.6} ${430 + t * 470} L${800 + (40 + t * 420) * 0.6} ${430 + t * 470}`} />
      ))}
      {posts.map((p, i) => (
        <rect key={i} className="fl ln" x={p.x} y={p.y - p.h} width={p.h * 0.08} height={p.h} />
      ))}
      <path className="ln" d={posts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y - p.h * 0.8}`).join(' ')} />
      <path className="ln" d={posts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y - p.h * 0.4}`).join(' ')} />
      {trees.map((t, i) => (
        <Pine key={i} {...t} />
      ))}
      <g>
        <rect className="fl ln" x="455" y="560" width="10" height="200" />
        <path className="fl2 ln" d="M380 575 H540 L565 600 L540 625 H380 Z" />
      </g>
      <ellipse className="fl ln" cx="1180" cy="760" rx="70" ry="26" />
      <ellipse className="fl ln" cx="300" cy="820" rx="90" ry="30" />
    </g>
  )
}

export function Garage() {
  return (
    <g>
      <path className="fl" d="M0 0 H1600 V900 H0Z" />
      <path className="fl2" d="M320 150 H1280 V560 H320Z" />
      <path className="ln" d="M320 150 H1280 V560 H320Z M320 150 L0 -40 M1280 150 L1600 -40 M320 560 L0 900 M1280 560 L1600 900" />
      {/* pegboard + tools */}
      <rect className="fl ln" x="400" y="210" width="420" height="200" />
      {Array.from({ length: 9 * 4 }, (_, i) => (
        <circle key={i} className="dot" cx={425 + (i % 9) * 46} cy={230 + Math.floor(i / 9) * 50} r="2.5" />
      ))}
      <path className="ln thick" d="M440 250 L440 370 M425 250 a15 15 0 1 0 30 0" />
      <path className="ln thick" d="M500 240 V380 M480 240 H520 V262 H480Z" />
      <path className="ln thick" d="M560 255 L700 255 L700 300 L560 280Z M700 262 h40 v30 h-40" />
      <path className="ln thick" d="M770 240 v110 M760 350 h20 v40 h-20z" />
      {/* bench */}
      <path className="fl ln" d="M370 470 H880 V492 H370Z" />
      <path className="ln" d="M390 492 V610 M860 492 V610 M390 560 H860" />
      <rect className="fl ln" x="420" y="430" width="120" height="40" />
      <path className="fl ln" d="M600 470 v-30 h60 v30 M610 440 v-14 h40 v14" />
      {/* shelving on the left wall */}
      {[220, 330, 440].map((y, i) => (
        <g key={y}>
          <path className="fl ln" d={`M80 ${y + i * 30} L300 ${y + 20} L300 ${y + 30} L80 ${y + i * 30 + 14}Z`} />
          <rect className="fl ln" x={120} y={y + i * 30 - 50} width={50} height={46} />
          <rect className="fl ln" x={190} y={y + i * 30 - 36} width={70} height={36} />
        </g>
      ))}
      {/* car, front three-quarter */}
      <path className="fl ln" d="M930 760 L960 600 Q980 540 1060 520 L1310 500 Q1400 498 1440 560 L1520 640 Q1560 660 1560 720 L1560 800 L930 800Z" />
      <path className="fl2 ln" d="M1000 600 Q1030 548 1080 540 L1290 524 Q1360 522 1400 585 Z" />
      <path className="ln" d="M1220 528 L1240 600" />
      <ellipse className="fl ln" cx="1060" cy="800" rx="62" ry="70" />
      <ellipse className="fl ln" cx="1440" cy="800" rx="70" ry="76" />
      <path className="ln" d="M945 690 H1070 M1460 650 L1550 690" />
      {/* tyre stack */}
      {[0, 1, 2].map((i) => (
        <ellipse key={i} className="fl ln" cx="250" cy={790 - i * 46} rx="110" ry="34" />
      ))}
      <path className="ln faint" d="M0 900 L560 560 M1600 900 L1040 560" />
    </g>
  )
}

export function Home() {
  return (
    <g>
      <path className="fl" d="M0 0 H1600 V900 H0Z" />
      <path className="fl2" d="M280 120 H1320 V600 H280Z" />
      <path className="ln" d="M280 120 H1320 V600 H280Z M280 120 L0 -60 M1320 120 L1600 -60 M280 600 L0 900 M1320 600 L1600 900" />
      {/* cupboard under the stairs */}
      <path className="fl ln" d="M300 600 V430 L700 160 H760 V600Z" />
      <path className="ln" d="M330 600 V445 L690 205 V600" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <path key={i} className="ln faint" d={`M${700 - i * 57} ${160 + i * 38} h40`} />
      ))}
      {/* shelves with boxes, paint tins, a drill */}
      {[300, 420, 520].map((y) => (
        <path key={y} className="fl ln" d={`M880 ${y} H1260 V${y + 12} H880Z`} />
      ))}
      <rect className="fl ln" x="900" y="230" width="110" height="70" />
      <rect className="fl ln" x="1030" y="250" width="90" height="50" />
      <path className="fl ln" d="M1150 300 v-46 h70 v18 h-30 v28z" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect className="fl ln" x={910 + i * 80} y="362" width="60" height="58" />
          <ellipse className="fl2 ln" cx={940 + i * 80} cy="362" rx="30" ry="8" />
        </g>
      ))}
      <rect className="fl ln" x="1160" y="470" width="80" height="50" />
      <rect className="fl ln" x="910" y="480" width="200" height="40" />
      {/* ladder */}
      <path className="ln thick" d="M1380 860 L1460 260 M1500 880 L1560 280" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} className="ln thick" d={`M${1385 + i * 13} ${820 - i * 100} L${1503 + i * 10} ${840 - i * 100}`} />
      ))}
      {/* toolbox */}
      <path className="fl ln" d="M420 820 H700 V720 H420Z M500 720 v-30 h120 v30" />
      <path className="ln" d="M420 760 H700" />
      <path className="ln faint" d="M0 900 L520 600 M1600 900 L1080 600" />
    </g>
  )
}

export function PowerCut() {
  return (
    <g>
      <path className="fl" d="M0 0 H1600 V900 H0Z" />
      <path className="fl2" d="M260 110 H1340 V610 H260Z" />
      <path className="ln" d="M260 110 H1340 V610 H260Z M260 110 L0 -70 M1340 110 L1600 -70 M260 610 L0 900 M1340 610 L1600 900" />
      {/* window with moon */}
      <rect className="fl ln" x="960" y="170" width="260" height="250" />
      <path className="ln" d="M1090 170 V420 M960 295 H1220" />
      <circle className="moon" cx="1170" cy="215" r="18" />
      <path className="fl ln" d="M930 160 Q950 300 935 440 H970 Q985 300 970 160Z M1250 160 Q1230 300 1245 440 H1210 Q1195 300 1210 160Z" />
      {/* picture frame + clock */}
      <rect className="fl ln" x="520" y="200" width="220" height="140" />
      <path className="ln faint" d="M540 320 L600 260 L650 300 L690 250 L720 320" />
      <circle className="fl ln" cx="400" cy="230" r="34" />
      <path className="ln" d="M400 230 V208 M400 230 H418" />
      {/* consumer unit */}
      <rect className="fl ln" x="300" y="330" width="120" height="80" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} className="ln" x={312 + i * 21} y="350" width="12" height="26" />
      ))}
      {/* sofa */}
      <path className="fl ln" d="M440 760 V560 Q440 520 480 520 H920 Q960 520 960 560 V760Z" />
      <path className="fl2 ln" d="M400 600 Q400 570 430 570 H470 V780 H400Z M910 600 Q910 570 940 570 H990 Q1000 570 1000 600 V780 H910Z" />
      <path className="ln" d="M470 650 H910 M690 650 V760" />
      {/* floor lamp (off) */}
      <path className="ln thick" d="M1160 820 V420 M1110 820 H1210" />
      <path className="fl ln" d="M1110 420 L1130 340 H1190 L1210 420Z" />
      {/* coffee table + candle */}
      <path className="fl ln" d="M560 860 L620 790 H900 L960 860Z" />
      <path className="ln" d="M590 860 V890 M930 860 V890" />
      <rect className="fl2 ln" x="740" y="760" width="20" height="34" />
      <path className="ln faint" d="M0 900 L460 610 M1600 900 L1140 610" />
    </g>
  )
}
