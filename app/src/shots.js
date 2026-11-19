// Fixed scenes for screenshots, selected with `?shot=`:
//   shot=cover  the cover alone, filling the viewport (chrome hidden)
//   shot=editor the full editor with a composed cover loaded
// Other query keys: layout, grade, title, subtitle, footer, badge, stars, style
// (white|sunset), preview (square|portrait|landscape|story), photo (sample name).
// window.__shotReady is set once the cover is painted.
export async function runShot(shot, query, studio) {
  const { state } = studio;
  const pick = (key, fallback) => query.get(key) ?? fallback;

  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'editor') document.body.classList.add('shot-editor');

  studio.setLayout(pick('layout', 'nine'));
  state.grade = pick('grade', 'vice');
  state.title = pick('title', state.title);
  state.subtitle = pick('subtitle', state.subtitle);
  state.footer = pick('footer', state.footer);
  state.badge = pick('badge', state.badge);
  state.stars = Math.max(1, Math.min(5, Number(pick('stars', String(state.stars))) || 5));
  state.titleStyle = pick('style', state.titleStyle);
  state.preview = pick('preview', state.preview);

  const order = (pick('photo', 'boulevard,pier') || '').split(',').filter(Boolean);
  const ids = order
    .map((name) => state.photos.find((p) => p.name === name)?.id)
    .filter(Boolean);
  if (ids.length) {
    const n = state.slots.length;
    for (let i = 0; i < n; i++) {
      state.slots[i] = { photo: ids[i % ids.length], zoom: 1, ox: 0, oy: 0 };
    }
  }

  studio.syncControls();
  studio.queueRedraw();
  studio.afterShot?.();
}
