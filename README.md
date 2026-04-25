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
https://github.com/Frost-Jack/foundry-tile-highlight-module/releases/latest/download/module.json
```

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

---

## Compatibility

- Foundry VTT **v13** (uses ApplicationV2 hooks, the new `foundry.applications.*` namespaces, and PIXI v7 conventions).
- No system requirements.
- No required dependencies.

---

## License

See [LICENSE](LICENSE).
