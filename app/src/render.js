// The cover engine: one function draws the whole poster at any size, so the live
// preview and all four exports run identical code. Geometry comes from
// layouts.js, palettes from grades.js; nothing here touches the network.
import { layoutPanels, panelGap } from './layouts.js';
import { gradeById, gradeLut, rgba, mixHex } from './grades.js';

export const EXPORT_SIZES = [
  { id: 'square', name: 'Square', label: '1080 x 1080', w: 1080, h: 1080, file: '1080x1080' },
  { id: 'portrait', name: 'Portrait', label: '1080 x 1350', w: 1080, h: 1350, file: '1080x1350' },
  { id: 'landscape', name: 'Landscape', label: '1920 x 1080', w: 1920, h: 1080, file: '1920x1080' },
  { id: 'story', name: 'Story', label: '1080 x 1920', w: 1080, h: 1920, file: '1080x1920' },
];

export const TITLE_FACE = '"Anton", "Arial Narrow", Impact, sans-serif';
export const SCRIPT_FACE = '"Pacifico", "Brush Script MT", cursive';

/**
 * Where the masthead, panel field and footer sit for a canvas size. A landscape
 * canvas puts the lettering in a left column and the panels on the right (the
 * classic poster shape); portrait shapes stack header, panels, footer.
 */
export function planFrame(layoutId, width, height) {
  const min = Math.min(width, height);
  const margin = Math.round(min * 0.034);
  const landscape = width / height > 1.16;
  const full = layoutId === 'full';
  const tall = height / width;

  if (landscape) {
    const colW = Math.round(width * 0.305);
    const footerH = Math.round(height * 0.235);
    const innerW = colW - margin * 1.7;
    return {
      landscape,
      full,
      tall,
      margin,
      masthead: { x: margin, y: Math.round(margin * 0.9), w: innerW, h: height - margin - footerH - Math.round(margin * 0.9) },
      footer: { x: margin, y: height - margin - footerH, w: innerW, h: footerH },
      panels: full
        ? { x: 0, y: 0, w: width, h: height }
        : { x: colW, y: margin, w: width - colW - margin, h: height - margin * 2 },
    };
  }

  const headerFrac = tall > 1.5 ? 0.19 : tall > 1.12 ? 0.238 : 0.295;
  const footerFrac = tall > 1.5 ? 0.088 : tall > 1.12 ? 0.10 : 0.122;
  const headerH = Math.round(height * headerFrac);
  const footerH = Math.round(height * footerFrac);
  return {
    landscape,
    full,
    tall,
    margin,
    masthead: { x: margin, y: Math.round(margin * 0.8), w: width - margin * 2, h: headerH - Math.round(margin * 0.8) },
    footer: { x: margin, y: height - margin - footerH, w: width - margin * 2, h: footerH },
    panels: full
      ? { x: 0, y: 0, w: width, h: height }
      : { x: margin, y: headerH, w: width - margin * 2, h: height - headerH - footerH - margin },
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

/* --------------------------------------------------------------- photo panel */

/** Draws a graded, cover-fitted photo into a rect, honouring per-panel zoom and pan. */
function drawPhoto(ctx, image, slot, rect, palette) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (!image) {
    const wash = ctx.createLinearGradient(x, y, x + w, y + h);
    wash.addColorStop(0, mixHex(palette.ink, palette.glow, 0.30));
    wash.addColorStop(1, mixHex(palette.ink, palette.paper, 0.16));
    ctx.fillStyle = wash;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = rgba(palette.paper, 0.20);
    ctx.lineWidth = Math.max(1, Math.min(w, h) * 0.004);
    const step = Math.max(16, Math.min(w, h) * 0.10);
    for (let d = -h; d < w + h; d += step) {
      ctx.beginPath();
      ctx.moveTo(x + d, y);
      ctx.lineTo(x + d - h, y + h);
      ctx.stroke();
    }
    const size = Math.max(10, Math.min(w, h) * 0.062);
    ctx.fillStyle = rgba(palette.paper, 0.82);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${size}px ${TITLE_FACE}`;
    ctx.letterSpacing = `${size * 0.1}px`;
    ctx.fillText('DROP A PHOTO', x + w / 2, y + h / 2);
    ctx.letterSpacing = '0px';
    ctx.restore();
    return;
  }
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  const zoom = slot.zoom ?? 1;
  const scale = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const slackX = Math.max(0, dw - w);
  const slackY = Math.max(0, dh - h);
  const dx = x - slackX / 2 - (slot.ox ?? 0) * (slackX / 2);
  const dy = y - slackY / 2 - (slot.oy ?? 0) * (slackY / 2);
  ctx.drawImage(image, dx, dy, dw, dh);
  const shade = ctx.createLinearGradient(x, y + h * 0.48, x, y + h);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, rgba(palette.ink, 0.30));
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function drawPanels(ctx, state, plan, palette, graded, size) {
  const rects = layoutPanels(state.layout, plan.panels, panelGap(size.w, size.h));
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
    drawPhoto(ctx, image, slot, rect, palette);
    if (!rect.bleed) {
      const lw = Math.max(2, Math.round(Math.min(size.w, size.h) * 0.0042));
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = lw;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = rgba(palette.paper, 0.28);
      ctx.lineWidth = Math.max(1, Math.round(lw * 0.30));
      ctx.strokeRect(rect.x + lw * 1.6, rect.y + lw * 1.6, rect.w - lw * 3.2, rect.h - lw * 3.2);
    }
    ctx.restore();
  });
}

/* --------------------------------------------------------------- lettering */

function halftoneSlab(ctx, x, y, w, h, angle, palette) {
  ctx.save();
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

function drawMasthead(ctx, state, plan, palette, size) {
  const m = plan.masthead;
  const pad = Math.round(Math.min(size.w, size.h) * 0.014);
  const title = (state.title || '').trim() || 'NEON SHORE';
  const hasSub = Boolean((state.subtitle || '').trim());
  const tracking = 0.006;

  const subBand = hasSub ? Math.max(30, Math.min(m.h * 0.24, m.w * 0.14, 150)) : 0;
  const boxW = m.w - pad * 2;
  const boxH = Math.max(40, m.h - subBand);
  const widthFor = (line, fs) => measure(ctx, line, fs, TITLE_FACE, tracking);

  const single = splitTitle(title).join(' ');
  const words = splitTitle(title);
  const fit = (ls) => {
    const widest = Math.max(...ls.map((l) => widthFor(l, 100)));
    return Math.min((boxW / Math.max(1, widest)) * 100, (boxH * 0.97) / (ls.length * 1.01));
  };
  const singleFit = fit([single]);
  let lines = [single];
  let fsize = singleFit;
  if (words.length > 1) {
    const multiFit = fit(words);
    if (multiFit > singleFit * 1.22) {
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
  const angle = plan.landscape ? 0 : -0.018;

  if (state.halftone !== false) halftoneSlab(ctx, bx, by, blockW, blockH, angle, palette);
  else {
    ctx.save();
    ctx.translate(bx + blockW / 2, by + blockH / 2);
    ctx.rotate(angle);
    ctx.fillStyle = palette.ink;
    ctx.fillRect(-blockW / 2, -blockH / 2, blockW, blockH);
    ctx.strokeStyle = rgba(palette.accent, 0.85);
    ctx.lineWidth = Math.max(2, blockH * 0.014);
    ctx.strokeRect(-blockW / 2 + ctx.lineWidth, -blockH / 2 + ctx.lineWidth,
                   blockW - ctx.lineWidth * 2, blockH - ctx.lineWidth * 2);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(bx + blockW / 2, by + blockH / 2);
  ctx.rotate(angle);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${fsize}px ${TITLE_FACE}`;
  ctx.letterSpacing = `${fsize * tracking}px`;
  const fill = state.titleStyle === 'sunset'
    ? (() => {
        const g = ctx.createLinearGradient(0, -blockH / 2, 0, blockH / 2);
        g.addColorStop(0, '#fff6e0');
        g.addColorStop(0.32, palette.accent);
        g.addColorStop(0.66, palette.glow);
        g.addColorStop(1, '#ff4f86');
        return g;
      })()
    : palette.paper;
  lines.forEach((line, i) => {
    const yy = (i - (lines.length - 1) / 2) * lineH;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillText(line, fsize * 0.012, yy + fsize * 0.026);
    ctx.fillStyle = fill;
    ctx.fillText(line, 0, yy);
  });
  ctx.letterSpacing = '0px';
  ctx.restore();

  if (hasSub) {
    const sy = Math.min(by + blockH + subGap + ss * 0.55, m.y + m.h - ss * 0.45);
    ctx.save();
    ctx.translate(m.x + m.w / 2, sy);
    ctx.rotate(-0.026);
    ctx.font = `${ss}px ${SCRIPT_FACE}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = palette.glow;
    ctx.shadowBlur = ss * 0.55;
    ctx.fillStyle = palette.glow;
    ctx.fillText(subText, 0, 0);
    // A dark outline keeps the script legible on pale grades (Golden Hour cream).
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
  const label = (text || 'VICE CITY').toUpperCase();
  const size = h * 0.44;
  ctx.save();
  ctx.font = `${size}px ${TITLE_FACE}`;
  ctx.letterSpacing = `${size * 0.12}px`;
  const tw = ctx.measureText(label).width;
  const w = Math.min(tw + h * 1.35, h * 12);
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
  ctx.letterSpacing = `${size * 0.12}px`;
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
    const band = ctx.createLinearGradient(0, f.y - f.h * 0.25, 0, f.y + f.h);
    band.addColorStop(0, rgba(palette.ink, 0));
    band.addColorStop(0.45, rgba(palette.ink, 0.55));
    band.addColorStop(1, rgba(palette.ink, 0.86));
    ctx.fillStyle = band;
    ctx.fillRect(f.x - f.w * 0.1, f.y - f.h * 0.25, f.w * 1.2, f.h * 1.25);
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

  const line = (state.footer || state.subtitle || 'A Neon Coast picture').toUpperCase();
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
  ctx.fillText('NEON COAST STUDIO  /  ' + gradeById(state.grade).name.toUpperCase(), rect.x + pad, rect.y + rect.h * 0.72);
  ctx.letterSpacing = '0px';
}

/* ------------------------------------------------------------------- finish */

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
  g.addColorStop(0.74, rgba(palette.ink, 0.15));
  g.addColorStop(1, rgba(palette.ink, 0.48));
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
        const l = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) | 0;
        const o = l * 3;
        px[i] = lut[o];
        px[i + 1] = lut[o + 1];
        px[i + 2] = lut[o + 2];
      }
      octx.putImageData(data, 0, 0);
    } catch {
      /* a tainted canvas would leave the photo ungraded */
    }
    cache.set(key, off);
    return off;
  };

  drawPanels(ctx, state, plan, palette, graded, size);

  if (plan.full) {
    const scrim = ctx.createLinearGradient(0, 0, 0, height);
    scrim.addColorStop(0, rgba(grade.ink, 0.62));
    scrim.addColorStop(0.36, rgba(grade.ink, 0.0));
    scrim.addColorStop(0.62, rgba(grade.ink, 0.0));
    scrim.addColorStop(1, rgba(grade.ink, 0.72));
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, width, height);
  }

  drawMasthead(ctx, state, plan, palette, size);
  drawFooter(ctx, state, plan, palette, plan.full);

  if (state.vignette !== false) drawVignette(ctx, width, height, palette);
  if (state.grain !== false) drawGrain(ctx, width, height);
  ctx.restore();
}

export const __debug = { drawMasthead, drawFooter, drawPanels, planFrame, drawCaptionBand, drawRibbon, drawStars };

/** Renders the cover to a fresh canvas, ready for toBlob. */
export function renderToCanvas(state, images, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas.getContext('2d'), state, images, width, height);
  return canvas;
}
