import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { light, useLight, pointer, reducedMotion, isTouch, webgl } from './store'
import { rig, setupScroll } from './rig'
import { SHOP, SPECS, IN_THE_BOX, SIZE, WARRANTY } from './config'
import LitScene, { Trail, Garage, Home, PowerCut } from './LitScene'

const Stage = lazy(() => import('./three/Stage'))
const Inspector = lazy(() => import('./three/Inspector'))

const LIFE = [
  { id: 'walk', tag: '01 — Outdoors', h: 'The whole path. Not just a spot on it.', p: 'Verges, hedges, the step you didn’t see coming. A wide beam lights what’s beside you as well as what’s ahead.', Scene: Trail },
  { id: 'camp', tag: '02 — Camping', h: 'Hang it once. Light the whole tent.', p: 'Clip it up by the lanyard and the curved lens spreads light around the space, instead of throwing one bright circle at the wall.', image: '/img/camping.webp' },
  { id: 'garage', tag: '03 — Garage', h: 'Stick it to steel. Get both hands back.', p: 'The magnetic handle holds it on a bonnet, a toolbox or a shelf bracket, lighting your work area while you work.', Scene: Garage },
  { id: 'home', tag: '04 — Home & DIY', h: 'Under the stairs. Behind the boiler.', p: 'The cupboard, the loft hatch, the back of the shed. Wide light in tight, dark places.', Scene: Home },
  { id: 'power', tag: '05 — Power cut', h: 'When the lights go out, light the room.', p: 'Stand it on a table or hang it up and see the room around you, not just a torch-shaped hole in the dark.', Scene: PowerCut },
]

function buy(e) {
  if (SHOP.checkoutUrl) return
  e.preventDefault()
  const t = document.querySelector('.toast')
  t.classList.add('show')
  clearTimeout(buy.t)
  buy.t = setTimeout(() => t.classList.remove('show'), 4200)
}

function LightSwitch({ className = '' }) {
  const on = useLight()
  return (
    <button className={`switch ${on ? 'is-on' : ''} ${className}`} aria-pressed={on} onClick={light.toggle}>
      <span className="switch-knob" aria-hidden="true">
        <i />
      </span>
      <span className="switch-label">
        LIGHT: <b>{on ? 'ON' : 'OFF'}</b>
      </span>
    </button>
  )
}

function Loader() {
  const { progress, active } = useProgress()
  const [gone, setGone] = useState(!webgl)
  useEffect(() => {
    if (!active && progress >= 100) {
      const t = setTimeout(() => setGone(true), 350)
      return () => clearTimeout(t)
    }
  }, [active, progress])
  useEffect(() => {
    const t = setTimeout(() => setGone(true), 9000) // never hold the page hostage
    return () => clearTimeout(t)
  }, [])
  return (
    <div className={`loader ${gone ? 'is-gone' : ''}`} aria-hidden={gone}>
      <div className="loader-mark">
        TRIPLELITE <sup>180°</sup>
      </div>
      <div className="loader-bar">
        <i style={{ transform: `scaleX(${progress / 100})` }} />
      </div>
    </div>
  )
}

function Cursor() {
  const el = useRef()
  useEffect(() => {
    if (isTouch || reducedMotion) return
    let x = innerWidth / 2, y = innerHeight / 2, raf
    const loop = () => {
      const tx = ((pointer.x + 1) / 2) * innerWidth
      const ty = ((1 - pointer.y) / 2) * innerHeight
      x += (tx - x) * 0.18
      y += (ty - y) * 0.18
      if (el.current) el.current.style.transform = `translate(${x}px, ${y}px)`
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [])
  if (isTouch || reducedMotion) return null
  return <div className="cursor" ref={el} aria-hidden="true" />
}

function Compare() {
  const [on, setOn] = useState(false)
  const [aim, setAim] = useState(0)
  const ref = useRef()
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setTimeout(() => setOn(true), 500), { threshold: 0.45 })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  const move = (e) => {
    const r = ref.current.getBoundingClientRect()
    setAim(((e.clientX - r.left) / r.width - 0.5) * 70)
  }
  return (
    <section id="compare" className="compare" ref={ref} onPointerMove={move} onPointerLeave={() => setAim(0)}>
      <header className="sec-head">
        <p className="eyebrow">Side by side</p>
        <h2>
          One lights ahead.
          <br />
          <em>One lights around.</em>
        </h2>
        <p className="lede">Move across the scenes to aim. A conventional torch shows you a spot. The TripleLite shows you where you are.</p>
      </header>
      <div className="compare-grid">
        <figure className="panel">
          <LitScene Scene={Trail} mode="narrow" on={on} aim={aim} label="A woodland path lit by a narrow torch beam" />
          <figcaption>
            <span>Conventional torch</span>
            <b>One direction</b>
          </figcaption>
        </figure>
        <figure className="panel panel-tl">
          <LitScene Scene={Trail} mode="wide" on={on} aim={aim} label="The same path lit by the TripleLite's 180° wide beam" />
          <figcaption>
            <span>TripleLite 180°</span>
            <b>180° wide beam</b>
          </figcaption>
        </figure>
      </div>
      <div className="compare-foot">
        <button className={`switch ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => setOn(!on)}>
          <span className="switch-knob" aria-hidden="true">
            <i />
          </span>
          <span className="switch-label">
            BOTH: <b>{on ? 'ON' : 'OFF'}</b>
          </span>
        </button>
        <p className="note">Illustration of beam shape, not to scale.</p>
      </div>
    </section>
  )
}

function LifePanel({ item, i }) {
  const ref = useRef()
  const [on, setOn] = useState(false)
  const [aim, setAim] = useState(0)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setOn(e.intersectionRatio > 0.4), { threshold: [0, 0.4, 0.8] })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  return (
    <article
      ref={ref}
      className={`life ${i % 2 ? 'life-rev' : ''}`}
      onPointerMove={(e) => {
        const r = ref.current.getBoundingClientRect()
        setAim(((e.clientX - r.left) / r.width - 0.5) * 60)
      }}
    >
      <div className="life-media">
        <LitScene Scene={item.Scene} image={item.image} mode="wide" on={on} aim={aim} label={item.h} />
      </div>
      <div className="life-copy">
        <p className="eyebrow">{item.tag}</p>
        <h3>{item.h}</h3>
        <p>{item.p}</p>
      </div>
    </article>
  )
}

export default function App() {
  const lit = useLight()
  const [stageReady, setStageReady] = useState(false)
  const mobile = typeof innerWidth !== 'undefined' && innerWidth < 760

  // gentle reveal for section content (works with or without WebGL)
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))), { rootMargin: '0px 0px -12% 0px' })
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  // scroll choreography for the 3D stage and the text that rides with it
  useEffect(() => {
    if (!webgl) return
    setupScroll(mobile)
    const steps = document.querySelectorAll('[data-step]')
    const lq = document.querySelectorAll('[data-lq]')
    const buyEl = document.getElementById('buy')
    let raf
    const loop = () => {
      steps.forEach((el) => {
        const d = Math.abs(rig.label - +el.dataset.step)
        el.style.opacity = Math.max(0, 1 - d * 2.4)
        el.style.transform = `translateY(${Math.min(d, 1) * 18}px)`
      })
      const de = document.documentElement
      de.classList.toggle('stage-off', rig.vis < 0.5)
      de.classList.toggle('past-hero', scrollY > innerHeight * 0.8)
      de.classList.toggle('at-buy', buyEl.getBoundingClientRect().top < innerHeight * 0.9)
      raf = requestAnimationFrame(loop)
    }
    loop()
    // lighting chapter copy: question first, answer once the light is on
    const t = gsap.timeline({ scrollTrigger: { trigger: '#light', start: 'top 25%', end: 'bottom bottom', scrub: 0.5 } })
    t.fromTo(lq[0], { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 })
      .to(lq[0], { opacity: 0, y: -30, duration: 0.5 }, '+=0.6')
      .fromTo(lq[1], { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 })
      .fromTo(lq[2], { opacity: 0 }, { opacity: 1, duration: 0.4 }, '<0.3')
      .to({}, { duration: 0.8 })
    // lazy sections (inspector, images, fonts) change the page height: re-measure triggers when they settle
    const r = () => ScrollTrigger.refresh()
    addEventListener('load', r)
    document.fonts?.ready.then(r)
    const ro = new ResizeObserver(() => {
      clearTimeout(ro.t)
      ro.t = setTimeout(r, 150)
    })
    ro.observe(document.querySelector('main'))
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      removeEventListener('load', r)
      ScrollTrigger.getAll().forEach((s) => s.kill())
    }
  }, [])

  return (
    <>
      {webgl && (
        <Suspense fallback={null}>
          <Stage onReady={() => setStageReady(true)} />
        </Suspense>
      )}
      <Loader />
      <Cursor />

      <nav className="nav">
        <a href="#top" className="brand" aria-label="TripleLite 180° home">
          TRIPLE<span>LITE</span>
          <sup>180°</sup>
        </a>
        <div className="nav-links">
          <a href="#design">Explore</a>
          <a href="#compare">180°</a>
          <a href="#specs">Features</a>
        </div>
        <a href="#buy" className="btn btn-sm btn-light">
          Buy now
        </a>
      </nav>

      <main id="top">
        {/* ── 1. hero ── */}
        <section className="hero" id="hero">
          {!webgl && <img className="fallback-hero" src={lit ? '/img/hero-on.webp' : '/img/hero-off.webp'} alt="TripleLite 180° torch" />}
          <div className="hero-copy">
            <p className="eyebrow">
              TripleLite 180° <span className="sep" /> TL1000
            </p>
            <h1 className="headline">
              <span>See more.</span>
              <span>Do more.</span>
            </h1>
            <p className="lede">Meet TripleLite 180°. A distinctive wide-angle light designed to illuminate more of your surroundings.</p>
            <div className="ctas">
              <a href="#design" className="btn btn-ghost">
                Discover TripleLite
              </a>
              <a href="#buy" className="btn btn-light">
                Buy now
              </a>
            </div>
          </div>
          <div className="hero-switch">
            <span className="hint">{isTouch ? 'Tap the torch' : 'Click the torch'} — or flick the switch</span>
            <LightSwitch />
          </div>
          <div className="scroll-cue" aria-hidden="true">
            <i />
            Scroll
          </div>
        </section>

        {/* ── 2. design ── */}
        <section className="design" id="design">
          <div className="sticky">
            <div className="design-copy">
              <p className="eyebrow">The design</p>
              <div className="steps">
                <div data-step="1">
                  <h2>Shaped like a T. Built like a tool.</h2>
                  <p>An aircraft aluminium body with a wide head that puts the light where a normal torch has a reflector.</p>
                </div>
                <div data-step="2">
                  <h2>A lens that curves round the front.</h2>
                  <p>The whole leading edge is the light. It wraps 180°, so it lights left, right and ahead at once.</p>
                </div>
                <div data-step="3">
                  <h2>A grip you can trust in the wet.</h2>
                  <p>Knurled handle, magnetic end, lanyard included. Hold it, hang it, or stick it to steel.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. lighting ── */}
        <section className="lightsec" id="light">
          <div className="sticky">
            <div className="light-copy">
              <h2 data-lq className="big">
                Why light up just one direction?
              </h2>
              <h2 data-lq className="big">
                Experience 180° of
                <br />
                wide-angle lighting.
              </h2>
              <div data-lq className="light-stat">
                <b>1000</b>
                <span>
                  lumens
                  <br />
                  across 180°
                </span>
              </div>
            </div>
            <div className="light-switch">
              <LightSwitch />
            </div>
          </div>
        </section>

        {/* ── 4. comparison ── */}
        <Compare />

        {/* ── 5. real life ── */}
        <section className="lifes" id="life">
          <header className="sec-head reveal">
            <p className="eyebrow">Built for real life</p>
            <h2>
              Every dark corner
              <br />
              <em>is wider than it looks.</em>
            </h2>
          </header>
          {LIFE.map((item, i) => (
            <LifePanel key={item.id} item={item} i={i} />
          ))}
        </section>

        {/* ── 6. inspect ── */}
        <section className="explore" id="explore">
          <header className="sec-head reveal">
            <p className="eyebrow">Take a closer look</p>
            <h2>
              Turn it over.
              <br />
              <em>Switch it on.</em>
            </h2>
          </header>
          {webgl ? (
            <Suspense fallback={<div className="inspector" />}>
              <Inspector />
            </Suspense>
          ) : (
            <img className="fallback-inspect" src="/img/hero-off.webp" alt="TripleLite 180° three-quarter view" />
          )}
        </section>

        {/* ── 7. details ── */}
        <section className="specs" id="specs">
          <header className="sec-head reveal">
            <p className="eyebrow">Product details</p>
            <h2>
              Small enough to carry.
              <br />
              <em>Tough enough to keep.</em>
            </h2>
          </header>
          <div className="spec-grid reveal">
            {SPECS.map((s) => (
              <div className="spec" key={s.u}>
                {s.k ? (
                  <p className="spec-k">
                    {s.k}
                    <small>{s.u}</small>
                  </p>
                ) : (
                  <p className="spec-k spec-word">{s.u}</p>
                )}
                <p className="spec-d">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="tough reveal">
            <figure>
              <img src="/img/wet-head.webp" alt="TripleLite head covered in water droplets" loading="lazy" />
            </figure>
            <figure>
              <img src="/img/wet-grip.webp" alt="Knurled TripleLite grip in the rain" loading="lazy" />
            </figure>
            <div className="tough-copy">
              <h3>Rain doesn’t end the job.</h3>
              <p>Water resistant and impact resistant, with a knurled aluminium grip that stays put in a wet hand.</p>
              <p className="dims">
                Size {SIZE} · Model {SHOP.model}
              </p>
            </div>
          </div>
          <p className="footnote">*Advertised run time. Actual battery life varies by mode and conditions.</p>
        </section>

        {/* ── 8. buy ── */}
        <section className="buy" id="buy">
          {!webgl && <img className="fallback-buy" src="/img/hero-on.webp" alt="TripleLite 180° switched on" />}
          <div className="buy-card">
            <p className="eyebrow">Get yours</p>
            <h2>{SHOP.name}</h2>
            <p className="lede">The torch that lights where you are, not just where you point. 1000 lumens across a 180° wide beam, in an aluminium body that fits in your hand.</p>
            {SHOP.price && <p className="price">{SHOP.price}</p>}
            <a href={SHOP.checkoutUrl || '#buy'} className="btn btn-light btn-xl" onClick={buy} target={SHOP.checkoutUrl ? '_blank' : undefined} rel="noopener">
              Buy now
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
            <ul className="buy-facts">
              <li>
                <b>In the box</b>
                {IN_THE_BOX.join(' · ')}
              </li>
              <li>
                <b>Warranty</b>
                {WARRANTY}
              </li>
              {SHOP.shipping && (
                <li>
                  <b>Delivery</b>
                  {SHOP.shipping}
                </li>
              )}
              {SHOP.returns && (
                <li>
                  <b>Returns</b>
                  {SHOP.returns}
                </li>
              )}
            </ul>
          </div>
          <div className="buy-switch">
            <LightSwitch />
          </div>
        </section>
      </main>

      <footer className="foot">
        <span className="brand">
          TRIPLE<span>LITE</span>
          <sup>180°</sup>
        </span>
        <span>Brighten your world.</span>
        <span>© {new Date().getFullYear()} TripleLite</span>
      </footer>

      <a href="#buy" className="mbar">
        <span>
          TripleLite 180°{SHOP.price ? ` · ${SHOP.price}` : ''}
        </span>
        <b>Buy now</b>
      </a>
      <div className="toast" role="status">
        Checkout link not set yet — add <code>checkoutUrl</code> in <code>src/config.js</code>.
      </div>
    </>
  )
}
