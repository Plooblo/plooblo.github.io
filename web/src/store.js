import { useSyncExternalStore } from 'react'

// One light switch for the whole site: every canvas and the DOM read it.
let on = false
const subs = new Set()
let ac

function click(state) {
  try {
    ac ||= new AudioContext()
    const t = ac.currentTime
    const o = ac.createOscillator()
    const g = ac.createGain()
    o.type = 'triangle'
    o.frequency.setValueAtTime(state ? 2400 : 1500, t)
    o.frequency.exponentialRampToValueAtTime(220, t + 0.035)
    g.gain.setValueAtTime(0.06, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06)
    o.connect(g).connect(ac.destination)
    o.start(t)
    o.stop(t + 0.07)
  } catch {}
}

export const light = {
  get: () => on,
  set(v, byUser = false) {
    if (v === on) return
    on = v
    document.documentElement.classList.toggle('lit', on)
    if (byUser) {
      click(on)
      document.documentElement.classList.add('touched')
    }
    subs.forEach((f) => f())
  },
  toggle: () => light.set(!on, true),
  sub(f) {
    subs.add(f)
    return () => subs.delete(f)
  },
}

export const useLight = () => useSyncExternalStore(light.sub, light.get)

// Pointer in -1..1 for the whole window (overlays never block tracking).
export const pointer = { x: 0, y: 0, t: 0 }
if (typeof window !== 'undefined') {
  const set = (cx, cy) => {
    pointer.x = (cx / innerWidth) * 2 - 1
    pointer.y = -(cy / innerHeight) * 2 + 1
    pointer.t = performance.now()
  }
  addEventListener('pointermove', (e) => set(e.clientX, e.clientY), { passive: true })
  addEventListener('touchmove', (e) => e.touches[0] && set(e.touches[0].clientX, e.touches[0].clientY), { passive: true })
}

export const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
export const isTouch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches

export const webgl = (() => {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
})()
