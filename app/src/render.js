// The cover engine for Midnight Vice: one function draws the whole poster at
// any size, so the live preview and all four exports run identical code.
// Geometry comes from layouts.js, palettes from grades.js; nothing here touches
// the network. Night-first: the default layout is a single full-bleed photo with
// the lettering over the art, a sky glow behind it and an ink band under it.

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

/** Role tags printed beside each panel, in panel order. */
export const ROLE_TAGS = [
  'LUCIA', 'JASON', 'THE CITY', 'LEONIDA', 'AFTER DARK', 'THE GETAWAY',
  'NIGHT SHIFT', 'THE COAST', 'VICE',
];

/**
 * Where the masthead, panel field and footer sit for a canvas size. A landscape
 * canvas puts the lettering in a left column and the panels on the right; a
 * portrait shape stacks header, panels, footer. The full-bleed hero has no panel
 * field -- its photo is the whole canvas and the lettering sits over it, at the
 * left on a landscape canvas and in a band at the top of a portrait one.
 */
export function planFrame(layoutId, width, height) {
  const min = Math.min(width, height);
  const margin = Math.round(min * 0.034);
  const landscape = width / height > 1.16;
  const bleed = layoutId === 'hero';
  const tall = height / width;

  if (bleed) {
    if (landscape) {
      const colW = Math.round(width * 0.44);
      const footerH = Math.round(height * 0.20);
      return {
        landscape, bleed, tall, margin,
        masthead: { x: margin * 1.35, y: height * 0.20, w: colW - margin * 1.2, h: height * 0.46 },
        footer: { x: margin * 1.35, y: height - footerH - margin * 1.1, w: colW - margin * 1.2, h: footerH },
        panels: { x: 0, y: 0, w: width, h: height },
      };
    }
    // A portrait/story sheet gets a compact masthead band at the top, so the
    // hero subject framed underneath it keeps its whole face inside the frame.
    const headerH = Math.round(height * (tall > 1.5 ? 0.215 : 0.235));
    const footerH = Math.round(height * 0.105);
    return {
      landscape, bleed, tall, margin,
      masthead: { x: margin, y: margin * 0.85, w: width - margin * 2, h: headerH },
      footer: { x: margin, y: height - margin - footerH, w: width - margin * 2, h: footerH },
      panels: { x: 0, y: 0, w: width, h: height },
    };
  }

  if (landscape) {
    const colW = Math.round(width * 0.305);
    const footerH = Math.round(height * 0.235);
    const innerW = colW - margin * 1.7;
    return {
      landscape, bleed, tall, margin,
      masthead: { x: margin, y: Math.round(margin * 0.9), w: innerW, h: height - margin - footerH - Math.round(margin * 0.9) },
      footer: { x: margin, y: height - margin - footerH, w: innerW, h: footerH },
      panels: { x: colW, y: margin, w: width - colW - margin, h: height - margin * 2 },
    };
  }

  const headerFrac = tall > 1.5 ? 0.19 : tall > 1.12 ? 0.238 : 0.295;
  const footerFrac = tall > 1.5 ? 0.088 : tall > 1.12 ? 0.10 : 0.122;
  const headerH = Math.round(height * headerFrac);
  const footerH = Math.round(height * footerFrac);
  return {
    landscape, bleed, tall, margin,
    masthead: { x: margin, y: Math.round(margin * 0.8), w: width - margin * 2, h: headerH - Math.round(margin * 0.8) },
    footer: { x: margin, y: height - margin - footerH, w: width - margin * 2, h: footerH },
    panels: { x: margin, y: headerH, w: width - margin * 2, h: height - headerH - footerH - margin },
  };
}

/* ------------------------------------------------------------------ helpers */

function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.44;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
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
  ctx.lineWidth = lw;
  ctx.strokeStyle = ink;
  ctx.stroke();
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
    // Frame the focus box (a face, a sign) by its centre rather than its
    // top-left corner, so the subject sits where the layout expects it.
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
    ctx.strokeStyle = rgba(palette.paper, 0.20);
    ctx.lineWidth = Math.max(1, Math.min(r.w, r.h) * 0.004);
    const step = Math.max(16, Math.min(r.w, r.h) * 0.10);
    for (let d = -r.h; d < w + r.h; d += step) {
      ctx.beginPath();
      ctx.moveTo(x + d, r.y);
      ctx.lineTo(x + d - r.h, r.y + r.h);
      ctx.stroke();
    }
    const size = Math.max(10, Math.min(r.w, r.h) * 0.062);
    ctx.fillStyle = rgba(palette.paper, 0.82);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${size}px ${TITLE_FACE}`;
    ctx.letterSpacing = `${size * 0.1}px`;
    ctx.fillText('DROP A PHOTO', x + w / 2, r.y + r.h / 2);
    ctx.letterSpacing = '0px';
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

  const shade = ctx.createLinearGradient(0, h * 0.42, 0, h);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, rgba(palette.ink, 0.34));
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** A small ink tag naming a panel's role, printed in its top-left corner. */
function drawRoleTag(ctx, rect, label, palette, size) {
  if (!label) return;
  const h = Math.max(14, Math.min(size.w, size.h) * 0.026);
  const fs = h * 0.56;
  ctx.save();
  ctx.font = `${fs}px ${TITLE_FACE}`;
  ctx.letterSpacing = `${fs * 0.10}px`;
  const tw = ctx.measureText(label).width;
  const pad = fs * 0.65;
  const w = Math.min(tw + pad * 2, rect.w * 0.82);
  const x = rect.x + h * 0.35 + Math.max(0, (rect.skew || 0) * 0.4);
  const y = rect.y + h * 0.35;
  ctx.fillStyle = palette.ink;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = rgba(palette.accent, 0.95);
  ctx.fillRect(x, y + h - Math.max(1, h * 0.10), w, Math.max(1, h * 0.10));
  ctx.fillStyle = palette.paper;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + pad, y + h * 0.47, w - pad * 2);
  ctx.letterSpacing = '0px';
  ctx.restore();
}

function drawPanels(ctx, state, plan, palette, graded, size) {
  const rects = layoutPanels(state.layout, plan.panels, panelGap(size.w, size.h));
  // A full-bleed portrait sheet stacks the masthead at the top, so the hero
  // subject is anchored lower, clear of the lettering plate.
  const anchor = plan.landscape
    ? { x: 0.68, y: 0.46 }
    : plan.bleed ? { x: 0.5, y: 0.55 } : { x: 0.5, y: 0.36 };
  rects.forEach((rect, i) => {
    const slot = state.slots?.[i] ?? {};
    const image = slot.photo ? graded(slot.photo) : null;
    ctx.save();
    if (rect.rotate) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(rect.rotate);
      ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
    }
    if (rect.kind === 'caption') {
      drawCaptionBand(ctx, state, rect, palette);
      ctx.restore();
      return;
    }
    if (rect.snapshot) {
      const s = Math.min(rect.w, rect.h);
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = s * 0.08;
      ctx.shadowOffsetX = s * 0.010;
      ctx.shadowOffsetY = s * 0.024;
      ctx.fillStyle = palette.paper;
      ctx.fillRect(rect.x - s * 0.028, rect.y - s * 0.028, rect.w + s * 0.056, rect.h + s * 0.056);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
    drawPhoto(ctx, image, slot, rect, palette, anchor);

    if (!rect.bleed && !rect.snapshot) {
      const lw = Math.max(2, Math.round(Math.min(size.w, size.h) * 0.0042));
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = lw;
      panelPath(ctx, rect);
      ctx.stroke();
      ctx.strokeStyle = rgba(palette.paper, 0.30);
      ctx.lineWidth = Math.max(1, Math.round(lw * 0.30));
      panelPath(ctx, rect, -lw * 1.8);
      ctx.stroke();
    }
    if (!rect.bleed && image && state.roleTags !== false) {
      drawRoleTag(ctx, rect, state.roles?.[i] ?? ROLE_TAGS[i % ROLE_TAGS.length], palette, size);
    }
    ctx.restore();
  });
}

/* ------------------------------------------------------------------- finish */

/**
 * The sky glow: a broad neon wash over the top of the art plus a soft horizon
 * haze, so a night photo reads as a lit sky rather than a flat shadow. Drawn
 * over the panels and under the lettering; off with the skyGlow toggle.
 */
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
 * The sky glow: a broad neon wash over the top of the art plus a soft horizon
 * haze, so a night photo reads as a lit sky rather than a flat shadow. Drawn
 * over the panels and under the lettering; off with the skyGlow toggle.
 *
 * It is painted into its own layer so a framed face can be masked out of it: a
 * violet or cyan wash laid over skin is exactly what turns a face magenta, so
 * `protect` ellipses are erased from the glow before it is screened down. The
 * sky still glows, the face keeps its warmth.
 */
function drawSkyGlow(ctx, state, plan, palette, grade, size, protect = []) {
  const { w, h } = size;
  const top = plan.bleed ? 0 : plan.panels.y;
  const region = plan.bleed ? h * 0.62 : plan.panels.h * 0.52;
  const cx = w * (plan.bleed && plan.landscape ? 0.62 : 0.5);

  const layer = skyGlowLayer(w, h);
  layer.save();
  layer.globalCompositeOperation = 'source-over';
  const g = layer.createRadialGradient(cx, top + region * 0.22, 0, cx, top + region * 0.22, Math.max(w, h) * 0.72);
  g.addColorStop(0, rgba(grade.glow, 0.34));
  g.addColorStop(0.38, rgba(grade.accent, 0.14));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  layer.fillStyle = g;
  layer.fillRect(0, 0, w, h);

  const horizon = layer.createLinearGradient(0, top + region * 0.20, 0, top + region);
  horizon.addColorStop(0, 'rgba(0,0,0,0)');
  horizon.addColorStop(0.62, rgba(grade.glow, 0.10));
  horizon.addColorStop(1, 'rgba(0,0,0,0)');
  layer.fillStyle = horizon;
  layer.fillRect(0, top, w, region);

  // A few soft haze bands, like light bleed off wet asphalt.
  layer.globalAlpha = 0.10;
  for (let i = 0; i < 3; i++) {
    const y = top + region * (0.42 + i * 0.16);
    const band = layer.createLinearGradient(0, y, w, y + region * 0.05);
    band.addColorStop(0, 'rgba(0,0,0,0)');
    band.addColorStop(0.5, rgba(i % 2 ? grade.accent : grade.glow, 0.9));
    band.addColorStop(1, 'rgba(0,0,0,0)');
    layer.fillStyle = band;
    layer.fillRect(0, y, w, Math.max(2, region * 0.035));
  }
  layer.globalAlpha = 1;

  // Mask each framed face out of the wash with a soft-edged ellipse.
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
  const anchor = plan.landscape
    ? { x: 0.68, y: 0.46 }
    : plan.bleed ? { x: 0.5, y: 0.55 } : { x: 0.5, y: 0.36 };
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
    const rad = Math.max(fw, fh) * 0.78 + Math.min(r.w, r.h) * 0.02;
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
  ctx.strokeStyle = rgba(palette.paper, 0.28);
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

function halftoneSlab(ctx, x, y, w, h, angle, palette, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(angle);
  const off = h * 0.05;

  ctx.fillStyle = rgba(palette.accent, 0.95);
  ctx.fillRect(-w / 2 + off, -h / 2 + off * 1.1, w, h);

  ctx.fillStyle = palette.ink;
  ctx.fillRect(-w / 2, -h / 2, w, h);

  ctx.beginPath();
  ctx.rect(-w / 2, -h / 2, w, h);
  ctx.clip();
  const pitch = Math.max(5, Math.round(h * 0.042));
  ctx.fillStyle = rgba(palette.paper, 0.26);
  for (let gy = -h / 2 + pitch / 2; gy < h / 2; gy += pitch) {
    for (let gx = -w / 2 + pitch / 2; gx < w / 2; gx += pitch) {
      const nx = (gx + w / 2) / w;
      const ny = (gy + h / 2) / h;
      const d = Math.min(1, Math.hypot(nx - 0.5, ny - 0.5) * 1.55);
      const r = pitch * 0.19 * (0.30 + d * 0.85);
      ctx.beginPath();
      ctx.arc(gx, gy, Math.max(0.4, r), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** A chrome 3D title fill: sky band, horizon band, a specular stripe and a dark foot. */
function chromeFill(ctx, boxW, boxH, palette) {
  const g = ctx.createLinearGradient(0, -boxH / 2, 0, boxH / 2);
  g.addColorStop(0.00, '#fdfbff');
  g.addColorStop(0.30, '#a9c6e6');
  g.addColorStop(0.46, '#3f5d86');
  g.addColorStop(0.50, '#dfefff');
  g.addColorStop(0.56, '#7d9dc4');
  g.addColorStop(0.78, palette.accent);
  g.addColorStop(1.00, '#2a1c46');
  return g;
}

function drawMasthead(ctx, state, plan, palette, size) {
  const m = plan.masthead;
  const pad = Math.round(Math.min(size.w, size.h) * 0.014);
  const title = (state.title || '').trim() || 'MIDNIGHT VICE';
  const hasSub = Boolean((state.subtitle || '').trim());
  const tracking = 0.006;
  const bleed = Boolean(plan.bleed);

  const subBand = hasSub ? Math.max(30, Math.min(m.h * 0.24, m.w * 0.14, 150)) : 0;
  const boxW = m.w - pad * 2;
  const boxH = Math.max(40, m.h - subBand);
  const widthFor = (line, fs) => measure(ctx, line, fs, TITLE_FACE, tracking);

  const single = splitTitle(title).join(' ');
  const words = splitTitle(title);
  const fit = (ls, wBox, hBox) => {
    const widest = Math.max(...ls.map((l) => widthFor(l, 100)));
    return Math.min((wBox / Math.max(1, widest)) * 100, (hBox * 0.97) / (ls.length * 1.01));
  };
  const singleFit = fit([single], boxW, boxH);
  let lines = [single];
  let fsize = singleFit;
  if (words.length > 1) {
    const multiFit = fit(words, boxW, boxH);
    if (multiFit > singleFit * 1.18) {
      lines = words;
      fsize = multiFit;
    }
  }
  fsize = Math.max(12, fsize);

  const lineH = fsize * 1.01;
  const blockW = m.w;
  const blockH = lines.length * lineH + pad * 0.95;

  const subText = (state.subtitle || '').trim();
  let ss = 0;
  if (hasSub) {
    ss = Math.min(blockH * 0.30, subBand * 0.80, m.w * 0.11);
    ss = Math.max(ss, 11);
    while (measure(ctx, subText, ss, SCRIPT_FACE) > m.w * 0.98 && ss > 10) ss -= 1;
  }
  const subGap = hasSub ? subBand * 0.18 : 0;
  const groupH = blockH + (hasSub ? subGap + ss : 0);
  const bx = m.x;
  const by = m.y + Math.max(0, (m.h - groupH) / 2);
  const angle = plan.landscape && !bleed ? 0 : -0.016;

  const plate = () => {
    if (state.halftone !== false) halftoneSlab(ctx, bx, by, blockW, blockH, angle, palette, bleed ? 0.92 : 1);
    else {
      ctx.save();
      ctx.translate(bx + blockW / 2, by + blockH / 2);
      ctx.rotate(angle);
      ctx.fillStyle = bleed ? rgba(palette.ink, 0.88) : palette.ink;
      ctx.fillRect(-blockW / 2, -blockH / 2, blockW, blockH);
      ctx.strokeStyle = rgba(palette.accent, 0.85);
      ctx.lineWidth = Math.max(2, blockH * 0.014);
      ctx.strokeRect(-blockW / 2 + ctx.lineWidth, -blockH / 2 + ctx.lineWidth,
                     blockW - ctx.lineWidth * 2, blockH - ctx.lineWidth * 2);
      ctx.restore();
    }
  };
  plate();

  ctx.save();
  ctx.translate(bx + blockW / 2, by + blockH / 2);
  ctx.rotate(angle);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${fsize}px ${TITLE_FACE}`;
  ctx.letterSpacing = `${fsize * tracking}px`;

  const style = state.titleStyle ?? 'chrome';
  const buildFill = () => {
    if (style === 'sunset') {
      const g = ctx.createLinearGradient(0, -blockH / 2, 0, blockH / 2);
      g.addColorStop(0, '#fff6e0');
      g.addColorStop(0.32, palette.accent);
      g.addColorStop(0.66, palette.glow);
      g.addColorStop(1, '#ff4f86');
      return g;
    }
    if (style === 'chrome') return chromeFill(ctx, blockW, blockH, palette);
    return palette.paper;
  };
  const fill = buildFill();

  lines.forEach((line, i) => {
    const yy = (i - (lines.length - 1) / 2) * lineH;
    if (style === 'chrome') {
      // Extruded 3D: a stack of dark copies stepping down-right, then the
      // chrome face, then a bright top edge and a dark keyline.
      const depth = Math.max(2, fsize * 0.055);
      const steps = 5;
      for (let s = steps; s >= 1; s--) {
        const t = s / steps;
        ctx.fillStyle = mixHex('#120a1e', palette.accent, 0.18 * (1 - t));
        ctx.fillText(line, depth * s * 0.55, yy + depth * s * 0.80);
      }
      ctx.fillStyle = fill;
      ctx.fillText(line, 0, yy);
      ctx.lineWidth = Math.max(1, fsize * 0.016);
      ctx.strokeStyle = 'rgba(18,10,30,0.85)';
      ctx.strokeText(line, 0, yy);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = Math.max(1, fsize * 0.012);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.strokeText(line, -fsize * 0.012, yy - fsize * 0.030);
      ctx.restore();
    } else {
      if (bleed || state.posterInk !== false) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillText(line, fsize * 0.014, yy + fsize * 0.030);
      }
      ctx.fillStyle = fill;
      ctx.fillText(line, 0, yy);
      if (bleed && state.posterInk !== false) {
        ctx.lineWidth = Math.max(1, fsize * 0.012);
        ctx.strokeStyle = 'rgba(8,4,14,0.55)';
        ctx.strokeText(line, 0, yy);
      }
    }
  });

  if (style === 'chrome') {
    ctx.letterSpacing = '0px';
  }
  ctx.letterSpacing = '0px';
  ctx.restore();

  if (hasSub) {
    const sy = Math.min(by + blockH + subGap + ss * 0.55, m.y + m.h - ss * 0.45);
    ctx.save();
    ctx.translate(m.x + m.w / 2, sy);
    ctx.rotate(-0.024);
    ctx.font = `${ss}px ${SCRIPT_FACE}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = palette.glow;
    ctx.shadowBlur = ss * 0.55;
    ctx.fillStyle = palette.glow;
    ctx.fillText(subText, 0, 0);
    ctx.shadowColor = 'rgba(10,6,18,0.55)';
    ctx.shadowBlur = ss * 0.22;
    ctx.shadowOffsetY = ss * 0.05;
    ctx.lineWidth = Math.max(1, ss * 0.07);
    ctx.strokeStyle = 'rgba(10,6,18,0.72)';
    ctx.strokeText(subText, 0, 0);
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = ss * 0.12;
    ctx.fillStyle = '#fff8ec';
    ctx.fillText(subText, 0, 0);
    ctx.restore();
  }
}

/** A notched ribbon; returns its width so the caller can lay out around it. */
function drawRibbon(ctx, text, x, y, h, palette) {
  const label = (text || 'LEONIDA • EST. 2026').toUpperCase();
  const size = h * 0.42;
  ctx.save();
  ctx.font = `${size}px ${TITLE_FACE}`;
  ctx.letterSpacing = `${size * 0.10}px`;
  const tw = ctx.measureText(label).width;
  const w = Math.min(tw + h * 1.35, h * 14);
  const notch = h * 0.30;
  ctx.beginPath();
  ctx.moveTo(x + notch, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + notch, y + h);
  ctx.lineTo(x, y + h / 2);
  ctx.closePath();
  ctx.fillStyle = palette.ink;
  ctx.fill();
  ctx.strokeStyle = rgba(palette.paper, 0.35);
  ctx.lineWidth = Math.max(1, h * 0.025);
  ctx.stroke();
  ctx.fillStyle = palette.paper;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = `${size * 0.10}px`;
  ctx.fillText(label, x + w / 2 + notch * 0.4, y + h * 0.54, w - notch * 1.4);
  ctx.letterSpacing = '0px';
  ctx.restore();
  return w;
}

function drawStars(ctx, count, x, y, r, palette) {
  const gap = r * 2.6;
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, x + r + i * gap, y, r, i < count ? palette.accent : null, palette.ink, Math.max(1, r * 0.16));
  }
  return r * 2 + 4 * gap;
}

function drawFooter(ctx, state, plan, palette, overlay = false) {
  const f = plan.footer;
  const min = Math.min(f.w, f.h);
  const pad = Math.round(min * 0.05);
  const ribbonH = Math.round(Math.min(f.h * 0.34, f.w * 0.105, min * 0.34));
  const top = f.y;

  ctx.save();
  if (overlay) {
    const band = ctx.createLinearGradient(0, f.y - f.h * 0.35, 0, f.y + f.h);
    band.addColorStop(0, rgba(palette.ink, 0));
    band.addColorStop(0.45, rgba(palette.ink, 0.58));
    band.addColorStop(1, rgba(palette.ink, 0.90));
    ctx.fillStyle = band;
    ctx.fillRect(f.x - f.w * 0.2, f.y - f.h * 0.35, f.w * 1.4, f.h * 1.35);
  }
  ctx.strokeStyle = rgba(overlay ? palette.paper : palette.ink, 0.72);
  ctx.lineWidth = Math.max(1, Math.round(f.h * 0.012));
  ctx.beginPath();
  ctx.moveTo(f.x, top);
  ctx.lineTo(f.x + f.w, top);
  ctx.stroke();

  const ribY = top + pad * 1.1;
  drawRibbon(ctx, state.badge, f.x, ribY, ribbonH, overlay ? { ...palette, ink: palette.paper, paper: palette.ink } : palette);

  const starR = Math.max(5, ribbonH * 0.26);
  const starsW = starR * 2 + 4 * starR * 2.6;
  const starsRight = f.x + f.w;
  drawStars(ctx, Math.max(1, Math.min(5, state.stars ?? 4)), starsRight - starsW, ribY + ribbonH * 0.5, starR, overlay ? { ...palette, ink: palette.paper, accent: palette.accent } : palette);

  ctx.font = `${Math.max(8, ribbonH * 0.30)}px ${TITLE_FACE}`;
  ctx.letterSpacing = `${ribbonH * 0.03}px`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = rgba(overlay ? palette.paper : palette.ink, overlay ? 0.7 : 0.55);
  ctx.textAlign = 'left';
  const heatY = ribY + ribbonH + ribbonH * 0.62;
  const gradeName = gradeById(state.grade).name.toUpperCase();
  ctx.fillText(`HEAT ${'★'.repeat(Math.max(1, Math.min(5, state.stars ?? 4)))}  ·  ${gradeName}`, f.x + pad * 0.2, heatY, f.w * 0.6);
  ctx.letterSpacing = '0px';

  const footer = (state.footer || '').trim();
  if (footer) {
    const fs = Math.max(9, ribbonH * 0.30);
    let size2 = fs;
    while (measure(ctx, footer.toUpperCase(), size2, TITLE_FACE, 0.03) > f.w && size2 > 9) size2 -= 1;
    ctx.font = `${size2}px ${TITLE_FACE}`;
    ctx.letterSpacing = `${size2 * 0.03}px`;
    ctx.fillStyle = overlay ? palette.paper : rgba(palette.ink, 0.9);
    ctx.textAlign = 'right';
    ctx.fillText(footer.toUpperCase(), f.x + f.w, heatY, f.w);
    ctx.letterSpacing = '0px';
  }
  ctx.restore();
}

function drawCaptionBand(ctx, state, rect, palette) {
  const pad = Math.round(rect.h * 0.10);
  ctx.fillStyle = palette.ink;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = rgba(palette.accent, 0.9);
  ctx.fillRect(rect.x, rect.y, rect.w, Math.max(2, rect.h * 0.02));

  const line = (state.footer || state.subtitle || 'A Midnight Vice picture').toUpperCase();
  const size = Math.max(11, rect.h * 0.20);
  let ps = size;
  while (measure(ctx, line, ps, TITLE_FACE, 0.07) > rect.w * 0.58 && ps > 9) ps -= 1;
  ctx.font = `${ps}px ${TITLE_FACE}`;
  ctx.letterSpacing = `${ps * 0.07}px`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = palette.paper;
  ctx.fillText(line, rect.x + pad, rect.y + rect.h * 0.40, rect.w * 0.6);
  ctx.letterSpacing = '0px';

  const starR = Math.max(4, rect.h * 0.085);
  const sw = starR * 2 + 4 * starR * 2.6;
  drawStars(ctx, Math.max(1, Math.min(5, state.stars ?? 4)), rect.x + rect.w - pad - sw, rect.y + rect.h * 0.40, starR, palette);

  ctx.font = `${Math.max(7, rect.h * 0.085)}px ${TITLE_FACE}`;
  ctx.letterSpacing = `${rect.h * 0.012}px`;
  ctx.fillStyle = rgba(palette.paper, 0.6);
  ctx.fillText('MIDNIGHT VICE STUDIO  /  ' + gradeById(state.grade).name.toUpperCase(), rect.x + pad, rect.y + rect.h * 0.72);
  ctx.letterSpacing = '0px';
}

function drawGrain(ctx, w, h, opacity = 0.13) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = opacity;
  ctx.fillStyle = grainPattern(ctx);
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawVignette(ctx, w, h, palette) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.30, w / 2, h / 2, Math.max(w, h) * 0.76);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.74, rgba(palette.ink, 0.18));
  g.addColorStop(1, rgba(palette.ink, 0.55));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
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
  ctx.fillStyle = grade.paper;
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

  if (state.posterInk !== false && !plan.bleed) drawInkFrame(ctx, plan, palette, size);

  drawMasthead(ctx, state, plan, palette, size);
  drawFooter(ctx, state, plan, palette, plan.bleed);

  if (state.vignette !== false) drawVignette(ctx, width, height, palette);
  if (state.grain !== false) drawGrain(ctx, width, height);
  ctx.restore();
}

export const __debug = { drawMasthead, drawFooter, drawPanels, planFrame, drawCaptionBand, drawRibbon, drawStars, drawSkyGlow, placePhoto, framedFaces };

/** Renders the cover to a fresh canvas, ready for toBlob. */
export function renderToCanvas(state, images, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas.getContext('2d'), state, images, width, height);
  return canvas;
}
