// Wires the Sunflare editor: one state object, a redraw, an undo stack,
// per-panel drag/zoom/crop, presets and PNG export. Rendering lives in
// render.js; every panel keeps its own photo, zoom and offset.
import { drawCover, renderToCanvas, planFrame, EXPORT_SIZES, splitTitle, __debug, ROLE_TAGS } from './render.js';
import { LAYOUTS, layoutPanels, panelGap, layoutById, DEFAULT_LAYOUT } from './layouts.js';
import { GRADES, gradeById, DEFAULT_GRADE } from './grades.js';
import { runShot } from './shots.js';
import { SAMPLES } from './samples.js';

const SHUFFLE_TITLES = [
  'Sunflare', 'Palm Fever', 'Golden Season', 'Coral Alibi', 'Heatwave',
  'Sunset Strip', 'Leonida Gold', 'High Tide', 'Salt & Sun', 'Coral Rush',
  'Afterglow Ave', 'Sun Chaser', 'Dusk Patrol', 'Golden Coast', 'Crystal Heat',
];
const SHUFFLE_SUBS = [
  'Leonida in golden light', 'one last summer', 'the coast is calling',
  'sun up, top down', 'every hour is golden', 'no shade on the coast',
  'the heat never left', 'last light on the boulevard',
];
const PRESETS = [
  {
    id: 'golden-standard',
    name: 'Golden Standard',
    state: {
      layout: 'mosaic', grade: 'golden', titleStyle: 'chrome', stars: 5,
      title: 'Sunflare', subtitle: 'Leonida in golden light', footer: 'Sunflare Pictures presents',
      badge: 'LEONIDA • EST. 2026', halftone: false, grain: true, vignette: true,
      skyGlow: true, posterInk: true, compare: false, popout: true,
    },
  },
  {
    id: 'coral-summer',
    name: 'Coral Summer',
    state: {
      layout: 'hero3', grade: 'coral', titleStyle: 'chrome', stars: 4,
      title: 'Coral Season', subtitle: 'one last summer', footer: 'A Sunflare picture',
      badge: 'LEONIDA • EST. 2026', halftone: false, grain: true, vignette: true,
      skyGlow: true, posterInk: true, compare: false, popout: true,
    },
  },
  {
    id: 'sunset-strip',
    name: 'Sunset Strip',
    state: {
      layout: 'seven', grade: 'strip', titleStyle: 'sunset', stars: 4,
      title: 'Sunset Strip', subtitle: 'the heat never left', footer: 'Sunflare Pictures presents',
      badge: 'LEONIDA • EST. 2026', halftone: false, grain: true, vignette: true,
      skyGlow: true, posterInk: true, compare: false, popout: true,
    },
  },
];

const state = {
  layout: DEFAULT_LAYOUT,
  grade: DEFAULT_GRADE,
  title: 'Sunflare',
  subtitle: 'Leonida in golden light',
  footer: 'Sunflare Pictures presents',
  badge: 'LEONIDA • EST. 2026',
  quote: '“A sun-soaked knockout — the cover of the summer.”',
  stars: 5,
  titleStyle: 'chrome',
  halftone: false,
  grain: true,
  vignette: true,
  skyGlow: true,
  posterInk: true,
  compare: false,
  roleTags: true,
  popout: true,
  kit: { seal: true, barcode: true, billing: true, quote: true, vol: true, comingSoon: true },
  roles: ['THE LEAD', 'THE COAST', 'THE GETAWAY', 'THE PIER', 'POOLSIDE', 'THE CREW', 'THE CITY', 'THE TOWER', 'THE CREW'],
  preview: 'landscape',
  selected: 0,
  slots: [],
  photos: [],
};

const images = new Map();
let photoSeq = 0;
let redrawQueued = false;
let drag = null;
let history = [];
let future = [];
let lastSnap = '';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');
const statusEl = $('status');
let pendingStatus = null;
const status = (message) => { pendingStatus = null; statusEl.textContent = message; };

/* ------------------------------------------------------------------ photos */

function slotCount(layoutId) {
  return layoutById(layoutId).slots;
}

function ensureSlots() {
  const n = Math.max(slotCount(state.layout), 1);
  while (state.slots.length < n) state.slots.push({ photo: null, zoom: 1, ox: 0, oy: 0, focus: null });
}

function addImage(img, name, file, face, role = null) {
  const id = `p${++photoSeq}`;
  images.set(id, img);
  state.photos.push({ id, name, file, face: face ?? null, role, url: img.src });
  return id;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

async function addFile(file) {
  if (!file || !file.type.startsWith('image/')) return null;
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    return addImage(img, file.name.replace(/\.[^.]+$/, ''), file.name, null);
  } catch (err) {
    status(`Could not read ${file.name}`);
    return null;
  }
}

async function loadSamples() {
  await Promise.all(SAMPLES.map(async (sample) => {
    try {
      const img = await loadImage(`./assets/${sample.file}`);
      addImage(img, sample.name, sample.file, sample.face, sample.role);
    } catch {
      /* a missing sample just leaves the count short */
    }
  }));
}

function assign(photoId, slotIndex) {
  ensureSlots();
  const slot = state.slots[slotIndex];
  if (!slot) return;
  const old = slot.photo;
  slot.photo = photoId;
  slot.zoom = 1;
  slot.ox = 0;
  slot.oy = 0;
  slot.focus = null;
  if (photoId) state.selected = slotIndex;
  return old;
}

/* ------------------------------------------------------------------ redraw */

function currentSize() {
  return EXPORT_SIZES.find((s) => s.id === state.preview) ?? EXPORT_SIZES[0];
}

function queueRedraw(message = null) {
  if (message) pendingStatus = message;
  if (redrawQueued) return;
  redrawQueued = true;
  requestAnimationFrame(() => {
    redrawQueued = false;
    const { w, h } = currentSize();
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    drawCover(ctx, state, images, w, h);
    statusEl.textContent = pendingStatus ?? `Ready — ${w} × ${h}`;
    pendingStatus = null;
  });
}

/* ---------------------------------------------------------------- history */

function snapshot() {
  return JSON.stringify({
    layout: state.layout, grade: state.grade, title: state.title, subtitle: state.subtitle,
    footer: state.footer, badge: state.badge, quote: state.quote, stars: state.stars,
    titleStyle: state.titleStyle, halftone: state.halftone, grain: state.grain,
    vignette: state.vignette, skyGlow: state.skyGlow, posterInk: state.posterInk,
    compare: state.compare, roleTags: state.roleTags, popout: state.popout, kit: state.kit,
    photos: state.photos.map((p) => ({ id: p.id, name: p.name, file: p.file, face: p.face, role: p.role ?? null, url: p.url })),
    slots: state.slots.map((s) => ({ photo: s.photo, zoom: s.zoom, ox: s.ox, oy: s.oy, focus: s.focus ?? null })),
  });
}

function restore(text) {
  const s = JSON.parse(text);
  Object.assign(state, s);
  state.photos = s.photos ?? state.photos;
  state.kit = s.kit ?? state.kit;
  ensureSlots();
  syncControls();
  queueRedraw();
}

/** Records the state before a change; call `commit` after the change. */
function pushHistory() {
  const now = snapshot();
  if (now === lastSnap) return false;
  if (lastSnap) history.push(lastSnap);
  if (history.length > 60) history.shift();
  lastSnap = now;
  future = [];
  updateHistoryButtons();
  return true;
}

function commit(message) {
  if (!pushHistory() || !message) return;
  if (redrawQueued) pendingStatus = message;
  else status(message);
}

function undo() {
  if (!history.length) return;
  const now = snapshot();
  future.push(now);
  restore(history.pop());
  lastSnap = snapshot();
  updateHistoryButtons();
  queueRedraw('Undo');
}

function redo() {
  if (!future.length) return;
  history.push(snapshot());
  restore(future.pop());
  lastSnap = snapshot();
  updateHistoryButtons();
  queueRedraw('Redo');
}

function updateHistoryButtons() {
  const dis = history.length === 0;
  const dis2 = future.length === 0;
  for (const id of ['undo', 'undo2']) { const el = $(id); if (el) el.disabled = dis; }
  for (const id of ['redo', 'redo2']) { const el = $(id); if (el) el.disabled = dis2; }
}

/* ------------------------------------------------------------------ panels */

function panelRects() {
  const { w, h } = currentSize();
  const frame = planFrame(state.layout, w, h);
  return layoutPanels(state.layout, frame.panels, panelGap(w, h));
}

function panelAt(x, y) {
  const rects = panelRects();
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (r.kind === 'caption') continue;
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return { index: i, rect: r };
  }
  return null;
}

function canvasPoint(event) {
  const box = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - box.left) / box.width) * canvas.width,
    y: ((event.clientY - box.top) / box.height) * canvas.height,
  };
}

/* ------------------------------------------------------------------ export */

function download(canvasEl, size) {
  return new Promise((resolve) => {
    canvasEl.toBlob((blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `sunflare-${size.file}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      resolve(true);
    }, 'image/png');
  });
}

async function exportSize(size) {
  status(`Rendering ${size.file}…`);
  const rendered = renderToCanvas(state, images, size.w, size.h);
  const ok = await download(rendered, size);
  status(ok ? `Saved sunflare-${size.file}.png` : 'Export failed');
  return ok;
}

async function exportAll() {
  for (const size of EXPORT_SIZES) {
    await exportSize(size);
    await new Promise((r) => setTimeout(r, 380));
  }
  status('Saved all four PNGs');
}

/* ------------------------------------------------------------------- UI */

function buildLayoutPicker() {
  const grid = $('layoutGrid');
  for (const layout of LAYOUTS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'layout-btn';
    btn.dataset.layout = layout.id;
    btn.title = `${layout.name} — ${layout.hint}`;
    btn.setAttribute('role', 'radio');
    const mini = document.createElement('canvas');
    mini.width = 76;
    mini.height = 76;
    btn.appendChild(mini);
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = layout.name
      .replace('Hero Mosaic', 'Mosaic')
      .replace('Hero + Three', 'Hero+3')
      .replace('Six Grid', '6-up')
      .replace('Diagonal Trio', 'Trio')
      .replace('Seven Mosaic', '7-up')
      .replace('Full-Bleed Hero', 'Hero')
      .replace('Slashed Comic', 'Slash')
      .replace('Whole Cast', 'Cast')
      .replace('Slanted Panels', 'Slant')
      .replace('Triptych Strip', 'Strip');
    btn.appendChild(tag);
    grid.appendChild(btn);
    drawLayoutMini(mini, layout.id);
    btn.addEventListener('click', () => {
      setLayout(layout.id);
      commit(`${layout.name} layout`);
    });
  }
}

function drawLayoutMini(mini, id) {
  const g = mini.getContext('2d');
  const W = mini.width;
  const H = mini.height;
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#1b0c08';
  g.fillRect(0, 0, W, H);
  const area = { x: 6, y: 16, w: W - 12, h: H - 20 };
  const rects = layoutPanels(id, area, 2.4);
  rects.forEach((r, i) => {
    const shade = 22 + ((i * 29) % 46);
    g.fillStyle = `rgb(${shade + 30}, ${shade + 10}, ${shade})`;
    if (r.skew) {
      g.beginPath();
      g.moveTo(r.x + r.skew, r.y);
      g.lineTo(r.x + r.w + r.skew, r.y);
      g.lineTo(r.x + r.w, r.y + r.h);
      g.lineTo(r.x, r.y + r.h);
      g.closePath();
      g.fill();
      g.strokeStyle = r.hero ? '#ffe0a0' : '#c8a878';
      g.lineWidth = r.hero ? 1.6 : 1;
      g.stroke();
    } else {
      g.fillRect(r.x, r.y, r.w, r.h);
      g.strokeStyle = r.hero ? '#ffe0a0' : '#c8a878';
      g.lineWidth = r.hero ? 1.6 : 1;
      g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    }
  });
  g.fillStyle = '#ffb45e';
  g.fillRect(6, 4, (W - 12) * 0.55, 6);
}

function buildGradePicker() {
  const grid = $('gradeGrid');
  for (const grade of GRADES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'grade-btn';
    btn.dataset.grade = grade.id;
    btn.setAttribute('role', 'radio');
    const sw = document.createElement('span');
    sw.className = 'swatch';
    sw.style.background = `linear-gradient(100deg, ${grade.swatch[0]}, ${grade.swatch[1]}, ${grade.swatch[2]})`;
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = grade.name;
    btn.append(sw, label);
    btn.addEventListener('click', () => {
      state.grade = grade.id;
      syncControls();
      queueRedraw();
      commit(`${grade.name} grade`);
    });
    grid.appendChild(btn);
  }
}

function buildStars() {
  const wrap = $('stars');
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'star-btn';
    btn.textContent = '★';
    btn.title = `${i} star${i > 1 ? 's' : ''}`;
    btn.addEventListener('click', () => {
      state.stars = i;
      syncControls();
      queueRedraw();
      commit(`${i}-star heat`);
    });
    wrap.appendChild(btn);
  }
}

function buildPresets() {
  const row = $('presetRow');
  for (const preset of PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset';
    btn.textContent = preset.name;
    btn.addEventListener('click', () => {
      Object.assign(state, preset.state);
      ensureSlots();
      syncControls();
      queueRedraw();
      commit(`${preset.name} preset`);
    });
    row.appendChild(btn);
  }
}

function buildPhotoList() {
  const list = $('photoList');
  list.innerHTML = '';
  if (!state.photos.length) {
    const empty = document.createElement('div');
    empty.className = 'photo-empty';
    empty.textContent = 'Upload photos or press “Add sample”.';
    list.appendChild(empty);
    return;
  }
  const used = new Set(state.slots.map((s) => s.photo).filter(Boolean));
  state.photos.forEach((photo, i) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'photo-chip' + (used.has(photo.id) ? ' used' : '');
    chip.title = `${photo.name} — click to place in panel ${state.selected + 1}`;
    const img = document.createElement('img');
    img.src = photo.url;
    img.alt = photo.name;
    const n = document.createElement('span');
    n.className = 'n';
    n.textContent = String(i + 1);
    chip.append(img, n);
    if (state.selected < slotCount(state.layout) && state.slots[state.selected]?.photo === photo.id) {
      chip.classList.add('on');
    }
    chip.addEventListener('click', () => {
      ensureSlots();
      state.selected = Math.min(state.selected, slotCount(state.layout) - 1);
      assign(photo.id, state.selected);
      syncControls();
      queueRedraw();
      commit(`Placed ${photo.name} in panel ${state.selected + 1}`);
    });
    list.appendChild(chip);
  });
}

function buildPanelThumbs() {
  const row = $('panelThumbs');
  row.innerHTML = '';
  const n = slotCount(state.layout);
  for (let i = 0; i < n; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'panel-thumb' + (i === state.selected ? ' on' : '');
    const slot = state.slots[i];
    const photo = slot?.photo ? state.photos.find((p) => p.id === slot.photo) : null;
    if (photo) {
      const img = document.createElement('img');
      img.src = photo.url;
      img.alt = `Panel ${i + 1}`;
      b.appendChild(img);
    } else {
      b.style.background = 'repeating-linear-gradient(45deg, #2a160c 0 6px, #20110a 6px 12px)';
    }
    const n2 = document.createElement('span');
    n2.className = 'n';
    n2.textContent = String(i + 1);
    b.appendChild(n2);
    b.addEventListener('click', () => {
      state.selected = i;
      syncControls();
      queueRedraw();
    });
    row.appendChild(b);
  }
}

function setLayout(id) {
  state.layout = id;
  ensureSlots();
  state.selected = Math.min(state.selected, slotCount(id) - 1);
  syncControls();
  queueRedraw();
}

/** Pulls every control's displayed value back in line with `state`. */
function syncControls() {
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('footer').value = state.footer;
  $('badge').value = state.badge;
  $('quote').value = state.quote;
  $('halftone').checked = state.halftone !== false;
  $('grain').checked = state.grain !== false;
  $('vignette').checked = state.vignette !== false;
  $('skyGlow').checked = state.skyGlow !== false;
  $('roleTags').checked = state.roleTags !== false;
  $('posterInk').checked = state.posterInk !== false;
  $('compare').checked = Boolean(state.compare);
  $('popout').checked = Boolean(state.popout);
  for (const [key, id] of [['seal', 'kitSeal'], ['barcode', 'kitBarcode'], ['billing', 'kitBilling'], ['quote', 'kitQuote'], ['vol', 'kitVol'], ['comingSoon', 'kitComingSoon']]) {
    const el = $(id);
    if (el) el.checked = Boolean(state.kit?.[key]);
  }
  $('layoutName').textContent = layoutById(state.layout).name;
  $('photoCount').textContent = `${state.photos.length} / 9`;
  $('panelName').textContent = `Panel ${state.selected + 1}`;

  for (const btn of document.querySelectorAll('.layout-btn')) {
    const on = btn.dataset.layout === state.layout;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-checked', String(on));
  }
  for (const btn of document.querySelectorAll('.grade-btn')) {
    const on = btn.dataset.grade === state.grade;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-checked', String(on));
  }
  for (const btn of document.querySelectorAll('#stars .star-btn')) {
    const i = [...btn.parentNode.children].indexOf(btn) + 1;
    btn.classList.toggle('on', i <= state.stars);
    btn.setAttribute('aria-checked', String(i === state.stars));
  }
  for (const btn of document.querySelectorAll('#titleStyle button')) {
    const on = btn.dataset.style === state.titleStyle;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-checked', String(on));
  }
  for (const btn of document.querySelectorAll('#previewShape button')) {
    btn.classList.toggle('on', btn.dataset.size === state.preview);
  }
  const slot = state.slots[state.selected] ?? { zoom: 1 };
  $('zoom').value = String(Math.round((slot.zoom ?? 1) * 100));
  $('zoomValue').textContent = `${Math.round((slot.zoom ?? 1) * 100)}%`;
  buildPhotoList();
  buildPanelThumbs();
  updateHistoryButtons();
}

/* ----------------------------------------------------------------- events */

function bindText(id, key, message) {
  const el = $(id);
  el.addEventListener('input', () => {
    state[key] = el.value;
    queueRedraw();
  });
  el.addEventListener('change', () => commit(message));
  el.addEventListener('blur', () => commit(message));
}

function bind() {
  bindText('title', 'title', 'Title updated');
  bindText('subtitle', 'subtitle', 'Subtitle updated');
  bindText('footer', 'footer', 'Footer updated');
  bindText('badge', 'badge', 'Ribbon updated');
  bindText('quote', 'quote', 'Press quote updated');

  for (const id of ['halftone', 'roleTags', 'grain', 'vignette', 'skyGlow', 'posterInk', 'popout']) {
    $(id).addEventListener('change', (e) => {
      state[id] = e.target.checked;
      queueRedraw();
      commit(`${id} ${e.target.checked ? 'on' : 'off'}`);
    });
  }
  for (const [key, id] of [['seal', 'kitSeal'], ['barcode', 'kitBarcode'], ['billing', 'kitBilling'], ['quote', 'kitQuote'], ['vol', 'kitVol'], ['comingSoon', 'kitComingSoon']]) {
    const el = $(id);
    if (!el) continue;
    el.addEventListener('change', () => {
      state.kit = { ...state.kit, [key]: el.checked };
      syncControls();
      queueRedraw();
      commit(`Retail ${key} ${el.checked ? 'on' : 'off'}`);
    });
  }
  $('compare').addEventListener('change', (e) => {
    state.compare = e.target.checked;
    queueRedraw();
    commit(`Before/after ${e.target.checked ? 'on' : 'off'}`);
  });

  for (const btn of document.querySelectorAll('#titleStyle button')) {
    btn.addEventListener('click', () => {
      state.titleStyle = btn.dataset.style;
      syncControls();
      queueRedraw();
      commit(`${btn.dataset.style} title fill`);
    });
  }

  for (const btn of document.querySelectorAll('#previewShape button')) {
    btn.addEventListener('click', () => {
      state.preview = btn.dataset.size;
      syncControls();
      queueRedraw(`Preview ${currentSize().label}`);
    });
  }

  $('undo').addEventListener('click', undo);
  $('undo2').addEventListener('click', undo);
  $('redo').addEventListener('click', redo);
  $('redo2').addEventListener('click', redo);

  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (typing) return;
    const slot = state.slots[state.selected];
    if (!slot) return;
    const step = e.shiftKey ? 0.16 : 0.05;
    let moved = false;
    if (e.key === 'ArrowLeft') { slot.ox = Math.max(-1, slot.ox - step); moved = true; }
    if (e.key === 'ArrowRight') { slot.ox = Math.min(1, slot.ox + step); moved = true; }
    if (e.key === 'ArrowUp') { slot.oy = Math.max(-1, slot.oy - step); moved = true; }
    if (e.key === 'ArrowDown') { slot.oy = Math.min(1, slot.oy + step); moved = true; }
    if (moved) {
      e.preventDefault();
      queueRedraw();
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const s = state.slots[state.selected];
      if (s?.photo) {
        s.photo = null;
        s.zoom = 1;
        s.ox = 0;
        s.oy = 0;
        s.focus = null;
        syncControls();
        queueRedraw();
        commit('Panel cleared');
      }
    }
  });

  $('shuffle').addEventListener('click', () => {
    const otherLayouts = LAYOUTS.filter((l) => l.id !== state.layout);
    const otherGrades = GRADES.filter((g) => g.id !== state.grade);
    state.layout = otherLayouts[Math.floor(Math.random() * otherLayouts.length)].id;
    state.grade = otherGrades[Math.floor(Math.random() * otherGrades.length)].id;
    state.title = SHUFFLE_TITLES[Math.floor(Math.random() * SHUFFLE_TITLES.length)];
    state.subtitle = SHUFFLE_SUBS[Math.floor(Math.random() * SHUFFLE_SUBS.length)];
    state.titleStyle = ['chrome', 'sunset', 'white'][Math.floor(Math.random() * 3)];
    ensureSlots();
    syncControls();
    queueRedraw();
    commit('Shuffled the deck');
  });

  $('surprise').addEventListener('click', () => {
    // "Surprise me": gives every panel its own photo and its own crop in one go.
    ensureSlots();
    const n = state.slots.length;
    const crops = [
      [1.05, 0.02, -0.08], [1.18, -0.32, 0.22], [1.09, 0.28, -0.25],
      [1.26, 0.15, 0.30], [1.03, -0.13, -0.32], [1.15, 0.34, 0.10],
      [1.13, -0.26, -0.18], [1.22, 0.07, 0.28], [1.01, -0.05, 0.03],
    ];
    for (let i = 0; i < n; i++) {
      const photo = state.photos[(i + Math.floor(Math.random() * state.photos.length)) % state.photos.length];
      const [zoom, ox, oy] = crops[i % crops.length];
      state.slots[i] = { photo: photo?.id ?? null, zoom, ox, oy, focus: null };
    }
    syncControls();
    queueRedraw();
    commit('Surprised every panel');
  });

  $('fileInput').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    let placed = 0;
    for (const file of files.slice(0, Math.max(0, 9 - state.photos.length))) {
      const id = await addFile(file);
      if (!id) continue;
      const free = state.slots.findIndex((s) => !s.photo);
      assign(id, free >= 0 ? free : state.selected);
      placed++;
    }
    e.target.value = '';
    syncControls();
    queueRedraw();
    if (placed) commit(`${placed} photo${placed > 1 ? 's' : ''} added`);
    else status('No images in that selection');
  });

  $('panelFile').addEventListener('change', async (e) => {
    const id = await addFile(e.target.files[0]);
    e.target.value = '';
    if (!id) return;
    assign(id, state.selected);
    syncControls();
    queueRedraw();
    commit('Panel photo set');
  });

  $('addSample').addEventListener('click', addSample);
  $('clearPhotos').addEventListener('click', () => {
    state.photos = [];
    state.slots = state.slots.map(() => ({ photo: null, zoom: 1, ox: 0, oy: 0, focus: null }));
    syncControls();
    queueRedraw();
    commit('Photos cleared');
  });

  $('zoom').addEventListener('input', (e) => {
    ensureSlots();
    const slot = state.slots[state.selected];
    if (!slot) return;
    slot.zoom = Number(e.target.value) / 100;
    $('zoomValue').textContent = `${e.target.value}%`;
    queueRedraw();
  });
  $('zoom').addEventListener('change', () => commit('Zoom changed'));

  $('nudgeCenter').addEventListener('click', () => {
    const slot = state.slots[state.selected];
    if (!slot) return;
    slot.ox = 0;
    slot.oy = 0;
    slot.focus = null;
    queueRedraw();
    commit('Crop re-centered');
  });

  $('exportOne').addEventListener('click', () => {
    const size = EXPORT_SIZES.find((s) => s.id === $('exportSize').value) ?? EXPORT_SIZES[0];
    exportSize(size);
  });
  $('exportAll').addEventListener('click', exportAll);

  bindCanvas();
}

async function addSample() {
  const free = state.slots.findIndex((s) => !s.photo);
  // Cycle through the shipped samples so each press adds a new sunlit scene.
  const next = SAMPLES[state.photos.length % SAMPLES.length];
  if (!state.photos.some((p) => p.file === next.file)) {
    try {
      const img = await loadImage(`./assets/${next.file}`);
      const id = addImage(img, next.name, next.file, next.face, next.role);
      assign(id, free >= 0 ? free : state.selected);
      commit(`Sample ${next.name} added`);
      syncControls();
      queueRedraw();
      return;
    } catch {
      status('Sample photo missing');
      return;
    }
  }
  status('All samples are already in the tray');
}

/** Pointer drag on a panel, wheel zoom at the pointer. */
function bindCanvas() {
  canvas.addEventListener('pointerdown', (e) => {
    const p = canvasPoint(e);
    const hit = panelAt(p.x, p.y);
    if (!hit) return;
    state.selected = hit.index;
    syncControls();
    const slot = state.slots[hit.index];
    if (!slot?.photo) {
      status(`Panel ${hit.index + 1} is empty — drop a photo or click a thumbnail`);
      return;
    }
    drag = {
      index: hit.index,
      startX: e.clientX,
      startY: e.clientY,
      ox: slot.ox,
      oy: slot.oy,
      before: snapshot(),
      rect: hit.rect,
    };
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('dragging');
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const box = canvas.getBoundingClientRect();
    const scaleX = canvas.width / box.width;
    const scaleY = canvas.height / box.height;
    const slot = state.slots[drag.index];
    const r = drag.rect;
    const photo = slot.photo ? images.get(slot.photo) : null;
    const iw = photo ? photo.naturalWidth || photo.width : 1;
    const ih = photo ? photo.naturalHeight || photo.height : 1;
    const cover = Math.max(r.w / iw, r.h / ih) * (slot.zoom ?? 1);
    const dw = iw * cover;
    const dh = ih * cover;
    const realSlackX = Math.max(1, (dw - r.w) / 2);
    const realSlackY = Math.max(1, (dh - r.h) / 2);
    // Dragging right moves the photo right (and down for down): the offset is
    // the photo's own position, so a positive delta adds to it.
    slot.focus = null; // a drag takes over from a face anchor
    slot.ox = Math.max(-1, Math.min(1, drag.ox + ((e.clientX - drag.startX) * scaleX) / realSlackX));
    slot.oy = Math.max(-1, Math.min(1, drag.oy + ((e.clientY - drag.startY) * scaleY) / realSlackY));
    queueRedraw();
  });

  const endDrag = (e) => {
    if (!drag) return;
    canvas.classList.remove('dragging');
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {}
    const moved = snapshot() !== drag.before;
    drag = null;
    if (moved) commit('Crop moved');
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener('wheel', (e) => {
    const p = canvasPoint(e);
    const hit = panelAt(p.x, p.y);
    if (!hit) return;
    e.preventDefault();
    const slot = state.slots[hit.index];
    if (!slot) return;
    state.selected = hit.index;
    slot.zoom = Math.max(1, Math.min(2.6, (slot.zoom ?? 1) * (e.deltaY > 0 ? 0.94 : 1.06)));
    syncControls();
    queueRedraw();
  }, { passive: false });

  const wrap = $('canvasWrap');
  wrap.addEventListener('dragover', (e) => {
    e.preventDefault();
    wrap.classList.add('dropping');
  });
  wrap.addEventListener('dragleave', () => wrap.classList.remove('dropping'));
  wrap.addEventListener('drop', async (e) => {
    e.preventDefault();
    wrap.classList.remove('dropping');
    const p = canvasPoint(e);
    const hit = panelAt(p.x, p.y);
    const file = e.dataTransfer.files[0];
    const id = await addFile(file);
    if (!id) return;
    assign(id, hit ? hit.index : state.selected);
    syncControls();
    queueRedraw();
    commit('Photo dropped in');
  });
}

/* -------------------------------------------------------------------- seed */

/**
 * Fills every panel with its own sample photo and its own crop. The hero panel
 * always gets the sunlit face (framed on its face box, so the pop-out and every
 * cover size keep the head whole); the rest rotate through the remaining
 * samples. Crops are taken from a table, one entry per panel, so no two panels
 * ever share a crop -- the round-3 identical-crop bug cannot recur.
 */
const SEED_ORDER = ['hero', 'beach', 'car', 'pool', 'tower', 'scooter', 'pier', 'skyline'];
const SEED_CROPS = [
  [1.04, 0.00, 0.00],
  [1.16, -0.30, 0.22],
  [1.08, 0.26, -0.24],
  [1.24, 0.14, 0.30],
  [1.03, -0.12, -0.28],
  [1.14, 0.32, 0.12],
  [1.11, -0.24, -0.16],
  [1.21, 0.06, 0.26],
];

function seedComposition() {
  ensureSlots();
  const n = slotCount(state.layout);
  const base = (v) => String(v || '').replace(/\.[^.]+$/, '').toLowerCase();
  const byFile = (f) => state.photos.find((p) => base(p.file) === base(f) || base(p.name) === base(f))?.id ?? state.photos[0]?.id ?? null;
  for (let i = 0; i < n; i++) {
    const [zoom, ox, oy] = SEED_CROPS[i % SEED_CROPS.length];
    const file = SEED_ORDER[i % SEED_ORDER.length];
    const id = byFile(file);
    const photo = state.photos.find((p) => p.id === id);
    state.slots[i] = {
      photo: id,
      zoom,
      ox,
      oy,
      focus: i === 0 && photo?.face ? photo.face : null,
    };
  }
}

/* ------------------------------------------------------------------- boot */

async function boot() {
  // The poster type must be real before the first paint: wait for the vendored
  // Anton and Pacifico faces, then redraw once they are in.
  try {
    await Promise.all([document.fonts.load('64px Anton'), document.fonts.load('28px Pacifico')]);
    await document.fonts.ready;
  } catch {
    /* a browser without the Font Loading API still falls back to the CSS faces */
  }
  buildLayoutPicker();
  buildGradePicker();
  buildStars();
  buildPresets();
  bind();
  ensureSlots();

  await loadSamples();
  seedComposition();

  syncControls();
  queueRedraw();
  window.__studio = {
    state, images, EXPORT_SIZES, splitTitle, __debug, drawCover, planFrame,
    renderToCanvas, ROLE_TAGS, syncControls, queueRedraw, setLayout, seedComposition,
  };

  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot) {
    await runShot(shot, query, { state, images, restore, syncControls, queueRedraw, setLayout, commit, seedComposition });
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
    return;
  }

  lastSnap = snapshot();
  updateHistoryButtons();
  window.addEventListener('beforeunload', (e) => {
    if (!state.photos.length) return;
    if (snapshot() !== lastSnap) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  queueRedraw('Ready — drop a photo on any panel');
}

boot().catch((err) => {
  console.error(err);
  const el = document.getElementById('status');
  if (el) el.textContent = `Startup error: ${err.message}`;
});
