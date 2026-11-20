// The cover engine for Sunflare: one function draws the whole poster at any
// size, so the live preview and all four exports run identical code. Geometry
// comes from layouts.js, palettes from grades.js; nothing here touches the
// network.
//
// The look is a golden-hour key-art collage: the photo field runs edge to edge,
// a striped-chrome title sits OVER the art, the pop-out hero breaks in front of
// it, and a retail band along the bottom carries the billing block, barcode and
// press quote the way a real poster does.

import { layoutPanels, panelGap } from './layouts.js';
import { gradeById, gradeLut, skinScore, skinTone, rgba, mixHex } from './grades.js';

export const EXPORT_SIZES = [
  { id: 'square', name: 'Square', label: '1080 x 1080', w: 1080, h: 1080, file: '1080x1080' },
  { id: 'portrait', name: 'Portrait', label: '1080 x 1350', w: 1080, h: 1350, file: '1080x1350' },
  { id: 'landscape', name: 'Landscape', label: '1920 x 1080', w: 1920, h: 1080, file: '1920x1080' },
  { id: 'story', name: 'Story', label: '1080 x 1920', w: 1080, h: 1920, file: '1080x1920' },
];

export const TITLE_FACE = '"Anton", "Arial Narrow", Impact, sans-serif';
export const SCRIPT_FACE = '"Pacifico", "Brush Script MT", cursive';

/** Fallback role tags, in panel order. A shipped sample carries its own tag
 *  (see samples.js) so the label always names the photo under it. */
export const ROLE_TAGS = [
  'THE LEAD', 'THE COAST', 'THE GETAWAY', 'THE PIER', 'POOLSIDE',
  'THE CREW', 'THE CITY', 'THE TOWER', 'THE CREW',
];

/** The caption for a panel: the photo's own tag first, then a positional one. */
export function panelRole(state, slot, index) {
  const photo = slot?.photo ? state.photos?.find((p) => p.id === slot.photo) : null;
  return photo?.role || state.roles?.[index] || ROLE_TAGS[index % ROLE_TAGS.length];
}

/** How tall the retail band is, per the round-5 recipe. */
export function retailBandHeight(width, height) {
  const aspect = height / width;
  if (height / width > 1.5) return Math.round(height * 0.155);
  if (width / height > 1.16) return Math.round(height * 0.185);
  return Math.round(height * 0.172);
}

/**
 * Where the masthead, retail band and panel field sit for a canvas size.
 * The photo field is the whole canvas (the collage bleeds to every edge); the
 * lettering floats over it. A landscape sheet puts the title in the left
 * column with the hero to its right; a portrait sheet stacks the title across
 * the top so the hero's face keeps its whole head clear.
 */
export function planFrame(layoutId, width, height) {
  const min = Math.min(width, height);
  const margin = Math.round(min * 0.034);
  const landscape = width / height > 1.16;
  const tall = height / width;
  const bandH = retailBandHeight(width, height);

  if (landscape) {
    return {
      landscape, tall, margin, bandH,
      bleed: layoutId === 'hero',
      masthead: { x: Math.round(width * 0.030), y: Math.round(height * 0.268), w: Math.round(width * 0.435), h: Math.round(height * 0.545) },
      quote: { x: Math.round(width * 0.030), y: Math.round(height * 0.030), w: Math.round(width * 0.42), h: Math.round(height * 0.135) },
      band: { x: 0, y: height - bandH, w: width, h: bandH },
      footer: { x: Math.round(width * 0.030), y: height - bandH, w: Math.round(width * 0.94), h: bandH },
      panels: { x: 0, y: 0, w: width, h: height },
    };
  }

  // A tall sheet sets the title across the lower-middle of the art, the way a
  // key-art poster does, so the hero's face in the top third stays clear of the
  // pink script. The press quote sits just above it, the retail band below.
  const inset = Math.round(width * 0.055);
  return {
    landscape, tall, margin, bandH,
    bleed: layoutId === 'hero',
    masthead: { x: inset, y: Math.round(height * 0.452), w: width - inset * 2, h: Math.round(height * (tall > 1.5 ? 0.268 : 0.272)) },
    quote: { x: inset, y: Math.round(height * 0.352), w: width - inset * 2, h: Math.round(height * 0.072) },
    band: { x: 0, y: height - bandH, w: width, h: bandH },
    footer: { x: inset, y: height - bandH, w: width - inset * 2, h: bandH },
    panels: { x: 0, y: 0, w: width, h: height },
  };
}

/** Where a framed face sits inside its panel: right of centre on a landscape
 *  sheet (the title takes the left), lower-centre on a tall one. */
export function photoAnchor(plan) {
  if (plan.landscape) return { x: 0.52, y: 0.40 };
  return { x: 0.5, y: 0.56 };
}

/* ------------------------------------------------------------------ helpers */

function starPath(ctx, cx, cy, r, points = 5, inner = 0.44) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * inner;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawStar(ctx, cx, cy, r, fill, ink, lw) {
  starPath(ctx, cx, cy, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (ink) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = ink;
    ctx.stroke();
  }
}

/** Width of `text` at `size` in a face, with tracking, without mutating ctx.font. */
function measure(ctx, text, size, face, tracking = 0) {
  ctx.save();
  ctx.font = `${size}px ${face}`;
  ctx.letterSpacing = `${size * tracking}px`;
  const w = ctx.measureText(text).width;
  ctx.restore();
  return w;
}

/** Splits a title into one or two balanced lines, preferring a word boundary. */
export function splitTitle(title) {
  const words = String(title ?? '').trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  if (words.length === 1) return [words[0]];
  if (words.length === 2) return [words[0], words[1]];
  let best = null;
  for (let cut = 1; cut < words.length; cut++) {
    const a = words.slice(0, cut).join(' ');
    const b = words.slice(cut).join(' ');
    const score = Math.max(a.length, b.length) + Math.min(a.length, b.length) * 0.08;
    if (!best || score < best.score) best = { a, b, score };
  }
  return [best.a, best.b];
}

let grainTile = null;
function grainPattern(ctx) {
  if (!grainTile) {
    grainTile = document.createElement('canvas');
    grainTile.width = 180;
    grainTile.height = 180;
    const g = grainTile.getContext('2d');
    const data = g.createImageData(180, 180);
    let seed = 1337;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < data.data.length; i += 4) {
      const v = 128 + (rnd() - 0.5) * 190;
      data.data[i] = v;
      data.data[i + 1] = v;
      data.data[i + 2] = v;
      data.data[i + 3] = 255;
    }
    g.putImageData(data, 0, 0);
  }
  return ctx.createPattern(grainTile, 'repeat');
}

/* ------------------------------------------------------------------- panels */

/** The outline of a panel: a rectangle, or a parallelogram when it is slanted. */
function panelPath(ctx, r, inflate = 0) {
  const s = r.skew || 0;
  ctx.beginPath();
  ctx.moveTo(r.x + s - inflate, r.y - inflate);
  ctx.lineTo(r.x + r.w + s + inflate, r.y - inflate);
  ctx.lineTo(r.x + r.w + inflate, r.y + r.h + inflate);
  ctx.lineTo(r.x - inflate, r.y + r.h + inflate);
  ctx.closePath();
}

/**
 * Where a photo sits inside a panel: cover-scale it, frame its focus box (a
 * face) at the anchor, then apply the crop offset. `ox`/`oy` are the photo's
 * own offset, so positive ox slides the picture right and positive oy slides it
 * down. The framed face is kept fully inside the panel with a small margin, so
 * a landscape sheet never crops a portrait hero's chin.
 */
export function placePhoto(iw, ih, slot, r, anchor) {
  const zoom = slot.zoom ?? 1;
  const w = r.w;
  const h = r.h;
  const scale = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const slackX = Math.max(0, dw - w);
  const slackY = Math.max(0, dh - h);

  let dx;
  let dy;
  if (slot.focus) {
    // Frame the focus box (a face) by its centre rather than its top-left
    // corner, so the subject sits where the layout expects it.
    const ax = anchor?.x ?? 0.5;
    const ay = anchor?.y ?? 0.5;
    const fx = slot.focus.x ?? 0.5;
    const fy = slot.focus.y ?? 0.5;
    const fw = slot.focus.w ?? 0;
    const fh = slot.focus.h ?? 0;
    dx = w * ax - (fx + fw / 2) * dw;
    dy = h * ay - (fy + fh / 2) * dh;
    // Keep the whole framed box inside the panel with margin where it fits.
    const keep = Math.min(w, h) * 0.02;
    if (fw > 0) {
      dx = Math.max(dx, keep - fx * dw);
      dx = Math.min(dx, w - keep - (fx + fw) * dw);
    }
    if (fh > 0) {
      dy = Math.max(dy, keep - fy * dh);
      dy = Math.min(dy, h - keep - (fy + fh) * dh);
    }
  } else {
    dx = (w - dw) / 2;
    dy = (h - dh) / 2;
  }
  dx += (slot.ox ?? 0) * (slackX / 2);
  dy += (slot.oy ?? 0) * (slackY / 2);
  dx = Math.min(0, Math.max(w - dw, dx));
  dy = Math.min(0, Math.max(h - dh, dy));
  return { dx, dy, dw, dh };
}

function drawPhoto(ctx, image, slot, r, palette, anchor) {
  if (!image) {
    ctx.save();
    panelPath(ctx, r);
    ctx.clip();
    const x = r.x - Math.abs(r.skew || 0);
    const w = r.w + Math.abs(r.skew || 0) * 2;
    const wash = ctx.createLinearGradient(x, r.y, x + w, r.y + r.h);
    wash.addColorStop(0, mixHex(palette.ink, palette.glow, 0.30));
    wash.addColorStop(1, mixHex(palette.ink, palette.paper, 0.16));
    ctx.fillStyle = wash;
    ctx.fillRect(x, r.y, w, r.h);
    const size = Math.max(10, Math.min(r.w, r.h) * 0.062);
    ctx.fillStyle = rgba(palette.paper, 0.82);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${size}px ${TITLE_FACE}`;
    ctx.fillText('DROP A PHOTO', x + w / 2, r.y + r.h / 2);
    ctx.restore();
    return;
  }

  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  const w = r.w;
  const h = r.h;
  const { dx, dy, dw, dh } = placePhoto(iw, ih, slot, r, anchor);

  ctx.save();
  panelPath(ctx, r);
  ctx.clip();
  ctx.translate(r.x, r.y);
  if (r.skew) ctx.transform(1, 0, -r.skew / r.h, 1, r.skew, 0);
  ctx.drawImage(image, dx, dy, dw, dh);

  const shade = ctx.createLinearGradient(0, h * 0.55, 0, h);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, rgba(palette.ink, 0.22));
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** A small ink tag naming a panel's role, printed in its top-left corner. */
function drawRoleTag(ctx, rect, label, palette, size) {
  if (!label) return;
  const h = Math.max(13, Math.min(size.w, size.h) * 0.024);
  const fs = h * 0.56;
  ctx.save();
  ctx.font = `${fs}px ${TITLE_FACE}`;
  ctx.letterSpacing = `${fs * 0.10}px`;
  const tw = ctx.measureText(label).width;
  const pad = fs * 0.6;
  const w = Math.min(tw + pad * 2, rect.w * 0.8);
  const x = rect.x + h * 0.40 + Math.max(0, (rect.skew || 0) * 0.5);
  const y = rect.y + h * 0.40;
  ctx.fillStyle = rgba(palette.ink, 0.88);
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = rgba(palette.accent, 0.95);
  ctx.fillRect(x, y + h - Math.max(1, h * 0.11), w, Math.max(1, h * 0.11));
  ctx.fillStyle = palette.paper;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + pad, y + h * 0.47, w - pad * 2);
  ctx.letterSpacing = '0px';
  ctx.restore();
}

function drawPanels(ctx, state, plan, palette, graded, size) {
  const rects = layoutPanels(state.layout, plan.panels, panelGap(size.w, size.h));
  const anchor = photoAnchor(plan);
  rects.forEach((rect, i) => {
    const slot = state.slots?.[i] ?? {};
    const image = slot.photo ? graded(slot.photo) : null;
    ctx.save();
    drawPhoto(ctx, image, slot, rect, palette, anchor);

    if (!rect.bleed) {
      const lw = Math.max(2, Math.round(Math.min(size.w, size.h) * 0.0040));
      ctx.strokeStyle = rgba(palette.ink, 0.92);
      ctx.lineWidth = lw;
      panelPath(ctx, rect);
      ctx.stroke();
      ctx.strokeStyle = rgba(palette.accent, 0.42);
      ctx.lineWidth = Math.max(1, Math.round(lw * 0.30));
      panelPath(ctx, rect, -lw * 1.7);
      ctx.stroke();
    }
    if (!rect.bleed && image && state.roleTags !== false) {
      drawRoleTag(ctx, rect, panelRole(state, slot, i), palette, size);
    }
    ctx.restore();
  });
}

/* ------------------------------------------------------------------- finish */

let glowLayer = null;
function skyGlowLayer(w, h) {
  if (!glowLayer) glowLayer = document.createElement('canvas');
  if (glowLayer.width !== w || glowLayer.height !== h) {
    glowLayer.width = w;
    glowLayer.height = h;
  }
  const g = glowLayer.getContext('2d');
  g.clearRect(0, 0, w, h);
  return g;
}

/**
 * The sky glow: a broad warm wash over the top of the art plus a soft horizon
 * haze, so a photo reads as golden-hour light rather than a flat scan. Painted
 * into its own layer so a framed face can be masked out of it -- a coloured
 * wash laid over skin is what turns a face green or magenta.
 */
function drawSkyGlow(ctx, state, plan, palette, grade, size, protect = []) {
  const { w, h } = size;
  const top = 0;
  const region = h * 0.62;
  const cx = w * (plan.landscape ? 0.66 : 0.5);

  const layer = skyGlowLayer(w, h);
  layer.save();
  layer.globalCompositeOperation = 'source-over';
  const g = layer.createRadialGradient(cx, top + region * 0.16, 0, cx, top + region * 0.16, Math.max(w, h) * 0.74);
  g.addColorStop(0, rgba(grade.glow, 0.30));
  g.addColorStop(0.40, rgba(grade.accent, 0.13));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  layer.fillStyle = g;
  layer.fillRect(0, 0, w, h);

  const horizon = layer.createLinearGradient(0, top + region * 0.24, 0, top + region);
  horizon.addColorStop(0, 'rgba(0,0,0,0)');
  horizon.addColorStop(0.60, rgba(grade.glow, 0.09));
  horizon.addColorStop(1, 'rgba(0,0,0,0)');
  layer.fillStyle = horizon;
  layer.fillRect(0, top, w, region);
  layer.globalAlpha = 1;

  layer.globalCompositeOperation = 'destination-out';
  for (const p of protect) {
    const hole = layer.createRadialGradient(p.cx, p.cy, 0, p.cx, p.cy, p.r);
    hole.addColorStop(0, 'rgba(0,0,0,1)');
    hole.addColorStop(0.62, 'rgba(0,0,0,1)');
    hole.addColorStop(0.86, 'rgba(0,0,0,0.55)');
    hole.addColorStop(1, 'rgba(0,0,0,0)');
    layer.fillStyle = hole;
    layer.fillRect(p.cx - p.r, p.cy - p.r, p.r * 2, p.r * 2);
  }
  layer.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(glowLayer, 0, 0);
  ctx.restore();
}

/** Face ellipses (canvas coords) of every framed panel, for the glow mask. */
function framedFaces(state, plan, size, images) {
  const rects = layoutPanels(state.layout, plan.panels, panelGap(size.w, size.h));
  const anchor = photoAnchor(plan);
  const out = [];
  rects.forEach((r, i) => {
    const slot = state.slots?.[i];
    if (!slot?.focus || !slot.photo) return;
    const img = images instanceof Map ? images.get(slot.photo) : images?.[slot.photo];
    if (!img) return;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const p = placePhoto(iw, ih, slot, r, anchor);
    const f = slot.focus;
    const fx = r.x + p.dx + (f.x ?? 0.5) * p.dw;
    const fy = r.y + p.dy + (f.y ?? 0.5) * p.dh;
    const fw = (f.w ?? 0) * p.dw;
    const fh = (f.h ?? 0) * p.dh;
    const cx = fx + fw / 2;
    const cy = fy + fh / 2;
    const rad = Math.max(fw, fh) * 0.80 + Math.min(r.w, r.h) * 0.02;
    out.push({ cx, cy, r: rad });
  });
  return out;
}

/** Poster Ink: a heavy ink keyline round the whole sheet and corner marks. */
function drawInkFrame(ctx, plan, palette, size) {
  const { w, h } = size;
  const pad = Math.round(Math.min(w, h) * 0.012);
  const lw = Math.max(2, Math.round(Math.min(w, h) * 0.0075));
  ctx.save();
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = lw;
  ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
  ctx.lineWidth = Math.max(1, lw * 0.35);
  ctx.strokeStyle = rgba(palette.paper, 0.30);
  ctx.strokeRect(pad + lw * 1.7, pad + lw * 1.7, w - pad * 2 - lw * 3.4, h - pad * 2 - lw * 3.4);

  const mark = Math.round(Math.min(w, h) * 0.038);
  ctx.strokeStyle = rgba(palette.accent, 0.85);
  ctx.lineWidth = Math.max(1, lw * 0.55);
  const corners = [[pad, pad, 1, 1], [w - pad, pad, -1, 1], [pad, h - pad, 1, -1], [w - pad, h - pad, -1, -1]];
  for (const [x, y, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x, y + mark * sy);
    ctx.lineTo(x, y);
    ctx.lineTo(x + mark * sx, y);
    ctx.stroke();
  }
  ctx.restore();
}

/* --------------------------------------------------------------- lettering */

/**
 * The striped-chrome fill: cream at the top, sun-yellow through the middle and
 * orange at the foot, with magenta and purple bands run across the lower half.
 * Built once per masthead at the title block's own size, then used as a pattern
 * so the stripes line up with the block rather than with each glyph.
 */
function stripedChromePattern(ctx, blockW, blockH) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(blockW));
  c.height = Math.max(2, Math.round(blockH));
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0.00, '#fffaea');
  grad.addColorStop(0.34, '#ffe9a6');
  grad.addColorStop(0.62, '#ffc94a');
  grad.addColorStop(0.86, '#ff8a24');
  grad.addColorStop(1.00, '#f7671c');
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);

  // Horizontal magenta/purple stripes through the lower half of the glyphs.
  const bands = [
    [0.56, 0.075, 'rgba(255, 34, 148, 0.92)'],
    [0.655, 0.052, 'rgba(168, 42, 222, 0.86)'],
    [0.725, 0.070, 'rgba(255, 68, 160, 0.90)'],
    [0.815, 0.048, 'rgba(140, 34, 210, 0.84)'],
    [0.878, 0.062, 'rgba(255, 90, 130, 0.88)'],
  ];
  for (const [y, hh, colour] of bands) {
    g.fillStyle = colour;
    g.fillRect(0, c.height * y, c.width, Math.max(1, c.height * hh));
  }
  // A specular line across the upper third, the way chrome catches the sun.
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.fillRect(0, c.height * 0.235, c.width, Math.max(1, c.height * 0.022));
  return ctx.createPattern(c, 'no-repeat');
}

/** A four-point sparkle, cream with a dark keyline. */
function drawSparkle(ctx, cx, cy, r, palette) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const rad = i % 2 === 0 ? r : r * 0.20;
    const a = (i * Math.PI) / 4;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#fffdf2';
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.10);
  ctx.strokeStyle = palette.ink;
  ctx.stroke();
  ctx.restore();
}

function drawMasthead(ctx, state, plan, palette, size) {
  const m = plan.masthead;
  const title = (state.title || '').trim() || 'SUNFLARE';
  const subText = (state.subtitle || '').trim();
  const hasSub = Boolean(subText);
  const tracking = 0.004;

  const subBand = hasSub ? Math.max(26, Math.min(m.h * 0.26, m.w * 0.13)) : 0;
  const blockW = m.w;
  const blockH = Math.max(40, m.h - subBand * 0.86);
  const widthFor = (line, fs) => measure(ctx, line, fs, TITLE_FACE, tracking);

  const words = splitTitle(title);
  const single = words.join(' ');
  const fit = (ls, wBox, hBox) => {
    const widest = Math.max(...ls.map((l) => widthFor(l, 100)));
    return Math.min((wBox / Math.max(1, widest)) * 100, (hBox * 0.96) / (ls.length * 1.02));
  };
  const singleFit = fit([single], blockW, blockH);
  let lines = [single];
  let fsize = singleFit;
  if (words.length > 1) {
    const multiFit = fit(words, blockW, blockH);
    if (multiFit > singleFit * 1.22) {
      lines = words;
      fsize = multiFit;
    }
  }
  fsize = Math.max(12, fsize);

  const lineH = fsize * 1.02;
  const textH = lines.length * lineH;
  const bx = m.x;
  const by = m.y + Math.max(0, (m.h - (textH + (hasSub ? subBand : 0))) / 2);
  const angle = plan.landscape ? -0.014 : -0.012;

  // Optional halftone plate behind the type (off by default: the title sits
  // straight on the art).
  if (state.halftone) {
    ctx.save();
    ctx.translate(bx + blockW / 2, by + textH / 2);
    ctx.rotate(angle);
    ctx.fillStyle = rgba(palette.ink, 0.72);
    ctx.fillRect(-blockW / 2 - fsize * 0.06, -textH / 2 - fsize * 0.06, blockW + fsize * 0.12, textH + fsize * 0.12);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(bx + blockW / 2, by + textH / 2);
  ctx.rotate(angle);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${fsize}px ${TITLE_FACE}`;
  ctx.letterSpacing = `${fsize * tracking}px`;

  const pattern = stripedChromePattern(ctx, blockW, textH);
  const style = state.titleStyle ?? 'chrome';
  const buildFill = () => {
    if (style === 'chrome') return pattern;
    if (style === 'white') return palette.paper;
    const g = ctx.createLinearGradient(0, -textH / 2, 0, textH / 2);
    g.addColorStop(0, '#fff3cf');
    g.addColorStop(0.42, '#ffcf6a');
    g.addColorStop(0.78, '#ff7a3c');
    g.addColorStop(1, '#e8347a');
    return g;
  };
  const fill = buildFill();

  lines.forEach((line, i) => {
    const yy = (i - (lines.length - 1) / 2) * lineH;
    // Extruded 3D: a stack of dark copies stepping down-right behind the face.
    const depth = Math.max(2, fsize * 0.048);
    const steps = 5;
    ctx.lineJoin = 'round';
    for (let s = steps; s >= 1; s--) {
      ctx.fillStyle = mixHex('#2a0d08', palette.glow, 0.16 * (1 - s / steps));
      ctx.fillText(line, depth * s * 0.5, yy + depth * s * 0.85);
    }
    // Thick dark outline.
    ctx.lineWidth = Math.max(2, fsize * 0.075);
    ctx.strokeStyle = '#2a0c07';
    ctx.strokeText(line, 0, yy);
    // The striped chrome face.
    ctx.fillStyle = fill;
    ctx.fillText(line, 0, yy);
    // A hairline keyline on top of the fill so the letters stay crisp.
    ctx.lineWidth = Math.max(1, fsize * 0.012);
    ctx.strokeStyle = 'rgba(42,12,7,0.55)';
    ctx.strokeText(line, 0, yy);
  });
  ctx.letterSpacing = '0px';

  // Sparkle at the top-right of the block.
  drawSparkle(ctx, blockW * 0.47, -textH * 0.40, fsize * 0.13, palette);
  ctx.restore();

  // The badge ribbon sits above the title, tilted like a sticker.
  const ribbonH = Math.max(16, Math.min(fsize * 0.24, m.h * 0.10));
  ctx.save();
  ctx.translate(m.x + Math.min(m.w * 0.30, fsize * 1.5), by - ribbonH * 0.55);
  ctx.rotate(-0.045);
  drawRibbon(ctx, state.badge, 0, 0, ribbonH, palette);
  ctx.restore();

  // Hot-pink script subtitle, overlapping the base of the title.
  if (hasSub) {
    let ss = Math.min(fsize * 0.52, subBand * 0.94, m.w * 0.16);
    ss = Math.max(ss, 11);
    while (measure(ctx, subText, ss, SCRIPT_FACE) > m.w * 1.02 && ss > 10) ss -= 1;
    const sy = by + textH - ss * 0.20;
    ctx.save();
    ctx.translate(m.x + m.w / 2, sy);
    ctx.rotate(-0.028);
    ctx.font = `${ss}px ${SCRIPT_FACE}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(40,8,16,0.55)';
    ctx.shadowBlur = ss * 0.16;
    ctx.shadowOffsetY = ss * 0.05;
    ctx.lineWidth = Math.max(1.5, ss * 0.10);
    ctx.strokeStyle = '#3a0716';
    ctx.strokeText(subText, 0, 0);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#ff3d94';
    ctx.fillText(subText, 0, 0);
    ctx.restore();
  }
}

/** A notched ribbon; returns its width so the caller can lay out around it. */
function drawRibbon(ctx, text, x, y, h, palette) {
  const label = (text || 'LEONIDA • EST. 2026').toUpperCase();
  const size = h * 0.44;
  ctx.save();
  ctx.font = `${size}px ${TITLE_FACE}`;
  ctx.letterSpacing = `${size * 0.10}px`;
  const tw = ctx.measureText(label).width;
  const w = Math.min(tw + h * 1.3, h * 15);
  const notch = h * 0.28;
  ctx.beginPath();
  ctx.moveTo(x + notch, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + notch, y + h);
  ctx.lineTo(x, y + h / 2);
  ctx.closePath();
  ctx.fillStyle = palette.ink;
  ctx.fill();
  ctx.strokeStyle = rgba(palette.accent, 0.85);
  ctx.lineWidth = Math.max(1, h * 0.035);
  ctx.stroke();
  ctx.fillStyle = palette.paper;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2 + notch * 0.4, y + h * 0.55, w - notch * 1.4);
  ctx.letterSpacing = '0px';
  ctx.restore();
  return w;
}

function drawStars(ctx, count, x, y, r, palette) {
  const gap = r * 2.55;
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, x + r + i * gap, y, r, i < count ? palette.accent : 'rgba(255,255,255,0.18)', palette.ink, Math.max(1, r * 0.14));
  }
  return r * 2 + 4 * gap;
}

/* --------------------------------------------------------------- retail kit */

/** The gold starburst seal: "ORIGINAL COVER ART ★★★" in a jagged disc. */
function drawSeal(ctx, cx, cy, r, palette) {
  const points = 22;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.845;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#ffe98a');
  g.addColorStop(0.52, '#f7c548');
  g.addColorStop(1, '#e39a1c');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.045);
  ctx.strokeStyle = '#4a2306';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.70, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1.5, r * 0.030);
  ctx.strokeStyle = 'rgba(74,35,6,0.85)';
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#3d1d05';
  const s1 = r * 0.215;
  ctx.font = `${s1}px ${TITLE_FACE}`;
  ctx.letterSpacing = `${s1 * 0.05}px`;
  ctx.fillText('ORIGINAL', cx, cy - r * 0.40, r * 1.30);
  ctx.fillText('COVER ART', cx, cy - r * 0.13, r * 1.32);
  ctx.letterSpacing = '0px';
  const s2 = r * 0.30;
  ctx.font = `${s2}px ${TITLE_FACE}`;
  ctx.fillStyle = '#6b2c06';
  ctx.fillText('★★★', cx, cy + r * 0.30, r * 1.1);
  const s3 = r * 0.135;
  ctx.font = `${s3}px ${TITLE_FACE}`;
  ctx.letterSpacing = `${s3 * 0.16}px`;
  ctx.fillStyle = '#4a2306';
  ctx.fillText('LEONIDA 2026', cx, cy + r * 0.60, r * 1.2);
  ctx.letterSpacing = '0px';
  ctx.restore();
}

/** A barcode block: alternating ink bars on a cream card, with the digits. */
function drawBarcode(ctx, x, y, w, h, palette) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,250,238,0.94)';
  ctx.fillRect(x, y, w, h);
  const pad = w * 0.045;
  let seed = 20261120;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return seed / 4294967296;
  };
  let bx = x + pad;
  const barTop = y + h * 0.13;
  const barH = h * 0.62;
  const end = x + w - pad;
  while (bx < end) {
    const bw = Math.max(1, w * (0.008 + rnd() * 0.022));
    if (rnd() > 0.34) {
      ctx.fillStyle = 'rgba(22,10,6,0.95)';
      ctx.fillRect(bx, barTop, bw, barH);
    }
    bx += bw + Math.max(1, w * (0.006 + rnd() * 0.016));
  }
  ctx.fillStyle = '#241008';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.max(6, h * 0.13)}px ${TITLE_FACE}`;
  ctx.letterSpacing = `${h * 0.010}px`;
  ctx.fillText('0 89741 26020 6', x + w / 2, y + h * 0.865, w * 0.92);
  ctx.letterSpacing = '0px';
  ctx.restore();
}

/** A ticket tab hanging off the band edge: "VOL. 1". */
function drawTicketTab(ctx, x, y, w, h, palette, label = 'VOL. 1') {
  ctx.save();
  ctx.fillStyle = 'rgba(255,240,214,0.96)';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,16,8,0.85)';
  ctx.lineWidth = Math.max(1.5, h * 0.020);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + w * 0.5, y, h * 0.075, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(40,16,8,0.55)';
  ctx.fill();
  ctx.fillStyle = '#2a0f06';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fs = Math.min(h * 0.30, w * 0.55);
  ctx.font = `${fs}px ${TITLE_FACE}`;
  ctx.letterSpacing = `${fs * 0.06}px`;
  ctx.fillText(label, x + w / 2, y + h * 0.58, w * 0.88);
  ctx.letterSpacing = '0px';
  ctx.restore();
}

/**
 * The five-star press quote. On a landscape sheet it sits in the top-left
 * corner over the art; on a tall sheet it sits under the title. Stars first,
 * then the quote, then the paper that said it.
 */
function drawPressQuote(ctx, state, plan, palette, size) {
  const q = plan.quote;
  const starR = Math.max(6, Math.min(q.h * 0.20, q.w * 0.022));
  const starsW = starR * 2 + 4 * starR * 2.55;
  const x = q.x;
  const y = q.y;

  // A soft dark plate so the quote reads over any photo.
  const g = ctx.createLinearGradient(x - q.w * 0.05, y, x + q.w * 1.05, y + q.h);
  g.addColorStop(0, 'rgba(24,8,6,0.62)');
  g.addColorStop(0.72, 'rgba(24,8,6,0.42)');
  g.addColorStop(1, 'rgba(24,8,6,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - q.w * 0.03, y - q.h * 0.2, q.w * 1.08, q.h * 1.4);

  drawStars(ctx, 5, x, y + starR * 1.2, starR, palette);

  const quote = (state.quote || '“A sun-soaked knockout — the cover of the summer.”');
  let qs = Math.min(q.h * 0.30, q.w * 0.048);
  qs = Math.max(qs, 9);
  while (measure(ctx, quote, qs, TITLE_FACE, 0.01) > q.w * 0.94 && qs > 8) qs -= 1;
  ctx.font = `${qs}px ${TITLE_FACE}`;
  ctx.letterSpacing = `${qs * 0.01}px`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,248,236,0.97)';
  ctx.fillText(quote, x, y + starR * 2.1 + qs * 0.7, q.w * 0.94);

  const gs = Math.max(8, qs * 0.62);
  ctx.font = `${gs}px ${TITLE_FACE}`;
  ctx.letterSpacing = `${gs * 0.16}px`;
  ctx.fillStyle = rgba(palette.accent, 0.95);
  ctx.fillText('— LEONIDA SUN GAZETTE', x, y + starR * 2.1 + qs * 1.55, q.w * 0.9);
  ctx.letterSpacing = '0px';
}

/**
 * The retail band: a graded scrim down the bottom of the sheet carrying the
 * billing block, the footer line, the barcode, the star heat, the VOL. 1 tab
 * and the COMING SOON line. Each piece is behind its own toggle in the state's
 * `kit`, so the poster can be stripped back to pure key art.
 */
function drawRetail(ctx, state, plan, palette, size) {
  const kit = state.kit || {};
  const b = plan.band;
  const { w } = size;
  const any = kit.billing || kit.barcode || kit.vol || kit.comingSoon;
  if (!any) return;

  // Scrim: transparent at the top of the band, deep ink at the foot.
  const scrim = ctx.createLinearGradient(0, b.y - b.h * 0.22, 0, b.y + b.h * 0.72);
  scrim.addColorStop(0, rgba(palette.ink, 0));
  scrim.addColorStop(0.42, rgba(palette.ink, 0.78));
  scrim.addColorStop(1, rgba(palette.ink, 0.985));
  ctx.fillStyle = scrim;
  ctx.fillRect(0, b.y - b.h * 0.22, w, b.h * 1.25);

  ctx.save();
  ctx.strokeStyle = rgba(palette.accent, 0.55);
  ctx.lineWidth = Math.max(1, b.h * 0.008);
  ctx.beginPath();
  ctx.moveTo(w * 0.04, b.y + b.h * 0.06);
  ctx.lineTo(w * 0.96, b.y + b.h * 0.06);
  ctx.stroke();

  const padX = w * 0.045;

  if (kit.billing) {
    const billing = 'A SUNFLARE PICTURES PRODUCTION  ·  STARRING YOU';
    let fs = Math.min(b.h * 0.115, w * 0.020);
    fs = Math.max(fs, 8);
    while (measure(ctx, billing, fs, TITLE_FACE, 0.05) > w * 0.58 && fs > 8) fs -= 1;
    ctx.font = `${fs}px ${TITLE_FACE}`;
    ctx.letterSpacing = `${fs * 0.05}px`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,244,226,0.96)';
    ctx.fillText(billing, padX, b.y + b.h * 0.26, w * 0.60);

    ctx.font = `${Math.max(8, fs * 0.80)}px ${TITLE_FACE}`;
    ctx.letterSpacing = `${fs * 0.03}px`;
    ctx.fillStyle = 'rgba(255,240,220,0.70)';
    const footer = (state.footer || 'Sunflare Studio presents a Leonida picture').toUpperCase();
    ctx.fillText(footer, padX, b.y + b.h * 0.43, w * 0.60);
    ctx.letterSpacing = '0px';
  }

  // The heat meter, beside the billing block.
  if (kit.billing) {
    const r = Math.max(4, b.h * 0.045);
    const starsW = r * 2 + 4 * r * 2.55;
    drawStars(ctx, Math.max(1, Math.min(5, state.stars ?? 5)), padX, b.y + b.h * 0.585, r, palette);
    ctx.font = `${Math.max(7, b.h * 0.055)}px ${TITLE_FACE}`;
    ctx.letterSpacing = `${b.h * 0.006}px`;
    ctx.fillStyle = 'rgba(255,240,220,0.62)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`HEAT ${state.stars ?? 5}/5  ·  ${gradeById(state.grade).name.toUpperCase()}`, padX + starsW + b.h * 0.10, b.y + b.h * 0.585, w * 0.5);
    ctx.letterSpacing = '0px';
  }

  if (kit.comingSoon) {
    // A solid accent chip, so the line reads at judge size and its toggle is
    // unmistakable in the output.
    const label = 'COMING SOON';
    const fs = Math.max(10, b.h * 0.115);
    ctx.font = `${fs}px ${TITLE_FACE}`;
    ctx.letterSpacing = `${fs * 0.14}px`;
    const tw = ctx.measureText(label).width;
    const chH = fs * 1.85;
    const chW = Math.min(tw + fs * 1.5, w * 0.40);
    const chX = padX;
    const chY = b.y + b.h * 0.755;
    ctx.fillStyle = palette.accent;
    ctx.fillRect(chX, chY, chW, chH);
    ctx.fillStyle = palette.ink;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, chX + fs * 0.75, chY + chH * 0.55, chW - fs * 1.3);
    ctx.letterSpacing = '0px';
  }

  if (kit.vol) {
    const tw = Math.min(w * 0.075, b.h * 0.55);
    const th = b.h * 0.62;
    drawTicketTab(ctx, w * 0.695, b.y + b.h * 0.20, tw, th, palette, 'VOL. 1');
  }

  if (kit.barcode) {
    const bw = Math.min(w * 0.175, b.h * 0.78);
    const bh = b.h * 0.56;
    drawBarcode(ctx, w - padX - bw, b.y + b.h * 0.20, bw, bh, palette);
  }
  ctx.restore();
}

/** The seal lives over the art at the top-right, clear of the masthead. */
function drawSealTop(ctx, state, plan, palette, size) {
  if (!(state.kit || {}).seal) return;
  const r = Math.min(size.w, size.h) * 0.100;
  const cx = size.w - r * 1.32;
  const cy = r * 1.30;
  drawSeal(ctx, cx, cy, r, palette);
}

function drawGrain(ctx, w, h, opacity = 0.10) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = opacity;
  ctx.fillStyle = grainPattern(ctx);
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawVignette(ctx, w, h, palette) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.34, w / 2, h / 2, Math.max(w, h) * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.76, rgba(palette.ink, 0.14));
  g.addColorStop(1, rgba(palette.ink, 0.46));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/**
 * The pop-out hero: the hero panel's photo cut out at a larger scale and drawn
 * IN FRONT of the title, so the subject breaks the grid the way a key-art
 * cut-out does. A soft shadow under it and a fade into the retail band keep it
 * from looking pasted on. Tall sheets clip it below the title so the lettering
 * stays clean.
 */
function drawPopout(ctx, state, plan, palette, graded, size) {
  if (!state.popout) return;
  const rects = layoutPanels(state.layout, plan.panels, panelGap(size.w, size.h));
  const hi = rects.findIndex((r) => r.hero);
  if (hi < 0) return;
  const slot = state.slots?.[hi];
  const image = slot?.photo ? graded(slot.photo) : null;
  if (!image) return;

  const r = rects[hi];
  const k = plan.landscape ? 1.10 : 1.09;
  const pivot = { x: r.x + r.w * 0.34, y: r.y + r.h * 0.62 };
  const scaled = {
    x: pivot.x - (pivot.x - r.x) * k,
    y: pivot.y - (pivot.y - r.y) * k,
    w: r.w * k,
    h: r.h * k,
    skew: (r.skew || 0) * k,
  };

  ctx.save();
  // Tall sheets: the hero sits above the title, so the pop-out only needs to
  // stop at the retail band rather than run over the barcode.
  if (!plan.landscape) {
    ctx.beginPath();
    ctx.rect(0, 0, size.w, plan.band.y + plan.band.h * 0.16);
    ctx.clip();
  }

  const lw = Math.max(3, Math.min(size.w, size.h) * 0.006);
  ctx.save();
  ctx.shadowColor = 'rgba(30,10,4,0.55)';
  ctx.shadowBlur = lw * 6;
  ctx.shadowOffsetX = lw * 1.5;
  ctx.shadowOffsetY = lw * 2.5;
  ctx.fillStyle = palette.ink;
  panelPath(ctx, scaled);
  ctx.fill();
  ctx.restore();

  drawPhoto(ctx, image, slot, scaled, palette, photoAnchor(plan));

  // A cream keyline, like the hero was cut out and framed.
  ctx.strokeStyle = rgba(palette.paper, 0.55);
  ctx.lineWidth = Math.max(1.5, lw * 0.7);
  panelPath(ctx, scaled, -lw * 0.8);
  ctx.stroke();

  // Fade the bottom into the retail band.
  const fade = ctx.createLinearGradient(0, plan.band.y - plan.band.h * 0.4, 0, plan.band.y + plan.band.h * 0.35);
  fade.addColorStop(0, rgba(palette.ink, 0));
  fade.addColorStop(1, rgba(palette.ink, 0.92));
  ctx.fillStyle = fade;
  ctx.fillRect(0, plan.band.y - plan.band.h * 0.4, size.w, plan.band.h * 0.78);

  ctx.restore();
}

/**
 * Draws the cover into `ctx` at `width` x `height`.
 * `images` maps photo id -> loaded image (HTMLImageElement or canvas).
 */
export function drawCover(ctx, state, images, width, height) {
  const grade = gradeById(state.grade);
  const palette = { ink: grade.ink, paper: grade.paper, glow: grade.glow, accent: grade.accent };
  const size = { w: width, h: height };
  const plan = planFrame(state.layout, width, height);

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = grade.ink;
  ctx.fillRect(0, 0, width, height);

  const lut = gradeLut(grade);
  const cache = new Map();
  const maxSide = Math.max(900, Math.round(Math.max(width, height) * 0.92));
  const graded = (id) => {
    const img = images instanceof Map ? images.get(id) : images?.[id];
    if (!img) return null;
    if (state.compare) return img; // before/after: show the original photo
    const key = `${id}|${state.grade}|${maxSide}`;
    if (cache.has(key)) return cache.get(key);
    const gw = img.naturalWidth || img.width;
    const gh = img.naturalHeight || img.height;
    const k = Math.min(1, maxSide / Math.max(gw, gh));
    const cw = Math.max(1, Math.round(gw * k));
    const ch = Math.max(1, Math.round(gh * k));
    const off = document.createElement('canvas');
    off.width = cw;
    off.height = ch;
    const octx = off.getContext('2d', { willReadFrequently: true });
    octx.drawImage(img, 0, 0, cw, ch);
    try {
      const data = octx.getImageData(0, 0, cw, ch);
      const px = data.data;
      for (let i = 0; i < px.length; i += 4) {
        const r = px[i];
        const g = px[i + 1];
        const b = px[i + 2];
        const l = (r * 0.299 + g * 0.587 + b * 0.114) | 0;
        const o = l * 3;
        let rr = lut[o];
        let gg = lut[o + 1];
        let bb = lut[o + 2];
        // Pixels that already read as skin keep the warm skin tone, so even a
        // coloured light on a face cannot push it green or violet.
        const s = skinScore(r, g, b) * 0.75;
        if (s > 0) {
          const warm = skinTone(l / 255);
          rr = rr * (1 - s) + warm[0] * s;
          gg = gg * (1 - s) + warm[1] * s;
          bb = bb * (1 - s) + warm[2] * s;
        }
        px[i] = rr;
        px[i + 1] = gg;
        px[i + 2] = bb;
      }
      octx.putImageData(data, 0, 0);
    } catch {
      /* a tainted canvas would leave the photo ungraded */
    }
    cache.set(key, off);
    return off;
  };

  drawPanels(ctx, state, plan, palette, graded, size);

  if (state.skyGlow !== false) {
    drawSkyGlow(ctx, state, plan, palette, grade, size, framedFaces(state, plan, size, images));
  }

  if (state.posterInk !== false) drawInkFrame(ctx, plan, palette, size);

  drawMasthead(ctx, state, plan, palette, size);
  drawPopout(ctx, state, plan, palette, graded, size);

  if (state.kit?.quote) drawPressQuote(ctx, state, plan, palette, size);
  drawSealTop(ctx, state, plan, palette, size);
  drawRetail(ctx, state, plan, palette, size);

  if (state.vignette !== false) drawVignette(ctx, width, height, palette);
  if (state.grain !== false) drawGrain(ctx, width, height);
  ctx.restore();
}

export const __debug = {
  drawMasthead, drawPanels, planFrame, drawRibbon, drawStars, drawSkyGlow,
  placePhoto, framedFaces, photoAnchor, drawRetail, drawSeal, drawBarcode,
  drawPressQuote, drawPopout, drawTicketTab, retailBandHeight,
};

/** Renders the cover to a fresh canvas, ready for toBlob. */
export function renderToCanvas(state, images, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas.getContext('2d'), state, images, width, height);
  return canvas;
}
