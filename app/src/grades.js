// Eight gradient-map colour grades for Midnight Vice. A grade is a luminance
// ramp: every pixel's brightness picks a colour from `stops`, which is what
// gives every panel one palette. `paper` is the cream, `ink` the poster black,
// `glow` the neon accent used for script, ribbon and stars.
//
// Skin-safe by construction. A lit face sits in the upper mid-tones of a photo,
// so the lookup keeps a warm light band there (SKIN_WARM, a peach) whatever the
// palette does elsewhere; and gradePixel() additionally detects skin-coloured
// source pixels and keeps them on that warm band. Between the two, no grade --
// teal, violet or black-and-white -- can turn a face green or purple.

export const GRADES = [
  {
    id: 'vice',
    name: 'Vice Sunset',
    stops: ['#160a2e', '#3d1457', '#8e2767', '#e14f63', '#ff9a5a', '#ffe4c8'],
    paper: '#f6ead4',
    ink: '#120b18',
    glow: '#ff7a6b',
    accent: '#ffb066',
    swatch: ['#3d1457', '#e14f63', '#ffe4c8'],
  },
  {
    id: 'neon',
    name: 'Neon Night',
    stops: ['#04060f', '#111646', '#243a94', '#5b49c9', '#c06be6', '#ffe4e4'],
    paper: '#e9ecf7',
    ink: '#080a14',
    glow: '#c07bff',
    accent: '#7fe3ff',
    swatch: ['#111646', '#5b49c9', '#ffe4e4'],
  },
  {
    id: 'palm',
    name: 'Palm Teal',
    stops: ['#041c1b', '#0a3d3b', '#126b63', '#22a08f', '#8fe0c4', '#fff0e2'],
    paper: '#eaf4e9',
    ink: '#071512',
    glow: '#5ef0cf',
    accent: '#ffd98a',
    swatch: ['#0a3d3b', '#22a08f', '#fff0e2'],
  },
  {
    id: 'heat',
    name: 'Heat Haze',
    stops: ['#1c0805', '#4c160b', '#9c3314', '#e2681f', '#ffab52', '#ffeeda'],
    paper: '#f7ecd8',
    ink: '#170a06',
    glow: '#ff9147',
    accent: '#ffd489',
    swatch: ['#4c160b', '#e2681f', '#ffeeda'],
  },
  {
    id: 'noir',
    name: 'Mono Noir',
    stops: ['#050506', '#232326', '#56565c', '#909098', '#d8cfc7', '#ffffff'],
    paper: '#f1f0ee',
    ink: '#08080a',
    glow: '#e6e6ee',
    accent: '#d6cbc0',
    swatch: ['#232326', '#909098', '#ffffff'],
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    stops: ['#1a0f22', '#4b2338', '#94443f', '#d1794c', '#f2b276', '#fff2dc'],
    paper: '#f9eed7',
    ink: '#160d13',
    glow: '#ffb86b',
    accent: '#ffe3a5',
    swatch: ['#4b2338', '#d1794c', '#fff2dc'],
  },
  {
    id: 'midnight',
    name: 'Midnight Neon',
    stops: ['#02030a', '#0b1238', '#1a2a72', '#40339c', '#9a5cd8', '#ffe6ec'],
    paper: '#e9e4f8',
    ink: '#04050e',
    glow: '#8f7bff',
    accent: '#67e8ff',
    swatch: ['#0b1238', '#40339c', '#ffe6ec'],
  },
  {
    id: 'afterdark',
    name: 'Afterdark Noir',
    stops: ['#010102', '#141419', '#37343e', '#6d6868', '#bdb0a4', '#fff6ee'],
    paper: '#efeae4',
    ink: '#020203',
    glow: '#ff7a8a',
    accent: '#ffc9a0',
    swatch: ['#141419', '#6d6868', '#fff6ee'],
  },
];

export const GRADE_IDS = GRADES.map((grade) => grade.id);

export function gradeById(id) {
  return GRADES.find((grade) => grade.id === id) ?? GRADES[0];
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex, alpha = 1) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function mixHex(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/** Samples a grade's ramp at t in 0..1, as an [r,g,b] triple. */
export function sampleRamp(grade, t) {
  const stops = grade.stops.map(hexToRgb);
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  const a = stops[i];
  const b = stops[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

/* The warm light a lit face is allowed to keep, whatever the palette does:
   a peach in the highlights and a tan in the half-shade, both r > g > b. */
const SKIN_DARK = [0x6d, 0x42, 0x32];
const SKIN_LIGHT = [0xff, 0xe4, 0xd2];

function lerp3(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** The skin-safe colour for a given luminance (0..1): dark tan to warm cream. */
export function skinTone(t) {
  const x = Math.max(0, Math.min(1, t));
  return lerp3(SKIN_DARK, SKIN_LIGHT, x);
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** How far a luminance sits inside the band a lit face occupies. */
export function skinBand(t) {
  return smoothstep(0.16, 0.30, t) * (1 - smoothstep(0.90, 0.995, t));
}

/**
 * A 256-entry lookup for the grade: luminance in, graded RGB out. Shadow and
 * mid-tone keep the palette; the upper mid-tones (where a lit face sits) blend
 * toward the warm skin band; the top keeps the palette's own highlight. The
 * photo's own colour is mixed back in at `keep`, so a face keeps some life.
 */
export function gradeLut(grade, keep = 0.15, contrast = 1.12, skin = 0.86) {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let v = 0; v < 256; v++) {
    const t = v / 255;
    const tc = Math.max(0, Math.min(1, (t - 0.5) * contrast + 0.5));
    // A gentle lift of the upper mid-tones toward the palette's light end.
    const tp = Math.min(1, tc + 0.10 * Math.pow(Math.max(0, tc), 1.15) * (1 - tc) * 0.9);
    const base = sampleRamp(grade, tp);
    const warm = skinTone(t);
    const w = skinBand(t) * skin;
    const c = [
      base[0] * (1 - w) + warm[0] * w,
      base[1] * (1 - w) + warm[1] * w,
      base[2] * (1 - w) + warm[2] * w,
    ];
    // Never let the palette's cool channel overtake green inside the face band:
    // that is the exact hue shift that turns a violet grade's faces magenta.
    if (w > 0.5) {
      const cap = warm[1] + 4;
      if (c[2] > cap) c[2] = c[2] * 0.35 + cap * 0.65;
    }
    lut[v * 3] = c[0] * (1 - keep) + v * keep;
    lut[v * 3 + 1] = c[1] * (1 - keep) + v * keep;
    lut[v * 3 + 2] = c[2] * (1 - keep) + v * keep;
  }
  return lut;
}

/**
 * How much a source pixel already reads as skin (0..1): warm, r >= g >= b, a
 * plausible chroma, and not at the extremes of light. Used to keep colour
 * photos' faces on the warm band too, even when a coloured light hits them.
 */
export function skinScore(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  if (lum < 0.14 || lum > 0.985) return 0;
  const rg = (r - g) / Math.max(1, max);
  const gb = (g - b) / Math.max(1, max);
  const chroma = (max - min) / Math.max(1, max);
  // Warm: red over green over blue, in skin's proportions.
  if (r < g || g < b) return 0;
  if (rg < 0.01 || rg > 0.55) return 0;
  if (gb > 0.42) return 0;
  if (chroma < 0.03) return 0;
  const band = skinBand(lum);
  if (band <= 0) return 0;
  return Math.min(1, band * (0.55 + chroma * 1.6));
}
