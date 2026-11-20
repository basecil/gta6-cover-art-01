# Midnight Vice

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/basecil/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/basecil/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

A night-first GTA-style cover studio for the [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) bounty: drop in a photo and it opens on a single full-bleed night poster — one image edge to edge with the title over the art — then lets you build a grid, a comic, or any of ten layouts and export a PNG at whatever size you need. No build step, no network, no account: plain static files on a tiny Node server.

Competition entry: https://make.fun/bounty/gta6-cover-art-01

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. Pick photos with **Upload photos** (or drag an image onto any panel), choose a layout and a grade, edit the lettering, and hit **Export PNG** — the file lands in your downloads folder. **All 4 ↓** saves every size in one go.

## Features

- **10 layouts** — full-bleed hero (the default), nine-panel grid, four-panel grid, hero-and-three, tilted snap, triptych, hero with a caption band, slashed comic, whole-cast grid, and slanted panels.
- **8 gradient-map grades** — Vice Sunset, Neon Night, Palm Teal, Heat Haze, Mono Noir, Golden Hour, **Midnight Neon** and **Afterdark Noir**; one palette across every panel, and every grade keeps faces on a warm skin band.
- **4 export sizes** — 1080×1080 square, 1080×1350 portrait, 1920×1080 landscape, 1080×1920 story, each exported on its own or all at once.
- **Per-panel crops** — drag a panel to reposition, scroll to zoom, swap its photo, or re-center; every panel keeps its own crop, and role tags print beside each panel.
- **Lettering** — Anton title in white, neon gradient, or **chrome 3D**, Pacifico neon script subtitle, editable footer and a badge ribbon reading **LEONIDA • EST. 2026**.
- **Night finish** — sky glow, poster ink frame, halftone title block, film grain and vignette, plus a **before/after** toggle that shows the original photo against the graded one.
- **Undo / redo** — 60 steps of history on every edit, plus one-click shuffle, a "Surprise me" per-panel shuffle and three named night presets.
- **Heat meter** — a 1–5 star rating painted into the poster, next to the badge ribbon.

## Screenshots

| | |
|---|---|
| `screenshots/1-cover.jpg` — landscape export, full-bleed hero, Midnight Neon | `screenshots/2-editor.jpg` — the editor |
| `screenshots/3-cover.jpg` — portrait export, full-bleed hero | `screenshots/4-cover.jpg` — story export, full-bleed hero |

Everything in `app/` is offline: fonts are vendored (Anton and Pacifico, OFL), the eight sample photos ship with the app under `app/assets/`, and no request leaves the page at runtime.

## Sample photo credits

The eight night sample photos in `app/assets/` were fetched at build time from [Openverse](https://api.openverse.org) (CC-licensed, no key) and are vendored so the app stays offline. Each keeps its licence:

| File | Title | Creator | Provider | Licence |
|---|---|---|---|---|
| `hero.jpg` | Portrait Chubby Jackson, Esquire Club | libraryofcongress | rawpixel | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `street.jpg` | Neon Street | Ethan Brooke | stocksnap | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `neon.jpg` | Free neon signs night Tokyo | — | rawpixel | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `beach.jpg` | Galaxy, starry beach night, rocks | — | rawpixel | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `car.jpg` | Car neon night city cyberpunk gliwice poland vehicle citroen | ijl92 | wordpress | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `palm.jpg` | Palm tree at night | slobtsov | wordpress | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `skyline.jpg` | 1 singapore f1 night race 2012 city skyline | chensiyuan | wikimedia | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `motel.jpg` | Vintage motel neon sign preserved | Carol M Highsmith | rawpixel | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |

## Layout

```
app/          the studio (index.html, style.css, src/, fonts/, assets/)
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

The make.fun dossier library is provided by the kit; fonts are under the SIL Open Font License (see `app/fonts/OFL-*.txt`); the eight sample photos keep the licences listed above. Everything else is original to this entry. See `LICENSE`.
