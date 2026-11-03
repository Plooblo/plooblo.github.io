# TripleLite 180° — interactive product site

A single-product, scroll-driven 3D site built around the real TripleLite Blender model.
Vite + React 18 + three.js (React Three Fiber, drei) + GSAP ScrollTrigger. Static output, no server needed.

## Run it

```bash
cd web
npm install
npm run dev        # http://localhost:5173
```

Production build and local preview:

```bash
npm run build      # outputs web/dist
npm run preview    # serves dist on http://localhost:4173
```

Node 18+ is required.

## Before going live: `src/config.js`

| Field | What it does |
| --- | --- |
| `SHOP.checkoutUrl` | Every final **Buy now** button opens this (Shopify, Stripe Payment Link, Amazon listing…). Until it is set, the button shows a small "checkout link not set" notice. |
| `SHOP.price` | Shown in the purchase section and the mobile buy bar. Hidden while `null`. |
| `SHOP.shipping`, `SHOP.returns` | Extra rows in the purchase section. Hidden while empty. |
| `SPECS`, `IN_THE_BOX`, `SIZE`, `WARRANTY` | Product facts, all taken from the TL1000 retail pack and listing images. Only add verified claims. |

## Deploy

`web/dist` is a plain static folder; any static host works.

- **Vercel**: import the repo, set *Root directory* to `web`. Vercel detects Vite (build `npm run build`, output `dist`).
- **Netlify**: base directory `web`, build command `npm run build`, publish directory `web/dist`.
- **Cloudflare Pages**: root `web`, build `npm run build`, output `dist`.
- **Any web server / S3**: upload the contents of `web/dist`. Serve `.wasm` as `application/wasm` (most hosts already do).

There are no environment variables or API keys.

## What's where

```
web/
  public/models/triplelite.glb   the real model, Draco-compressed (150 KB)
  public/draco/                  Draco decoder, self-hosted (no CDN dependency)
  public/img/                    product photos + Blender renders (WebP), og.jpg share image
  src/config.js                  price / checkout / verified specs  ← edit this
  src/App.jsx                    page sections, copy, buy flow
  src/rig.js                     scroll choreography: torch + camera keyframes per chapter
  src/three/Torch.jsx            model loading, materials, knurl shader, lens glow, the torch's own lights
  src/three/Stage.jsx            the fixed 3D stage: cursor spring, floor, forest, dust, 3D callouts
  src/three/Inspector.jsx        drag/zoom product viewer with preset views
  src/LitScene.jsx               2D lit illustrations (comparison + real-life scenes)
  src/store.js                   global light switch, pointer, reduced-motion / WebGL detection
```

## Updating the 3D model

The GLB is exported from `Model/TripleLite.blend` by a script (product only, lights/cameras dropped, Draco compressed):

```bash
"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b Model/TripleLite.blend --python Model/scripts/export_glb.py -- web/public/models/triplelite.glb
```

Object and material names matter: the site finds `Lens_Diffuser` (glow and emission), `Grip_Knurl` (knurl shader),
and the anodised materials by name. The grip knurl and bead-blast were procedural in Blender, so the knurl is
rebuilt in a shader on the site rather than baked.

## Behaviour notes

- **Light switch**: one global state shared by the hero, the scroll stage and the inspector. Click the torch or the switch.
  It also switches on automatically in the lighting chapter.
- **Mobile**: touch movement steers the torch, and it sways on its own when idle. A sticky Buy bar appears after the hero.
- **Reduced motion** (`prefers-reduced-motion`): idle sway, float, dust drift and reveal slides are switched off.
- **No WebGL**: the site falls back to the Blender renders as still images; everything else still works.
- Rendering pauses when the 3D stage or the inspector is off-screen.
