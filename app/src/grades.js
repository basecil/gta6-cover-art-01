// Eight gradient-map colour grades for Sunflare, tuned to golden hour: every
// palette runs from a warm dusk shadow to a sunlit cream, and the two accent
// grades (Palm Teal, Neon Night) keep their cool light in the sky stops only.
// `paper` is the cream, `ink` the poster black, `glow` the accent used for the
// script, ribbon and stars.
//
// Skin-safe by construction. A lit face sits in the upper mid-tones of a photo,
// so the lookup keeps a warm light band there (SKIN_WARM, a peach) whatever the
// palette does elsewhere; and gradePixel() additionally detects skin-toned
// source pixels and keeps them on that warm band. Between the two, no grade --
// teal, violet or black-and-white -- can turn a face green or purple.

export const GRADES = [
  {
    id: 'golden',
    name: 'Golden Hour',
    stops: ['#2a1216', '#5c2418', '#a8451f', '#e07a2a', '#f7b25e', '#fff3da'],
    paper: '#fff2d8',
    ink: '#1a0c08',
    glow: '#ffb45e',
    accent: '#ffe0a0',
    swatch: ['#a8451f', '#e07a2a', '#fff3da'],
  },
  {
    id: 'coral',
    name: 'Coral Dusk',
    stops: ['#2a1220', '#6b2130', '#b83c48', '#f0675f', '#ffa07e', '#fff0e2'],
    paper: '#fff0e2',
    ink: '#1c0c10',
    glow: '#ff8a72',
    accent: '#ffc9a6',
    swatch: ['#b83c48', '#f0675f', '#fff0e2'],
  },
  {
    id: 'vice',
    name: 'Vice Sunset',
    stops: ['#2b1035', '#6a1b52', '#b33169', '#ef5a76', '#ff9a72', '#ffe6c8'],
    paper: '#ffeada',
    ink: '#1b0a18',
    glow: '#ff7a86',
    accent: '#ffbe86',
    swatch: ['#6a1b52', '#ef5a76', '#ffe6c8'],
  },
  {
    id: 'strip',
    name: 'Sunset Strip',
    stops: ['#241028', '#5d1c3f', '#a93a52', '#e86a52', '#ffae62', '#fff1dc'],
    paper: '#fff1dc',
    ink: '#180a14',
    glow: '#ff9a5c',
    accent: '#ffd28c',
    swatch: ['#a93a52', '#e86a52', '#fff1dc'],
  },
  {
    id: 'heat',
    name: 'Heatwave',
    stops: ['#2a0f08', '#5e1c0c', '#ab3b12', '#ef7620', '#ffb055', '#fff0da'],
    paper: '#fff2dc',
    ink: '#1a0905',
    glow: '#ff8c38',
    accent: '#ffd08a',
    swatch: ['#ab3b12', '#ef7620', '#fff0da'],
  },
  {
    id: 'palm',
    name: 'Palm Teal',
    stops: ['#062023', '#0f3f42', '#1f6f6a', '#4a9a86', '#c9cf94', '#fff0d8'],
    paper: '#fff4de',
    ink: '#061715',
    glow: '#6fe0c0',
    accent: '#ffd98a',
    swatch: ['#0f3f42', '#4a9a86', '#fff0d8'],
  },
  {
    id: 'neon',
    name: 'Neon Night',
    stops: ['#0f1030', '#2a2a66', '#52509e', '#9b7fc4', '#ffc08e', '#fff0e2'],
    paper: '#fff1e4',
    ink: '#0a0a1c',
    glow: '#c58bff',
    accent: '#ffb27a',
    swatch: ['#2a2a66', '#9b7fc4', '#fff0e2'],
  },
  {
    id: 'noir',
    name: 'Mono Noir',
    stops: ['#0d0b0a', '#2a2521', '#5c5147', '#94816c', '#d9c3a5', '#fff6e8'],
    paper: '#fff6e8',
    ink: '#0b0908',
    glow: '#f0e2cc',
    accent: '#e8d2ac',
    swatch: ['#2a2521', '#94816c', '#fff6e8'],
  },
];

export const DEFAULT_GRADE = 'golden';

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
  return smoothstep(0.14, 0.28, t) * (1 - smoothstep(0.90, 0.995, t));
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
