// ─── Edit these before going live ───────────────────────────────────────────────
// Only verified information belongs here. Leave a field empty ('' / null) and the site hides it.
export const SHOP = {
  name: 'TripleLite 180°',
  model: 'TL1000',
  price: null, // e.g. '£29.99' — shown in the purchase section when set
  checkoutUrl: '', // e.g. your Shopify / Stripe Payment Link / Amazon listing URL
  shipping: '', // e.g. 'Free UK delivery, dispatched within 2 working days'
  returns: '', // e.g. '30-day returns'
}

// Taken from the TL1000 retail packaging and listing images. Do not add unverified claims.
export const SPECS = [
  { k: '1000', u: 'lumens', d: 'Across a 180° wide beam' },
  { k: '180°', u: 'wide beam', d: 'Curved lens, lights more than straight ahead' },
  { k: '8:30', u: 'h run time*', d: 'Advertised; varies by mode and conditions' },
  { k: '3', u: 'power settings', d: 'High · Low · Strobe' },
  { k: 'USB-C', u: 'rechargeable', d: 'Charging cable included' },
  { k: null, u: 'Water resistant', d: 'Built for wet nights out' },
  { k: null, u: 'Impact resistant', d: 'Aircraft aluminium body' },
  { k: null, u: 'Magnetic handle', d: 'Stick it to steel, work hands-free' },
]

export const IN_THE_BOX = ['TripleLite 180° (TL1000)', 'USB Type-C charging cable', 'Lanyard']
export const SIZE = '1.5" × 4" × 6"'
export const WARRANTY = 'Limited lifetime warranty' // printed on the retail pack
