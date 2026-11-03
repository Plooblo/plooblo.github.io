import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { light } from './store'

gsap.registerPlugin(ScrollTrigger)

const PI = Math.PI
// torch pose (px..s), camera (cx..tz), studio env, pointer tracking, float, callout step, canvas visibility
const base = { px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0, s: 1, cx: 0, cy: 0.3, cz: 5.4, tx: 0, ty: 0, tz: 0, env: 1, track: 1, float: 1, label: 0, vis: 1, props: 0, callouts: 0 }

export function keys(mobile) {
  const m = (d, mob) => (mobile ? { ...d, ...mob } : d)
  return {
    hero: m(
      { ...base, px: 0.78, py: -0.12, rx: -0.42, ry: PI - 0.62, rz: 0.1, s: 1.22 },
      { px: 0, py: -0.18, s: 0.74, cz: 6.2 },
    ),
    // design: top face + T outline
    d1: m(
      { ...base, px: 0.55, py: 0.05, rx: -1.15, ry: PI + 0.35, rz: -0.55, cz: 4.2, track: 0.35, float: 0.4, label: 1, callouts: 1 },
      { px: 0, py: 0.1, s: 0.72, cz: 5.2 },
    ),
    // design: lens face on
    d2: m(
      { ...base, px: 0.45, py: 0.0, rx: -0.12, ry: PI - 0.38, rz: 0, cz: 3.4, cy: 0.2, track: 0.35, float: 0.4, label: 2, callouts: 1 },
      { px: 0, py: 0.15, s: 0.62, cz: 4.6 },
    ),
    // design: side profile, grip and handle across the frame
    d3: m(
      { ...base, px: 0.25, py: 0.05, rx: -0.25, ry: PI / 2 + 0.25, rz: 0.15, cz: 3.9, track: 0.35, float: 0.4, label: 3, callouts: 1 },
      { px: 0, py: 0.42, s: 0.55, ry: PI / 2 + 0.2, rz: 0.3, cz: 4.6 },
    ),
    // lighting: lens faces away over the landscape, camera high behind
    l0: m(
      { ...base, px: 0, py: -0.35, rx: 0.08, ry: 0, rz: 0, cx: 0, cy: 1.1, cz: 3.0, tx: 0, ty: -0.4, tz: -1.5, env: 0.18, track: 0.25, float: 0.3, props: 1 },
      { cz: 3.6, cy: 1.4 },
    ),
    l1: m(
      { ...base, px: 0, py: -0.35, rx: 0.12, ry: 0, rz: 0, cx: 0, cy: 7.2, cz: 3.2, tx: 0, ty: -1.2, tz: -1.6, env: 0.12, track: 0.25, float: 0.3, props: 1 },
      { cy: 9.5, cz: 3.4, tz: -1.4 },
    ),
    buy: m(
      { ...base, px: -0.85, py: -0.05, rx: -0.42, ry: PI + 0.55, rz: -0.1 },
      { px: 0, py: 0.78, s: 0.52, cz: 6.6 },
    ),
  }
}

export const rig = { ...base }

export function setupScroll(mobile) {
  const K = keys(mobile)
  Object.assign(rig, K.hero)
  const st = (trigger, start = 'top bottom', end = 'bottom bottom') => ({ trigger, start, end, scrub: 0.6 })
  const tl = (trigger, ...a) => gsap.timeline({ defaults: { ease: 'power1.inOut' }, scrollTrigger: st(trigger, ...a) })

  // design chapter: 1 viewport to arrive, then three callout beats
  tl('#design')
    .fromTo(rig, K.hero, { ...K.d1, duration: 1, immediateRender: false })
    .to(rig, { duration: 0.35 })
    .to(rig, { ...K.d2, duration: 0.7 })
    .to(rig, { duration: 0.35 })
    .to(rig, { ...K.d3, duration: 0.7 })
    .to(rig, { duration: 0.35 })

  // lighting chapter: swing round behind the torch, switch on, rise to show the 180° spread
  tl('#light')
    .fromTo(rig, K.d3, { ...K.l0, label: 3, callouts: 1, duration: 1, immediateRender: false })
    .fromTo(rig, { callouts: 1 }, { callouts: 0, duration: 0.25, immediateRender: false }, 0)
    .to(rig, { duration: 0.4 })
    .to(rig, { ...K.l1, duration: 1 })
    .to(rig, { duration: 0.4 })

  ScrollTrigger.create({
    trigger: '#light',
    start: () => `top+=${innerHeight * 0.65} top`, // after the question has been asked
    onEnter: () => light.set(true),
  })

  // hand over to the 2D chapters, then bring the torch back for the purchase
  gsap.fromTo(rig, { vis: 1 }, { vis: 0, ease: 'none', immediateRender: false, scrollTrigger: st('#compare', 'top 85%', 'top 25%') })
  gsap.fromTo(
    rig,
    { ...K.l1, vis: 0 },
    { ...K.buy, vis: 1, ease: 'power2.out', immediateRender: false, scrollTrigger: st('#buy', 'top 95%', 'top 10%') },
  )
  // phones: the card scrolls up over the fixed torch, so let the torch recede behind it
  if (mobile) gsap.fromTo(rig, { vis: 1 }, { vis: 0.18, ease: 'none', immediateRender: false, scrollTrigger: st('.buy-card', 'top 70%', 'top 35%') })
}
if (import.meta.env.DEV) window.__rig = rig
