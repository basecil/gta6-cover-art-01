// Fixed scenes for screenshots, selected with `?shot=`:
//   shot=cover  the cover alone, filling the viewport (chrome hidden)
//   shot=editor the full editor with a composed cover loaded
// Other query keys: layout, grade, title, subtitle, footer, badge, quote,
// stars, style (white|sunset|chrome), preview (square|portrait|landscape|story),
// photo (comma-separated sample files), popout (1|0), preset (cover1|cover3|cover4|editor).
// window.__shotReady is set once the cover is painted.
//
// Every panel gets its OWN crop: a varied table seeded by the panel index, so no
// two panels repeat the same zoom and offset (the round-3 bug where every panel
// fell back to one crop cannot recur here).

/**
 * The four judged scenes, all golden hour: the landscape cover is the hero
 * mosaic (the app's own default) with the sunlit hero popped out over its panel
 * while the title still paints on top; the tall crops restack the same cast so
 * the contact sheet never shows one photo three times.
 */
export const SHOT_PRESETS = {
  cover1: { layout: 'mosaic', grade: 'golden', style: 'chrome', preview: 'landscape', popout: true, photo: 'hero,beach,car,pool,tower' },
  cover3: { layout: 'mosaic', grade: 'coral', style: 'chrome', preview: 'portrait', popout: true, photo: 'hero,tower,scooter,skyline,pier' },
  cover4: { layout: 'hero3', grade: 'strip', style: 'chrome', preview: 'story', popout: true, photo: 'hero,scooter,pier,city,beach' },
  editor: { layout: 'mosaic', grade: 'golden', style: 'chrome', preview: 'landscape', popout: true, photo: 'hero,beach,car,pool,tower' },
};

export async function runShot(shot, query, studio) {
  const { state } = studio;
  const preset = SHOT_PRESETS[query.get('preset')] ?? {};
  const pick = (key, fallback) => query.get(key) ?? preset[key] ?? fallback;

  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'editor') document.body.classList.add('shot-editor');

  studio.setLayout(pick('layout', state.layout));
  state.grade = pick('grade', state.grade);
  state.title = pick('title', state.title);
  state.subtitle = pick('subtitle', state.subtitle);
  state.footer = pick('footer', state.footer);
  state.badge = pick('badge', state.badge);
  state.quote = pick('quote', state.quote);
  state.stars = Math.max(1, Math.min(5, Number(pick('stars', String(state.stars))) || 5));
  state.titleStyle = pick('style', state.titleStyle);
  state.preview = pick('preview', state.preview);
  state.skyGlow = pick('glow', '1') !== '0';
  state.posterInk = pick('ink', '1') !== '0';
  state.compare = pick('compare', '0') === '1';
  state.popout = pick('popout', '1') !== '0';

  const order = (pick('photo', '') || '').split(',').filter(Boolean);
  const base = (v) => String(v || '').replace(/\.[^.]+$/, '').toLowerCase();
  const ids = order
    .map((name) => state.photos.find((p) => base(p.file) === base(name) || base(p.name) === base(name))?.id)
    .filter(Boolean);

  // A per-panel crop table with genuinely different values for each index; the
  // photo rotates through the picked list so the cast varies too.
  const CROPS = [
    [1.04, 0.00, 0.00], [1.19, -0.34, 0.24], [1.09, 0.30, -0.26],
    [1.27, 0.16, 0.32], [1.04, -0.14, -0.34], [1.16, 0.36, 0.12],
    [1.13, -0.28, -0.20], [1.24, 0.08, 0.30], [1.02, -0.06, 0.04],
  ];
  if (ids.length) {
    for (let i = 0; i < state.slots.length; i++) {
      const [zoom, ox, oy] = CROPS[i % CROPS.length];
      state.slots[i] = { ...state.slots[i], photo: ids[i % ids.length], zoom, ox, oy, focus: null };
    }
    // The hero frame (panel 0 in every hero layout) keeps its whole face.
    const heroPhoto = state.photos.find((p) => p.id === ids[0]);
    if (heroPhoto?.face && state.slots[0]) {
      state.slots[0].focus = heroPhoto.face;
      state.slots[0].zoom = 1.04;
    }
  }

  studio.syncControls();
  studio.queueRedraw();
  studio.afterShot?.();
}
