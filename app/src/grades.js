// Six gradient-map colour grades. A grade is a luminance ramp: every pixel's
// brightness picks a colour from `stops`, which is what gives all seven panels
// one palette. `mist` is the paper cream, `ink` the poster black, `glow` the
// neon accent used for the script, ribbon and stars.

export const GRADES = [
  {
    id: 'vice',
    name: 'Vice Sunset',
    stops: ['#160a2e', '#3d1457', '#8e2767', '#e14f63', '#ff9a5a', '#ffd9a0'],
    paper: '#f6ead4',
    ink: '#120b18',
    glow: '#ff7a6b',
    accent: '#ffb066',
    swatch: ['#3d1457', '#e14f63', '#ffd9a0'],
  },
  {
    id: 'neon',
    name: 'Neon Night',
    stops: ['#04060f', '#111646', '#243a94', '#5b49c9', '#b06be6', '#ffc2f4'],
    paper: '#e9ecf7',
    ink: '#080a14',
    glow: '#c07bff',
    accent: '#7fe3ff',
    swatch: ['#111646', '#5b49c9', '#ffc2f4'],
  },
  {
    id: 'palm',
    name: 'Palm Teal',
    stops: ['#041c1b', '#0a3d3b', '#126b63', '#22a08f', '#6fd8bd', '#dcfff2'],
    paper: '#eaf4e9',
    ink: '#071512',
    glow: '#5ef0cf',
    accent: '#ffd98a',
    swatch: ['#0a3d3b', '#22a08f', '#dcfff2'],
  },
  {
    id: 'heat',
    name: 'Heat Haze',
    stops: ['#1c0805', '#4c160b', '#9c3314', '#e2681f', '#ffab52', '#ffe6b0'],
    paper: '#f7ecd8',
    ink: '#170a06',
    glow: '#ff9147',
    accent: '#ffd489',
    swatch: ['#4c160b', '#e2681f', '#ffe6b0'],
  },
  {
    id: 'noir',
    name: 'Mono Noir',
    stops: ['#050506', '#232326', '#56565c', '#909098', '#c9c9cf', '#ffffff'],
    paper: '#f1f0ee',
    ink: '#08080a',
    glow: '#e6e6ee',
    accent: '#b9b9c4',
    swatch: ['#232326', '#909098', '#ffffff'],
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    stops: ['#1a0f22', '#4b2338', '#94443f', '#d1794c', '#f2b276', '#ffe9bd'],
    paper: '#f9eed7',
    ink: '#160d13',
    glow: '#ffb86b',
    accent: '#ffe3a5',
    swatch: ['#4b2338', '#d1794c', '#ffe9bd'],
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

/**
 * A 256-entry lookup for the grade: luminance in, graded RGB out. The photo's
 * own colour is mixed back in at `keep`, so faces and sky keep a little life
 * while the palette still reads as one film.
 */
export function gradeLut(grade, keep = 0.16, contrast = 1.12) {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let v = 0; v < 256; v++) {
    let t = v / 255;
    t = Math.max(0, Math.min(1, (t - 0.5) * contrast + 0.5));
    const [r, g, b] = sampleRamp(grade, t);
    const l = v;
    lut[v * 3] = r * (1 - keep) + l * keep;
    lut[v * 3 + 1] = g * (1 - keep) + l * keep;
    lut[v * 3 + 2] = b * (1 - keep) + l * keep;
  }
  return lut;
}
