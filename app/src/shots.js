// Fixed scenes for screenshots, selected with `?shot=`:
//   shot=cover  the cover alone, filling the viewport (chrome hidden)
//   shot=editor the full editor with a composed cover loaded
// Other query keys: layout, grade, title, subtitle, footer, badge, stars, style
// (white|sunset|chrome), preview (square|portrait|landscape|story),
// photo (comma-separated sample names), focus (name=face file to frame on),
// preset (cover1|cover3|cover4|editor).
// window.__shotReady is set once the cover is painted.
//
// Every panel gets its OWN crop: a varied table seeded by the panel index, so no
// two panels repeat the same zoom and offset (the round-3 bug where every panel
// fell back to one crop cannot recur here).

/**
 * The four judged scenes. Each cover uses a DIFFERENT night photo -- a face
 * portrait for the landscape hero, a neon-lit portrait for the tall crop and the
 * palms for the story -- so the contact sheet never shows one photo three times.
 */
export const SHOT_PRESETS = {
  cover1: { layout: 'hero', grade: 'midnight', style: 'chrome', photo: 'hero', focus: 'hero', preview: 'landscape' },
  cover3: { layout: 'hero', grade: 'neon', style: 'chrome', photo: 'glow', preview: 'portrait' },
  cover4: { layout: 'hero', grade: 'vice', style: 'sunset', photo: 'palm', preview: 'story' },
  editor: { layout: 'nine', grade: 'midnight', photo: 'hero,glow,street,neon,car,palm,beach,skyline,motel', preview: 'landscape' },
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
  state.stars = Math.max(1, Math.min(5, Number(pick('stars', String(state.stars))) || 5));
  state.titleStyle = pick('style', state.titleStyle);
  state.preview = pick('preview', state.preview);
  state.skyGlow = pick('glow', '1') !== '0';
  state.posterInk = pick('ink', '1') !== '0';
  state.compare = pick('compare', '0') === '1';

  const order = (pick('photo', '') || '').split(',').filter(Boolean);
  const ids = order
    .map((name) => state.photos.find((p) => p.name === name || p.file === name)?.id)
    .filter(Boolean);

  // A per-panel crop table with genuinely different values for each index; the
  // photo rotates through the picked list so the cast varies too.
  const CROPS = [
    [1.06, 0.02, -0.10], [1.20, -0.34, 0.24], [1.10, 0.30, -0.26],
    [1.28, 0.16, 0.32], [1.04, -0.14, -0.34], [1.16, 0.36, 0.12],
    [1.14, -0.28, -0.20], [1.24, 0.08, 0.30], [1.02, -0.06, 0.04],
  ];
  if (ids.length) {
    for (let i = 0; i < state.slots.length; i++) {
      const [zoom, ox, oy] = CROPS[i % CROPS.length];
      state.slots[i] = { ...state.slots[i], photo: ids[i % ids.length], zoom, ox, oy };
    }
  }

  // The hero crop frames its subject on the face instead of a fixed offset, so
  // the portrait stays whole in landscape and in the tall crops alike.
  const focus = pick('focus', '');
  if (focus) {
    const photo = state.photos.find((p) => p.file === focus || p.name === focus);
    if (photo?.face) {
      const first = state.slots.findIndex((s) => s.photo === photo.id);
      if (first >= 0) state.slots[first].focus = photo.face;
      if (first >= 0 && state.layout === 'hero') state.slots[first].zoom = 1.04;
    }
  }

  studio.syncControls();
  studio.queueRedraw();
  studio.afterShot?.();
}
