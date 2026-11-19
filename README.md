# Neon Coast Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/basecil/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/basecil/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

A GTA-style cover-art studio for the [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) bounty: drop in a few photos and it turns them into a banded, inked, neon poster — then exports a PNG at whatever size you need. No build step, no network, no account: plain static files on a tiny Node server.

Competition entry: https://make.fun/bounty/gta6-cover-art-01

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. Pick photos with **Upload photos** (or drag an image onto any panel), choose a layout and a grade, edit the lettering, and hit **Export PNG** — the file lands in your downloads folder. **All 4 ↓** saves every size in one go.

## Features

- **7 layouts** — nine-panel grid, four-panel grid, hero-and-three, full bleed, tilted snap, triptych, and hero with a caption band.
- **6 gradient-map grades** — Vice Sunset, Neon Night, Palm Teal, Heat Haze, Mono Noir, Golden Hour; one palette across every panel.
- **4 export sizes** — 1080×1080 square, 1080×1350 portrait, 1920×1080 landscape, 1080×1920 story, each exported on its own or all at once.
- **Per-panel crops** — drag a panel to reposition, scroll to zoom, swap its photo, or re-center; every panel keeps its own crop.
- **Halftone lettering** — Anton title in white or sunset gradient, Pacifico neon script subtitle, editable footer and badge ribbon.
- **Undo / redo** — 60 steps of history on every edit, plus one-click shuffle and three named presets.
- **Heat meter** — a 1–5 star rating painted into the poster, next to the badge ribbon.
- **Poster finish** — inked and banded panel borders, film grain, and vignette, applied at export resolution.

## Screenshots

| | |
|---|---|
| `screenshots/1-cover.jpg` — landscape export, nine-panel, Vice Sunset | `screenshots/2-editor.jpg` — the editor |
| `screenshots/3-cover.jpg` — portrait export, hero-and-three, Neon Night | `screenshots/4-cover.jpg` — story export, tilted snap, Golden Hour |

Everything in `app/` is offline: fonts are vendored (Anton and Pacifico, OFL), the two sample photos ship with the app, and no request leaves the page at runtime.

## Layout

```
app/          the studio (index.html, style.css, src/, fonts/, samples/)
screenshots/  the four contact-sheet images
main.ts       copies app/ and screenshots/ to /output, writes dossier.json
serve.ts      local static server on :8080
vendor/       the make.fun dossier library (unmodified kit copy)
```

To build the submission bundle outside the grader's container:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

The make.fun dossier library and the sample photos are provided by the kit; fonts are under the SIL Open Font License (see `app/fonts/OFL-*.txt`). Everything else is original to this entry. See `LICENSE`.
