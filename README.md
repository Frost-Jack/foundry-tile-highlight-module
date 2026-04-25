![](https://img.shields.io/badge/Foundry-v13-informational)

# Tile Hover Highlight

A FoundryVTT v13 module that draws an outline around the tile under the cursor and optionally shows the tile's name above it. The highlight is purely visual and works for **every user** (GM and players alike), independent of which canvas layer is active.

---

## Features

- Outline drawn around the hovered tile in a configurable color, thickness and opacity.
- Silhouette tracing: the outline can follow the actual non-transparent pixels of a PNG/WebP instead of the rectangular tile bounds.
- Outline smoothing via Catmull-Rom interpolation, from sharp polygonal to strongly rounded.
- Optional label rendered above the tile, with global default font/size/color and a per-tile size override.
- Custom font upload – bring your own `.woff/.woff2/.ttf/.otf` and use it as the label font.
- The font dropdown only lists typefaces that contain Cyrillic glyphs (so `ru/uk/...` users don't get unusable choices), plus any custom fonts you add.
- Each font option in the dropdown is rendered in its own typeface for live preview.
- Master switch and per-scene toggle so the highlight only runs where you want it.
- Hidden tiles are skipped for non-GM users.

---

## Installation

Use the manifest URL of the latest release:

```
https://github.com/<user>/<repo>/releases/latest/download/module.json
```

Or copy the module folder into `Data/modules/foundry-tile-highlight-module/` of your Foundry instance.

---

## Usage

### Master switch
*Settings → Configure Settings → Tile Hover Highlight → "Enable highlight".*
Turning this off disables the module everywhere without uninstalling it.

### Enabling a scene
By default new scenes are **not** highlighted. Open *Scene Configuration → Tile Hover Highlight* and tick **"Enable on this scene"**.

The world setting *"Default for new scenes"* (off by default) controls the value used when a scene has no explicit choice.

### Naming a tile
Open the tile's configuration dialog. At the bottom of the basic tab you'll find a **"Tile name"** field – anything entered here will appear above the tile while it's hovered.

The same dialog has a **"Label size (px)"** field that overrides the global font size for this tile only. Leave it blank to use the default.

### Custom fonts
*Settings → Configure Settings → Tile Hover Highlight → "Custom fonts" → "Manage…"*

Each row holds a CSS family name and a path to the font file. Click the folder icon to open Foundry's file browser (you can upload directly from there). Press *Save* to persist; the font is loaded immediately and the dropdown picks it up. Custom fonts are always shown in the dropdown regardless of the Cyrillic check.

A typical entry:

| Family | URL |
|---|---|
| MyHandwriting | `modules/foundry-tile-highlight-module/fonts/MyHandwriting.woff2` |

---

## Settings reference

| Setting | Scope | Default |
|---|---|---|
| Enable highlight | World | on |
| Default for new scenes | World | off |
| Skip hidden tiles for players | World | on |
| Outline color | Client | `#FFFF00` |
| Outline thickness | Client | 4 px |
| Outline opacity | Client | 1.0 |
| Trace by image silhouette | Client | on |
| Alpha threshold | Client | 0.1 |
| Trace resolution | Client | 256 px |
| Outline simplification | Client | 1.5 |
| Outline smoothness | Client | 0.5 |
| Show tile name | Client | on |
| Label font | Client | first available Cyrillic-capable font (`Arial` if present) |
| Default label size | Client | 28 px |
| Label color | Client | `#FFFFFF` |
| Custom fonts | World (managed via menu) | – |

Per-document flags written by the module:

- `scene.flags.foundry-tile-highlight-module.enabled` – boolean
- `tile.flags.foundry-tile-highlight-module.label` – string
- `tile.flags.foundry-tile-highlight-module.labelSize` – number (px) or empty

---

## How it works

- A single `PIXI.Container` is added to `canvas.controls` per scene; it holds a `Graphics` for the outline and a `Text` for the label.
- A global `pointermove` listener on `canvas.stage` runs a rotation-aware point-in-rectangle test against every visible tile and picks the topmost hit by `sort` then `elevation`.
- When silhouette tracing is enabled, the tile's texture is drawn into an off-screen canvas at the configured resolution, the alpha channel is thresholded into a binary mask, and the outermost contours are extracted via Moore-neighbor boundary tracing. The result is simplified with Ramer–Douglas–Peucker, optionally smoothed with Catmull-Rom subdivision, then projected back into the tile's local frame.
- Outlines are cached per `id|src|size|scaleX|scaleY`; updating or deleting a tile invalidates its entry. Videos and images that fail CORS / `getImageData` fall back to the rectangular outline forever (cached as `null`).
- Cyrillic support is detected by drawing the character "Я" once with the candidate family and once with a deliberately invalid one – different rendered widths mean the font has its own glyph.

---

## Compatibility

- Foundry VTT **v13** (uses ApplicationV2 hooks, the new `foundry.applications.*` namespaces, and PIXI v7 conventions).
- No system requirements.
- No required dependencies.

---

## Building releases

Tagging a GitHub release runs `.github/workflows/main.yml`, which substitutes the version into `module.json` and packages `module.json`, `README.md`, `LICENSE`, `scripts/`, `styles/` and `languages/` into `module.zip`.

---

## License

See [LICENSE](LICENSE).
