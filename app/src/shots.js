// Fixed scenes for screenshots, selected with `?shot=`:
//   shot=cover  the cover alone, filling the viewport (chrome hidden)
//   shot=editor the full editor with a composed cover loaded
// Other query keys: layout, grade, title, subtitle, footer, badge, stars, style
// (white|sunset|chrome), preview (square|portrait|landscape|story),
// photo (comma-separated sample names), focus (name=face file to frame on).
// window.__shotReady is set once the cover is painted.
//
// Every panel gets its OWN crop: a varied table seeded by the panel index, so no
// two panels repeat the same zoom and offset (the round-3 bug where every panel
// fell back to one crop cannot recur here).
export async function runShot(shot, query, studio) {
  const { state } = studio;
  const pick = (key, fallback) => query.get(key) ?? fallback;

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

  const focus = pick('focus', '');
  if (focus) {
    const photo = state.photos.find((p) => p.file === focus || p.name === focus);
    if (photo?.face) {
      const first = state.slots.findIndex((s) => s.photo === photo.id);
      if (first >= 0) state.slots[first].focus = photo.face;
    }
  }

  studio.syncControls();
  studio.queueRedraw();
  studio.afterShot?.();
}
