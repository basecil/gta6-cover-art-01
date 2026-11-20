// Ten poster layouts for Sunflare. Each turns the panel field into photo
// rectangles in canvas pixels with the cream gutter already taken out as gaps.
// Pure geometry (no DOM), so the live preview, the export and the rail diagrams
// all lay out from the same numbers.
//
// The default is HERO MOSAIC: five panels with slanted edges and one dominant
// hero, the way the top of the board builds a sunset poster. A panel marked
// `hero: true` is the one the pop-out lifts out of the grid.

export const LAYOUTS = [
  { id: 'mosaic', name: 'Hero Mosaic', hint: 'Five slanted panels, one hero', slots: 5 },
  { id: 'hero3', name: 'Hero + Three', hint: 'Wide hero over three', slots: 4 },
  { id: 'six', name: 'Six Grid', hint: '3 x 2 poster grid', slots: 6 },
  { id: 'trio', name: 'Diagonal Trio', hint: 'Three bands cut on a slant', slots: 3 },
  { id: 'seven', name: 'Seven Mosaic', hint: 'Hero plus six small prints', slots: 7 },
  { id: 'hero', name: 'Full-Bleed Hero', hint: 'One photo, title over the art', slots: 1 },
  { id: 'slash', name: 'Slashed Comic', hint: 'Diagonal comic bands', slots: 3 },
  { id: 'cast', name: 'Whole Cast', hint: 'Six faces, one poster', slots: 6 },
  { id: 'slant', name: 'Slanted Panels', hint: 'Skewed prints, staggered', slots: 4 },
  { id: 'triptych', name: 'Triptych Strip', hint: 'Three tall panels', slots: 3 },
];

export const DEFAULT_LAYOUT = 'mosaic';

export const LAYOUT_IDS = LAYOUTS.map((layout) => layout.id);

const rect = (x, y, w, h, extra) => ({ x, y, w, h, kind: 'photo', ...extra });

/** The cream band between panels, in canvas pixels. */
export function panelGap(width, height) {
  return Math.max(2, Math.round(Math.min(width, height) * 0.009));
}

function columns(area, count, gap) {
  const w = (area.w - gap * (count - 1)) / count;
  const out = [];
  for (let i = 0; i < count; i++) out.push(rect(area.x + i * (w + gap), area.y, w, area.h));
  return out;
}

function rows(area, count, gap) {
  const h = (area.h - gap * (count - 1)) / count;
  const out = [];
  for (let i = 0; i < count; i++) out.push(rect(area.x, area.y + i * (h + gap), area.w, h));
  return out;
}

/**
 * Photo rectangles for a layout inside `area` ({x,y,w,h} in canvas pixels).
 * A panel may carry `skew` (a horizontal offset in pixels that slants its sides
 * into a parallelogram), `rotate` (radians, around its centre) or `hero` (the
 * panel the pop-out lifts). Slanted edges are the house look, so most panels
 * get a small skew.
 */
export function layoutPanels(id, area, gap) {
  const slant = Math.max(3, Math.round(area.w * 0.016));
  switch (id) {
    case 'mosaic': {
      // One dominant hero on the right, a stack of three down the left and a
      // wide strip along the bottom -- five panels, every edge slanted.
      // The hero panel is capped at 44% of the cover width so the mosaic keeps
      // at least half the width: a wider hero panel would sit over the title.
      const hw = Math.min(area.w * 0.655, area.w * 0.44);
      const hero = rect(area.x + area.w - hw, area.y, hw, area.h * 0.78, { hero: true, skew: -slant });
      const leftW = area.w - hw - gap * 0.4;
      const thirdH = (area.h * 0.78 - gap * 2) / 3;
      const stack = [0, 1, 2].map((i) => rect(
        area.x + (i % 2 ? slant * 0.35 : 0),
        area.y + i * (thirdH + gap),
        leftW,
        thirdH,
        { skew: i % 2 ? slant * 0.55 : -slant * 0.55 },
      ));
      const strip = rect(area.x, area.y + area.h * 0.78 + gap, area.w, area.h * 0.22 - gap, { skew: slant * 0.5 });
      return [hero, ...stack, strip];
    }
    case 'hero3': {
      const heroH = (area.h - gap) * 0.60;
      const hero = rect(area.x, area.y, area.w, heroH, { hero: true, skew: slant });
      const below = columns(rect(area.x, area.y + heroH + gap, area.w, area.h - heroH - gap), 3, gap)
        .map((r, i) => ({ ...r, skew: (i - 1) * slant * 0.5 }));
      return [hero, ...below];
    }
    case 'six': {
      const out = [];
      for (const row of rows(area, 2, gap)) out.push(...columns(row, 3, gap));
      return out.map((r, i) => ({ ...r, skew: (i % 2 ? -1 : 1) * slant * 0.45 }));
    }
    case 'trio': {
      // Three bands cut on a diagonal, each a parallelogram running past the
      // field so the slant never shows a bare corner.
      const bandH = (area.h - gap * 2) / 3;
      const sk = area.w * 0.10;
      return [0, 1, 2].map((i) => rect(
        area.x - sk - 2,
        area.y + i * (bandH + gap),
        area.w + sk * 2 + 4,
        bandH,
        { skew: sk * (i % 2 ? -1 : 1) },
      ));
    }
    case 'seven': {
      const heroW = area.w * 0.52;
      const heroH = area.h * 0.62;
      const hero = rect(area.x, area.y, heroW, heroH, { hero: true, skew: -slant * 0.7 });
      const sideW = area.w - heroW - gap;
      const sideH = (heroH - gap) / 2;
      const side = [0, 1].map((i) => rect(
        area.x + heroW + gap,
        area.y + i * (sideH + gap),
        sideW,
        sideH,
        { skew: i % 2 ? slant * 0.6 : -slant * 0.3 },
      ));
      const bottom = columns(rect(area.x, area.y + heroH + gap, area.w, area.h - heroH - gap), 4, gap)
        .map((r, i) => ({ ...r, skew: (i % 2 ? -1 : 1) * slant * 0.35 }));
      return [hero, ...side, ...bottom];
    }
    case 'hero':
      return [rect(area.x, area.y, area.w, area.h, { bleed: true, hero: true })];
    case 'slash': {
      const bandH = (area.h - gap * 1.5) / 3;
      const sk = area.w * 0.13;
      return [0, 1, 2].map((i) => rect(
        area.x - sk - 2,
        area.y + i * (bandH + gap * 0.75),
        area.w + sk * 2 + 4,
        bandH,
        { skew: i === 1 ? -sk * 1.25 : sk, comic: true },
      ));
    }
    case 'cast': {
      const out = [];
      for (const row of rows(area, 3, gap)) out.push(...columns(row, 2, gap));
      return out.map((r, i) => ({ ...r, skew: (i % 2 ? -1 : 1) * slant * 0.3 }));
    }
    case 'slant': {
      const colW = (area.w - gap * 1.3) / 2;
      const rowH = (area.h - gap * 1.3) / 2;
      const sk = colW * 0.10;
      const out = [];
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
          const shift = (r === 0 ? 1 : -1) * rowH * 0.045;
          out.push(rect(
            area.x + c * (colW + gap * 1.3) + sk * 0.8,
            area.y + r * (rowH + gap * 1.3) + shift,
            colW - sk * 1.6,
            rowH - Math.abs(shift) * 2,
            { skew: c === r ? sk : -sk },
          ));
        }
      }
      return out;
    }
    case 'triptych':
      return columns(area, 3, gap).map((r, i) => ({ ...r, tall: true, skew: (i - 1) * slant * 0.55 }));
    default:
      return layoutPanels('mosaic', area, gap);
  }
}

export function layoutById(id) {
  return LAYOUTS.find((layout) => layout.id === id) ?? LAYOUTS[0];
}
