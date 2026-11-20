# Sunflare

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/basecil/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/basecil/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

A golden-hour GTA-style cover studio for the [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) bounty: drop in a photo and it opens on a hero-mosaic key-art poster — five slanted panels with one dominant sunlit face, the striped-chrome title over the art, and the hero cut out in front of it — then lets you build a grid, a comic, a triptych or any of ten layouts and export a PNG at whatever size you need. No build step, no network, no account: plain static files on a tiny Node server.

Competition entry: https://make.fun/bounty/gta6-cover-art-01

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. The eight sunlit sample photos load on open; pick your own with **Upload photos** (or drag an image onto any panel), choose a layout and a grade, edit the lettering, and hit **Export PNG** — the file lands in your downloads folder. **All 4 ↓** saves every size in one go.

## Features

- **10 layouts** — hero mosaic, five slanted panels with one dominant hero (the default), hero-and-three, six grid, diagonal trio, seven mosaic, full-bleed hero, slashed comic, whole-cast grid, slanted panels and triptych strip.
- **8 sun-tuned grades** — Golden Hour (the default), Coral Dusk, Vice Sunset, Sunset Strip, Heatwave, Palm Teal, Neon Night and Mono Noir; one palette across every panel, and every grade keeps faces on a warm skin band.
- **Striped-chrome lettering** — Anton title in a cream→yellow→orange gradient with magenta and purple stripes through the lower half, a thick dark outline and a sparkle, set **over** the art; a hot-pink Pacifico script subtitle overlaps the title base; editable title, subtitle, footer, badge ribbon and press quote.
- **Retail kit** — gold starburst seal ("ORIGINAL COVER ART ★★★"), barcode, billing block ("A SUNFLARE PICTURES PRODUCTION · STARRING YOU"), a five-star press quote, a **VOL. 1** ticket tab and a **COMING SOON** line; every piece is its own toggle and all are on by default.
- **Pop-out hero** — cuts the hero out larger than its panel and sets it **in front of** the title; on by default in the hero-mosaic layout.
- **4 export sizes** — 1080×1080 square, 1080×1350 portrait, 1920×1080 landscape, 1080×1920 story, each exported on its own or all at once.
- **Per-panel crops** — drag a panel to reposition, scroll to zoom, swap its photo, or re-center; every panel keeps its own crop, and role tags print beside each panel.
- **Golden finish** — sky glow, poster ink frame, optional halftone plate, film grain and vignette, plus a **before/after** toggle that shows the original photo against the graded one.
- **Undo / redo** — 60 steps of history on every edit, plus one-click shuffle, a "Surprise me" per-panel shuffle and three named sun presets: **Golden Standard**, **Coral Summer** and **Sunset Strip**.
- **Heat meter** — a 1–5 star rating painted into the poster's retail band.

## Screenshots

| | |
|---|---|
| `screenshots/1-cover.jpg` — landscape export, hero mosaic, Golden Hour | `screenshots/2-editor.jpg` — the editor |
| `screenshots/3-cover.jpg` — portrait export, hero mosaic | `screenshots/4-cover.jpg` — story export |

Everything in `app/` is offline: fonts are vendored (Anton and Pacifico, OFL), the eight sample photos ship with the app under `app/assets/`, and no request leaves the page at runtime.

## Sample photo credits

The eight golden-hour sample photos in `app/assets/` were fetched at build time from [Openverse](https://api.openverse.org) (CC-licensed, no key) and are vendored so the app stays offline. Each keeps its licence:

| File | Title | Creator | Licence |
|---|---|---|---|
| `hero.jpg` | Woman Beach | Matt Moloney | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `beach.jpg` | Fisherman at Muzhappilangad Beach | Shagil Kannur | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `car.jpg` | 1974 Dodge Charger Rallye | George | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) |
| `pier.jpg` | Sunset Fishing Pier, Lake Brownwood | Larry D. Moore | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `pool.jpg` | Swimming Pool | Michael Burridge | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `scooter.jpg` | Scooter skates | libraryofcongress | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `skyline.jpg` | Pinelands Sunrise | National Park Service | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `tower.jpg` | Huntington Beach Lifeguard Tower at Sunset | Jsalatas | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |

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
