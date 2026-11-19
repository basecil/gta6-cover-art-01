// Seven poster layouts. Each turns the panel region of the poster into photo
// rectangles in canvas pixels, with the cream gutter already taken out as gaps.
// Pure geometry (no DOM), so the same code lays out the live preview, the export
// and the little layout diagrams in the rail.

export const LAYOUTS = [
  { id: 'nine', name: 'Nine-Panel', hint: '3 x 3 poster grid', slots: 9 },
  { id: 'four', name: 'Four-Panel', hint: '2 x 2 grid', slots: 4 },
  { id: 'hero3', name: 'Hero + Three', hint: 'Wide hero over three', slots: 4 },
  { id: 'full', name: 'Full Bleed', hint: 'One photo, edge to edge', slots: 1 },
  { id: 'tilt', name: 'Tilted Snap', hint: 'A print on a backdrop', slots: 2 },
  { id: 'triptych', name: 'Triptych', hint: 'Three tall panels', slots: 3 },
  { id: 'heroCaption', name: 'Hero + Caption', hint: 'Hero with a caption band', slots: 1 },
];

export const LAYOUT_IDS = LAYOUTS.map((layout) => layout.id);

const rect = (x, y, w, h, extra) => ({ x, y, w, h, kind: 'photo', ...extra });

/** The cream band between panels, in canvas pixels. */
export function panelGap(width, height) {
  return Math.max(2, Math.round(Math.min(width, height) * 0.011));
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
 * A panel may carry `rotate` (radians, around its centre) or `kind: 'caption'`.
 */
export function layoutPanels(id, area, gap) {
  switch (id) {
    case 'nine': {
      const out = [];
      for (const row of rows(area, 3, gap)) out.push(...columns(row, 3, gap));
      return out;
    }
    case 'four': {
      const out = [];
      for (const row of rows(area, 2, gap)) out.push(...columns(row, 2, gap));
      return out;
    }
    case 'hero3': {
      const heroH = (area.h - gap) * 0.585;
      const hero = rect(area.x, area.y, area.w, heroH);
      const below = columns(rect(area.x, area.y + heroH + gap, area.w, area.h - heroH - gap), 3, gap);
      return [hero, ...below];
    }
    case 'full':
      return [rect(area.x, area.y, area.w, area.h, { bleed: true })];
    case 'tilt': {
      const backdrop = rect(area.x, area.y, area.w, area.h);
      const snap = rect(
        area.x + area.w * 0.30,
        area.y + area.h * 0.24,
        area.w * 0.62,
        area.h * 0.64,
        { rotate: -0.055, snapshot: true },
      );
      return [backdrop, snap];
    }
    case 'triptych':
      return columns(area, 3, gap).map((r) => ({ ...r, tall: true }));
    case 'heroCaption': {
      const heroH = area.h * 0.735 - gap / 2;
      return [
        rect(area.x, area.y, area.w, heroH),
        rect(area.x, area.y + heroH + gap, area.w, area.h - heroH - gap, { kind: 'caption' }),
      ];
    }
    default:
      return layoutPanels('nine', area, gap);
  }
}

export function layoutById(id) {
  return LAYOUTS.find((layout) => layout.id === id) ?? LAYOUTS[0];
}
