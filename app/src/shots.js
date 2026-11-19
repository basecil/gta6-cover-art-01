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
    const TABLES = {
      nine: [ // [photoIdx, zoom, ox, oy] — non-alternating, varied
        [0, 1.10,  0.30, -0.20], [0, 1.02,  0.05,  0.10], [0, 1.22, -0.28,  0.18],
        [1, 1.16,  0.22, -0.30], [1, 1.30, -0.12,  0.26], [1, 1.06,  0.34,  0.05],
        [0, 1.26, -0.20,  0.30], [1, 1.12,  0.10, -0.22], [0, 1.36,  0.28, -0.30],
      ],
      hero3: [[1, 1.06, 0.00, -0.78], [0, 1.18, 0.24, -0.10], [1, 1.12, -0.20, 0.12], [0, 1.22, 0.10, 0.16]],
      tilt:  [[1, 1.00, 0.00, 0.00], [0, 1.24, 0.32, -0.24]],
      four:  [[0, 1.14, 0.20, -0.18], [1, 1.06, -0.18, 0.14], [1, 1.20, 0.26, 0.20], [0, 1.02, -0.10, -0.06]],
      triptych: [[1, 1.18, 0.20, -0.26], [0, 1.08, -0.16, 0.10], [1, 1.28, 0.28, 0.24]],
    };
    const table = TABLES[pick('layout', 'nine')] ?? TABLES.nine;
    for (let i = 0; i < state.slots.length; i++) {
      const [pi, zoom, ox, oy] = table[i % table.length];
      state.slots[i] = { photo: ids[pi % ids.length], zoom, ox, oy };
    }
  }

  studio.syncControls();
  studio.queueRedraw();
  studio.afterShot?.();
}
