const MODULE_ID = "foundry-tile-highlight-module";

const SETTINGS = {
  ENABLED: "enabled",
  DEFAULT_PER_SCENE: "defaultPerScene",
  COLOR: "highlightColor",
  THICKNESS: "borderThickness",
  ALPHA: "highlightAlpha",
  IGNORE_HIDDEN: "ignoreHidden",
  TRACE_ALPHA: "traceAlpha",
  ALPHA_THRESHOLD: "alphaThreshold",
  TRACE_RESOLUTION: "traceResolution",
  SIMPLIFY_TOLERANCE: "simplifyTolerance",
  SMOOTHNESS: "outlineSmoothness",
  SHOW_LABEL: "showLabel",
  LABEL_FONT: "labelFont",
  LABEL_SIZE: "labelSize",
  LABEL_COLOR: "labelColor",
  CUSTOM_FONTS: "customFonts"
};

const SCENE_FLAG_ENABLED = "enabled";
const SCENE_FLAG_HIGHLIGHT_ALL = "highlightAll";
const TILE_FLAG_LABEL = "label";
const TILE_FLAG_LABEL_SIZE = "labelSize";
const TILE_FLAG_VISIBLE_TO = "visibleTo";

const VISIBILITY = {
  ALL: "all",
  GM: "gm",
  PLAYERS: "players"
};

const FORCED_SETTINGS_KEY = "forcedSettings";

const PUSHABLE_SETTINGS = [
  "highlightColor",
  "borderThickness",
  "highlightAlpha",
  "traceAlpha",
  "alphaThreshold",
  "traceResolution",
  "simplifyTolerance",
  "outlineSmoothness",
  "showLabel",
  "labelFont",
  "labelSize",
  "labelColor"
];

class CustomFontsApp extends (foundry?.applications?.api?.ApplicationV2 ?? class {}) {
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-custom-fonts`,
    tag: "form",
    window: {
      title: `${MODULE_ID}.customFonts.title`,
      icon: "fas fa-font",
      contentClasses: [`${MODULE_ID}-custom-fonts`]
    },
    position: { width: 560, height: "auto" },
    actions: {
      addRow: CustomFontsApp.#onAddRow,
      removeRow: CustomFontsApp.#onRemoveRow,
      pickFile: CustomFontsApp.#onPickFile,
      save: CustomFontsApp.#onSave
    }
  };

  _renderHTML(_ctx, _opts) {
    const fonts = TileHoverHighlighter.getCustomFonts();
    const escape = (s) => foundry.utils.escapeHTML?.(s) ?? String(s ?? "").replace(/"/g, "&quot;");
    const rows = fonts.map((f, i) => `
      <tr data-row="${i}">
        <td><input type="text" name="family" value="${escape(f.family)}" placeholder="${game.i18n.localize(`${MODULE_ID}.customFonts.familyPlaceholder`)}"></td>
        <td>
          <div class="form-fields" style="display:flex;gap:4px;">
            <input type="text" name="url" value="${escape(f.url)}" placeholder="modules/${MODULE_ID}/fonts/MyFont.woff2" style="flex:1">
            <button type="button" data-action="pickFile" data-row="${i}" data-tooltip="${game.i18n.localize(`${MODULE_ID}.customFonts.browse`)}"><i class="fas fa-folder-open"></i></button>
          </div>
        </td>
        <td><button type="button" data-action="removeRow" data-row="${i}" data-tooltip="${game.i18n.localize(`${MODULE_ID}.customFonts.remove`)}"><i class="fas fa-trash"></i></button></td>
      </tr>
    `).join("");

    return `
      <p class="notes">${game.i18n.localize(`${MODULE_ID}.customFonts.notes`)}</p>
      <table class="${MODULE_ID}-fonts-table">
        <thead>
          <tr>
            <th>${game.i18n.localize(`${MODULE_ID}.customFonts.family`)}</th>
            <th>${game.i18n.localize(`${MODULE_ID}.customFonts.url`)}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows || `<tr data-empty="1"><td colspan="3" class="hint">${game.i18n.localize(`${MODULE_ID}.customFonts.empty`)}</td></tr>`}</tbody>
      </table>
      <footer class="form-footer" style="display:flex;gap:6px;justify-content:flex-end;margin-top:8px;">
        <button type="button" data-action="addRow"><i class="fas fa-plus"></i> ${game.i18n.localize(`${MODULE_ID}.customFonts.add`)}</button>
        <button type="button" data-action="save"><i class="fas fa-save"></i> ${game.i18n.localize(`${MODULE_ID}.customFonts.save`)}</button>
      </footer>
    `;
  }

  _replaceHTML(result, content) {
    content.innerHTML = result;
  }

  static #collect(app) {
    const root = app.element;
    const rows = root.querySelectorAll("tbody tr[data-row]");
    const out = [];
    rows.forEach(tr => {
      const family = tr.querySelector('input[name="family"]').value.trim();
      const url = tr.querySelector('input[name="url"]').value.trim();
      if (family && url) out.push({ family, url });
    });
    return out;
  }

  static async #onAddRow() {
    const current = CustomFontsApp.#collect(this);
    await game.settings.set(MODULE_ID, SETTINGS.CUSTOM_FONTS, [...current, { family: "", url: "" }]);
    this.render();
  }

  static async #onRemoveRow(_event, btn) {
    const idx = Number(btn.dataset.row);
    const current = CustomFontsApp.#collect(this);
    current.splice(idx, 1);
    await game.settings.set(MODULE_ID, SETTINGS.CUSTOM_FONTS, current);
    this.render();
  }

  static async #onPickFile(_event, btn) {
    const idx = Number(btn.dataset.row);
    const FP = foundry.applications?.apps?.FilePicker?.implementation ?? FilePicker;
    new FP({
      type: "any",
      callback: (path) => {
        const tr = this.element.querySelector(`tr[data-row="${idx}"]`);
        if (tr) tr.querySelector('input[name="url"]').value = path;
      }
    }).render(true);
  }

  static async #onSave() {
    const data = CustomFontsApp.#collect(this);
    await game.settings.set(MODULE_ID, SETTINGS.CUSTOM_FONTS, data);
    await TileHoverHighlighter.loadCustomFonts();
    TileHoverHighlighter.onFontsChanged();
    ui.notifications?.info(game.i18n.localize(`${MODULE_ID}.customFonts.saved`));
    this.close();
  }
}

/**
 * Tiny confirm dialog: GM clicks "Push" to broadcast their client-scoped
 * settings to every connected player.
 */
class PushSettingsApp extends (foundry?.applications?.api?.ApplicationV2 ?? class {}) {
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-push-settings`,
    tag: "form",
    window: {
      title: `${MODULE_ID}.push.title`,
      icon: "fas fa-share-square",
      contentClasses: [`${MODULE_ID}-push-settings`]
    },
    position: { width: 460, height: "auto" },
    actions: {
      doPush: PushSettingsApp.#onPush,
      doClear: PushSettingsApp.#onClear,
      doCancel: PushSettingsApp.#onCancel
    }
  };

  _renderHTML() {
    const onlineCount = (game.users?.filter(u => u.active && !u.isGM).length) ?? 0;
    const forced = TileHoverHighlighter.getForcedSettings();
    const hasForced = forced && Object.keys(forced).length > 0;
    return `
      <p class="${MODULE_ID}-push-warning"><i class="fas fa-triangle-exclamation"></i> ${game.i18n.localize(`${MODULE_ID}.push.warning`)}</p>
      <p>${game.i18n.localize(`${MODULE_ID}.push.body`)}</p>
      <p class="hint">${game.i18n.format(`${MODULE_ID}.push.online`, { count: onlineCount })}</p>
      ${hasForced ? `<p class="hint"><i class="fas fa-lock"></i> ${game.i18n.localize(`${MODULE_ID}.push.activeForce`)}</p>` : ""}
      <footer class="form-footer" style="display:flex;gap:6px;justify-content:flex-end;margin-top:8px;">
        <button type="button" data-action="doCancel">${game.i18n.localize("Cancel")}</button>
        ${hasForced ? `<button type="button" data-action="doClear"><i class="fas fa-unlock"></i> ${game.i18n.localize(`${MODULE_ID}.push.clear`)}</button>` : ""}
        <button type="button" data-action="doPush"><i class="fas fa-share-square"></i> ${game.i18n.localize(`${MODULE_ID}.push.confirm`)}</button>
      </footer>
    `;
  }

  _replaceHTML(result, content) { content.innerHTML = result; }

  static async #onPush() {
    await TileHoverHighlighter.pushClientSettingsToPlayers();
    this.close();
  }

  static async #onClear() {
    await TileHoverHighlighter.clearForcedSettings();
    this.close();
  }

  static #onCancel() { this.close(); }
}

class TileHoverHighlighter {
  static overlay = null;
  static hoveredTile = null;
  static boundPointerMove = null;
  static outlineCache = new Map();
  static pendingOutlines = new Map();
  static _cyrCache = new Map();

  static registerSettings() {
    game.settings.register(MODULE_ID, SETTINGS.ENABLED, {
      name: `${MODULE_ID}.settings.enabled.name`,
      hint: `${MODULE_ID}.settings.enabled.hint`,
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: () => TileHoverHighlighter.refreshActiveScene()
    });

    game.settings.register(MODULE_ID, SETTINGS.DEFAULT_PER_SCENE, {
      name: `${MODULE_ID}.settings.defaultPerScene.name`,
      hint: `${MODULE_ID}.settings.defaultPerScene.hint`,
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
      onChange: () => TileHoverHighlighter.refreshActiveScene()
    });

    const ColorField = foundry?.data?.fields?.ColorField;
    game.settings.register(MODULE_ID, SETTINGS.COLOR, {
      name: `${MODULE_ID}.settings.color.name`,
      hint: `${MODULE_ID}.settings.color.hint`,
      scope: "client",
      config: true,
      type: ColorField ? new ColorField({ initial: "#FFFF00" }) : String,
      default: "#FFFF00",
      onChange: () => TileHoverHighlighter.redraw()
    });

    game.settings.register(MODULE_ID, SETTINGS.THICKNESS, {
      name: `${MODULE_ID}.settings.thickness.name`,
      hint: `${MODULE_ID}.settings.thickness.hint`,
      scope: "client",
      config: true,
      type: Number,
      default: 4,
      range: { min: 1, max: 20, step: 1 },
      onChange: () => TileHoverHighlighter.redraw()
    });

    game.settings.register(MODULE_ID, SETTINGS.ALPHA, {
      name: `${MODULE_ID}.settings.alpha.name`,
      hint: `${MODULE_ID}.settings.alpha.hint`,
      scope: "client",
      config: true,
      type: Number,
      default: 1.0,
      range: { min: 0.1, max: 1.0, step: 0.05 },
      onChange: () => TileHoverHighlighter.redraw()
    });

    game.settings.register(MODULE_ID, SETTINGS.IGNORE_HIDDEN, {
      name: `${MODULE_ID}.settings.ignoreHidden.name`,
      hint: `${MODULE_ID}.settings.ignoreHidden.hint`,
      scope: "world",
      config: true,
      type: Boolean,
      default: true
    });

    game.settings.register(MODULE_ID, SETTINGS.TRACE_ALPHA, {
      name: `${MODULE_ID}.settings.traceAlpha.name`,
      hint: `${MODULE_ID}.settings.traceAlpha.hint`,
      scope: "client",
      config: true,
      type: Boolean,
      default: true,
      onChange: () => TileHoverHighlighter.invalidateAllOutlines()
    });

    game.settings.register(MODULE_ID, SETTINGS.ALPHA_THRESHOLD, {
      name: `${MODULE_ID}.settings.alphaThreshold.name`,
      hint: `${MODULE_ID}.settings.alphaThreshold.hint`,
      scope: "client",
      config: true,
      type: Number,
      default: 0.1,
      range: { min: 0.01, max: 0.95, step: 0.01 },
      onChange: () => TileHoverHighlighter.invalidateAllOutlines()
    });

    game.settings.register(MODULE_ID, SETTINGS.TRACE_RESOLUTION, {
      name: `${MODULE_ID}.settings.traceResolution.name`,
      hint: `${MODULE_ID}.settings.traceResolution.hint`,
      scope: "client",
      config: true,
      type: Number,
      default: 256,
      range: { min: 64, max: 1024, step: 32 },
      onChange: () => TileHoverHighlighter.invalidateAllOutlines()
    });

    game.settings.register(MODULE_ID, SETTINGS.SIMPLIFY_TOLERANCE, {
      name: `${MODULE_ID}.settings.simplifyTolerance.name`,
      hint: `${MODULE_ID}.settings.simplifyTolerance.hint`,
      scope: "client",
      config: true,
      type: Number,
      default: 1.5,
      range: { min: 0, max: 10, step: 0.1 },
      onChange: () => TileHoverHighlighter.invalidateAllOutlines()
    });

    game.settings.register(MODULE_ID, SETTINGS.SMOOTHNESS, {
      name: `${MODULE_ID}.settings.smoothness.name`,
      hint: `${MODULE_ID}.settings.smoothness.hint`,
      scope: "client",
      config: true,
      type: Number,
      default: 0.5,
      range: { min: 0, max: 1, step: 0.05 },
      onChange: () => TileHoverHighlighter.redraw()
    });

    game.settings.register(MODULE_ID, SETTINGS.SHOW_LABEL, {
      name: `${MODULE_ID}.settings.showLabel.name`,
      hint: `${MODULE_ID}.settings.showLabel.hint`,
      scope: "client",
      config: true,
      type: Boolean,
      default: true,
      onChange: () => TileHoverHighlighter.redraw()
    });

    game.settings.register(MODULE_ID, SETTINGS.CUSTOM_FONTS, {
      scope: "world",
      config: false,
      type: Array,
      default: []
    });

    game.settings.register(MODULE_ID, FORCED_SETTINGS_KEY, {
      scope: "world",
      config: false,
      type: Object,
      default: {},
      onChange: () => TileHoverHighlighter.onForcedSettingsChanged()
    });

    game.settings.registerMenu(MODULE_ID, "customFontsMenu", {
      name: `${MODULE_ID}.settings.customFonts.name`,
      hint: `${MODULE_ID}.settings.customFonts.hint`,
      label: `${MODULE_ID}.settings.customFonts.label`,
      icon: "fas fa-font",
      type: CustomFontsApp,
      restricted: true
    });

    game.settings.registerMenu(MODULE_ID, "pushSettingsMenu", {
      name: `${MODULE_ID}.settings.pushToPlayers.name`,
      hint: `${MODULE_ID}.settings.pushToPlayers.hint`,
      label: `${MODULE_ID}.settings.pushToPlayers.label`,
      icon: "fas fa-share-square",
      type: PushSettingsApp,
      restricted: true
    });

    game.settings.register(MODULE_ID, SETTINGS.LABEL_FONT, {
      name: `${MODULE_ID}.settings.labelFont.name`,
      hint: `${MODULE_ID}.settings.labelFont.hint`,
      scope: "client",
      config: true,
      type: String,
      choices: TileHoverHighlighter.getFontChoices(),
      default: TileHoverHighlighter.getDefaultFont(),
      onChange: () => TileHoverHighlighter.redraw()
    });

    game.settings.register(MODULE_ID, SETTINGS.LABEL_SIZE, {
      name: `${MODULE_ID}.settings.labelSize.name`,
      hint: `${MODULE_ID}.settings.labelSize.hint`,
      scope: "client",
      config: true,
      type: Number,
      default: 28,
      range: { min: 8, max: 96, step: 1 },
      onChange: () => TileHoverHighlighter.redraw()
    });

    game.settings.register(MODULE_ID, SETTINGS.LABEL_COLOR, {
      name: `${MODULE_ID}.settings.labelColor.name`,
      hint: `${MODULE_ID}.settings.labelColor.hint`,
      scope: "client",
      config: true,
      type: ColorField ? new ColorField({ initial: "#FFFFFF" }) : String,
      default: "#FFFFFF",
      onChange: () => TileHoverHighlighter.redraw()
    });
  }

  /**
   * Build the list of font families offered to the user. Fonts without
   * Cyrillic glyphs are filtered out so the dropdown only shows usable
   * options for ru/uk/etc. Custom fonts uploaded by the user are always
   * included regardless of the heuristic.
   */
  static getFontChoices() {
    const families = (CONFIG?.fontDefinitions && Object.keys(CONFIG.fontDefinitions)) || [];
    const cyrillicSafe = ["Arial", "Verdana", "Tahoma", "Times New Roman", "Georgia", "Courier New", "PT Sans", "PT Serif", "Roboto", "Open Sans", "DejaVu Sans"];
    const customs = (this.getCustomFonts() ?? []).map(f => f.family);

    const baseList = [...new Set([...families, ...cyrillicSafe, ...customs])];
    const filtered = baseList.filter(f => customs.includes(f) || this.fontSupportsCyrillic(f));
    const sorted = filtered.sort((a, b) => a.localeCompare(b));
    const out = {};
    for (const f of sorted) out[f] = f;
    return out;
  }

  /**
   * Heuristic Cyrillic-support detection. Measures the rendered width of
   * "Я" twice – first with the font as the primary family, second with a
   * deliberately invalid family that forces the browser to its default
   * fallback. Different widths mean the font has its own glyph for the
   * character; identical widths mean both renders fell back to the same
   * default and the font lacks Cyrillic coverage.
   */
  static fontSupportsCyrillic(family) {
    if (!family) return false;
    if (this._cyrCache.has(family)) return this._cyrCache.get(family);
    let supported = false;
    try {
      const c = document.createElement("canvas");
      c.width = 32; c.height = 32;
      const ctx = c.getContext("2d");
      ctx.font = `24px "${family}", "ZZZ-NotARealFont"`;
      const w1 = ctx.measureText("Я").width;
      ctx.font = `24px "ZZZ-NotARealFont"`;
      const w2 = ctx.measureText("Я").width;
      supported = Math.abs(w1 - w2) > 0.5;
    } catch (e) {}
    this._cyrCache.set(family, supported);
    return supported;
  }

  static getDefaultFont() {
    const choices = this.getFontChoices();
    if (choices["Arial"]) return "Arial";
    const first = Object.keys(choices)[0];
    return first || (CONFIG?.defaultFontFamily || "Arial");
  }

  static getCustomFonts() {
    try { return game.settings.get(MODULE_ID, SETTINGS.CUSTOM_FONTS) ?? []; }
    catch (e) { return []; }
  }

  /**
   * Load every custom font entry into the document via the FontFace API so
   * PIXI text rendering and the settings dropdown both pick them up.
   */
  static async loadCustomFonts() {
    const fonts = this.getCustomFonts();
    for (const f of fonts) {
      if (!f?.family || !f?.url) continue;
      try {
        const ff = new FontFace(f.family, `url("${f.url}")`);
        await ff.load();
        document.fonts.add(ff);
        this._cyrCache.delete(f.family);
      } catch (e) {
        console.warn(`${MODULE_ID} | Failed to load custom font`, f, e);
      }
    }
  }

  /**
   * Refresh anything that depends on the current font set: the dropdown
   * choices on the registered setting, the per-option preview stylesheet
   * and the live label render.
   */
  /**
   * Convert a setting value into a JSON-safe primitive for storage in the
   * world-scope force map. ColorField returns a foundry.utils.Color
   * instance which serialises as `{}` by default; everything else is
   * forwarded as-is.
   */
  static serializeSettingValue(value) {
    if (value === null || value === undefined) return value;
    const ColorCtor = foundry?.utils?.Color;
    if (ColorCtor && value instanceof ColorCtor) return value.toString();
    if (typeof value === "object" && typeof value.toString === "function" && value.constructor?.name === "Color") {
      return value.toString();
    }
    return value;
  }

  /** Read the current forced-settings map (world scope, per-key overrides). */
  static getForcedSettings() {
    try { return game.settings.get(MODULE_ID, FORCED_SETTINGS_KEY) ?? {}; }
    catch (e) { return {}; }
  }

  /**
   * Push every PUSHABLE_SETTINGS value into the world-scope force map.
   * Foundry's own setting-update broadcast then propagates to every
   * connected client (and to anyone who logs in later) without a socket
   * round-trip. Only the GM can write the world setting.
   */
  static async pushClientSettingsToPlayers() {
    if (!game.user.isGM) {
      ui.notifications?.warn(game.i18n.localize(`${MODULE_ID}.push.notGM`));
      return;
    }
    const payload = {};
    for (const key of PUSHABLE_SETTINGS) {
      try { payload[key] = this.serializeSettingValue(game.settings.get(MODULE_ID, key)); }
      catch (e) { console.warn(`${MODULE_ID} | Failed to read setting for push`, key, e); }
    }
    await game.settings.set(MODULE_ID, FORCED_SETTINGS_KEY, payload);
    ui.notifications?.info(game.i18n.localize(`${MODULE_ID}.push.sent`));
  }

  /**
   * Drop the forced map; every client falls back to its own local choice
   * for the affected settings on the next read.
   */
  static async clearForcedSettings() {
    if (!game.user.isGM) {
      ui.notifications?.warn(game.i18n.localize(`${MODULE_ID}.push.notGM`));
      return;
    }
    await game.settings.set(MODULE_ID, FORCED_SETTINGS_KEY, {});
    ui.notifications?.info(game.i18n.localize(`${MODULE_ID}.push.cleared`));
  }

  /**
   * Refresh anything that depends on the now-changed effective values.
   * Called via the world-setting onChange on every connected client.
   */
  static onForcedSettingsChanged() {
    this.invalidateAllOutlines();
    this.onFontsChanged();
    this.redrawAll();
  }

  /**
   * Cast a stored forced value back into the type that the registered
   * setting field would normally hand out. Color settings in particular
   * must return a foundry.utils.Color instance, otherwise consumers like
   * SettingsConfig that read `.value` blow up.
   */
  static coerceForcedValue(namespace, key, value) {
    try {
      const reg = game.settings.settings.get(`${namespace}.${key}`);
      const type = reg?.type;
      const ColorField = foundry?.data?.fields?.ColorField;
      const ColorCtor = foundry?.utils?.Color;
      if (ColorField && ColorCtor && type instanceof ColorField) {
        if (value === null || value === undefined || value === "") return null;
        if (value instanceof ColorCtor) return value;
        return ColorCtor.from(value);
      }
      if (type && typeof type.clean === "function") {
        try { return type.clean(value); } catch (e) {}
      }
    } catch (e) {}
    return value;
  }

  /**
   * Wrap ClientSettings.prototype.get so reads of any PUSHABLE_SETTINGS key
   * transparently return the value from the world-scope force map when one
   * is present. Mirrors the pattern used by the force-client-controls
   * module for keybindings.
   *
   * Also wraps `set` so the GM editing one of the forced settings updates
   * the force map at the same time – the new value is therefore broadcast
   * to every client immediately instead of being silently shadowed.
   */
  static patchClientSettingsGet() {
    const getWrapper = function (wrapped, namespace, key, ...rest) {
      if (namespace === MODULE_ID && PUSHABLE_SETTINGS.includes(key)) {
        const forced = TileHoverHighlighter.getForcedSettings();
        if (forced && Object.prototype.hasOwnProperty.call(forced, key)) {
          return TileHoverHighlighter.coerceForcedValue(namespace, key, forced[key]);
        }
      }
      return wrapped(namespace, key, ...rest);
    };

    const setWrapper = async function (wrapped, namespace, key, value, ...rest) {
      const result = await wrapped(namespace, key, value, ...rest);
      if (game.user?.isGM
          && namespace === MODULE_ID
          && PUSHABLE_SETTINGS.includes(key)) {
        const forced = TileHoverHighlighter.getForcedSettings();
        if (forced && Object.prototype.hasOwnProperty.call(forced, key)) {
          const next = { ...forced, [key]: TileHoverHighlighter.serializeSettingValue(value) };
          try {
            await wrapped(MODULE_ID, FORCED_SETTINGS_KEY, next);
          } catch (e) {
            console.warn(`${MODULE_ID} | Failed to sync forced setting`, key, e);
          }
        }
      }
      return result;
    };

    const getTargets = [
      "foundry.helpers.ClientSettings.prototype.get",
      "ClientSettings.prototype.get"
    ];
    const setTargets = [
      "foundry.helpers.ClientSettings.prototype.set",
      "ClientSettings.prototype.set"
    ];

    const useLibWrapper = game.modules.get("lib-wrapper")?.active && globalThis.libWrapper;
    let getRegistered = false;
    let setRegistered = false;

    if (useLibWrapper) {
      for (const t of getTargets) {
        try { libWrapper.register(MODULE_ID, t, getWrapper, "MIXED"); getRegistered = true; break; }
        catch (e) {}
      }
      for (const t of setTargets) {
        try { libWrapper.register(MODULE_ID, t, setWrapper, "WRAPPER"); setRegistered = true; break; }
        catch (e) {}
      }
      if (getRegistered && setRegistered) return;
    }

    const ClientSettings = foundry?.helpers?.ClientSettings ?? globalThis.ClientSettings;
    if (!ClientSettings?.prototype?.get || !ClientSettings?.prototype?.set) {
      console.warn(`${MODULE_ID} | Could not patch ClientSettings; pushed settings will not apply on this client.`);
      return;
    }
    if (!getRegistered) {
      const origGet = ClientSettings.prototype.get;
      ClientSettings.prototype.get = function (...args) {
        return getWrapper.call(this, origGet.bind(this), ...args);
      };
    }
    if (!setRegistered) {
      const origSet = ClientSettings.prototype.set;
      ClientSettings.prototype.set = function (...args) {
        return setWrapper.call(this, origSet.bind(this), ...args);
      };
    }
  }

  static onFontsChanged() {
    const reg = game.settings.settings.get(`${MODULE_ID}.${SETTINGS.LABEL_FONT}`);
    if (reg) reg.choices = this.getFontChoices();
    document.getElementById(this.cssIdForFonts())?.remove();
    this.injectFontStylesheet();
    this.redraw();
  }

  static cssIdForFonts() { return `${MODULE_ID}-font-styles`; }

  /**
   * Each <option> in the font dropdown is styled with its own font-family
   * so the user can see the typeface before selecting it. The closed-state
   * trigger picks up a CSS variable updated on `change`.
   */
  static injectFontStylesheet() {
    if (document.getElementById(this.cssIdForFonts())) return;
    const fonts = Object.keys(this.getFontChoices());
    const sel = `select[name="${MODULE_ID}.${SETTINGS.LABEL_FONT}"]`;
    const lines = [];
    for (const f of fonts) {
      const safe = f.replace(/"/g, '\\"');
      lines.push(`${sel} option[value="${safe}"] { font-family: "${safe}", sans-serif; font-size: 1.05em; }`);
    }
    lines.push(`${sel} { font-family: var(--${MODULE_ID}-current-font, inherit); }`);
    const style = document.createElement("style");
    style.id = this.cssIdForFonts();
    style.textContent = lines.join("\n");
    document.head.appendChild(style);
  }

  static applyFontPreviewToSelect(selectEl) {
    if (!selectEl) return;
    const update = () => {
      const v = selectEl.value || "";
      selectEl.style.setProperty(`--${MODULE_ID}-current-font`, v ? `"${v}", sans-serif` : "");
      selectEl.style.fontFamily = v ? `"${v}", sans-serif` : "";
    };
    update();
    selectEl.addEventListener("change", update);
  }

  /**
   * Inject a red warning paragraph under the "Push my settings to players"
   * menu row in the global Settings dialog so the GM sees the consequence
   * before opening the push dialog.
   */
  static injectPushWarning(root) {
    if (!root) return;
    const menuKey = `${MODULE_ID}.pushSettingsMenu`;
    const button = root.querySelector(`button[data-key="${menuKey}"]`)
      ?? Array.from(root.querySelectorAll("button")).find(b => b.name === menuKey || b.dataset?.key === menuKey);
    if (!button) return;
    const formGroup = button.closest(".form-group, .submenu, li, .form-fields") ?? button.parentElement;
    if (!formGroup) return;
    if (formGroup.querySelector(`.${MODULE_ID}-push-warning`)) return;
    const warning = document.createElement("p");
    warning.className = `${MODULE_ID}-push-warning`;
    warning.innerHTML = `<i class="fas fa-triangle-exclamation"></i> ${game.i18n.localize(`${MODULE_ID}.push.warning`)}`;
    formGroup.appendChild(warning);
  }

  /**
   * Whether the highlighter should run for a given scene. The world-level
   * master switch always wins; the per-scene flag overrides the world
   * default when set, otherwise the default-for-new-scenes setting applies.
   */
  static isEnabledForScene(scene) {
    if (!scene) return false;
    if (!game.settings.get(MODULE_ID, SETTINGS.ENABLED)) return false;
    const flag = scene.getFlag(MODULE_ID, SCENE_FLAG_ENABLED);
    if (flag === undefined || flag === null) {
      return game.settings.get(MODULE_ID, SETTINGS.DEFAULT_PER_SCENE);
    }
    return Boolean(flag);
  }

  /**
   * Whether the active scene asks for every tile to be highlighted at
   * once instead of only on hover.
   */
  static isHighlightAll(scene = canvas?.scene) {
    return Boolean(scene?.getFlag(MODULE_ID, SCENE_FLAG_HIGHLIGHT_ALL));
  }

  /**
   * Module-specific visibility check. A tile may be flagged as visible
   * to GM only, players only, or all. Foundry's own `hidden` flag still
   * applies (it always hides the tile from non-GM users).
   */
  static isTileVisibleToCurrentUser(tile) {
    if (!tile?.document) return false;
    if (!tile.visible) return false;
    if (tile.document.hidden && !game.user.isGM) {
      if (!game.settings.get(MODULE_ID, SETTINGS.IGNORE_HIDDEN)) return true;
      return false;
    }
    const visibleTo = tile.document.getFlag(MODULE_ID, TILE_FLAG_VISIBLE_TO) ?? VISIBILITY.ALL;
    if (visibleTo === VISIBILITY.ALL) return true;
    if (visibleTo === VISIBILITY.GM) return game.user.isGM;
    if (visibleTo === VISIBILITY.PLAYERS) return !game.user.isGM;
    return true;
  }

  static teardown() {
    if (this.boundPointerMove && canvas?.stage) {
      canvas.stage.off("pointermove", this.boundPointerMove);
    }
    this.boundPointerMove = null;

    if (this.overlay) {
      try {
        this.overlay.parent?.removeChild(this.overlay);
        this.overlay.destroy({ children: true });
      } catch (e) {}
      this.overlay = null;
    }
    this.hoveredTile = null;
  }

  /**
   * Build the overlay on top of the controls layer. The overlay holds two
   * sublayers: an "all" container with one outline+label per tile (used
   * when the scene's "highlight all" flag is on) and a "hover" pair for
   * the single tile under the cursor.
   */
  static setupForScene() {
    this.teardown();

    if (!canvas?.ready) return;
    if (!this.isEnabledForScene(canvas.scene)) return;

    const parent = canvas.controls ?? canvas.interface ?? canvas.stage;
    if (!parent) return;

    this.overlay = new PIXI.Container();
    this.overlay.eventMode = "none";
    this.overlay.zIndex = 9999;

    this.overlay.allLayer = this.overlay.addChild(new PIXI.Container());
    this.overlay.allLayer.eventMode = "none";

    this.overlay.graphics = this.overlay.addChild(new PIXI.Graphics());
    this.overlay.graphics.eventMode = "none";
    this.overlay.label = this.overlay.addChild(new PIXI.Text("", new PIXI.TextStyle({ fontFamily: "Arial", fontSize: 28, fill: 0xFFFFFF })));
    this.overlay.label.eventMode = "none";
    this.overlay.label.anchor?.set?.(0.5, 1);
    this.overlay.label.visible = false;

    parent.addChild(this.overlay);

    this.boundPointerMove = this.onPointerMove.bind(this);
    canvas.stage.on("pointermove", this.boundPointerMove);

    this.redrawAll();
  }

  static refreshActiveScene() {
    this.setupForScene();
  }

  static onPointerMove(event) {
    if (!this.overlay) return;
    const local = event.getLocalPosition(canvas.stage);
    const tile = this.findTileAt(local);
    if (tile === this.hoveredTile) return;
    this.hoveredTile = tile;
    this.redraw();
  }

  /**
   * Pick the topmost tile under the cursor, applying the per-user
   * visibility rules (Foundry hidden + module visibleTo flag).
   */
  static findTileAt(point) {
    const tiles = canvas.tiles?.placeables ?? [];
    if (!tiles.length) return null;

    const candidates = tiles.filter(t => {
      if (!this.isTileVisibleToCurrentUser(t)) return false;
      return this.containsPoint(t, point);
    });

    if (!candidates.length) return null;

    candidates.sort((a, b) => {
      const sa = a.document.sort ?? 0;
      const sb = b.document.sort ?? 0;
      if (sb !== sa) return sb - sa;
      const ea = a.document.elevation ?? 0;
      const eb = b.document.elevation ?? 0;
      return eb - ea;
    });
    return candidates[0];
  }

  /**
   * Rotation-aware point-in-rectangle test. Translates the point into the
   * tile's local frame so a single AABB check works regardless of the
   * tile's rotation around its center.
   */
  static containsPoint(tile, point) {
    const { x, y, width, height, rotation } = tile.document;
    if (!width || !height) return false;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const dx = point.x - cx;
    const dy = point.y - cy;
    const rad = Math.toRadians(rotation || 0);
    const cos = Math.cos(-rad);
    const sin = Math.sin(-rad);
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;
    return Math.abs(rx) <= width / 2 && Math.abs(ry) <= height / 2;
  }

  static parseColor(input) {
    try {
      if (input === null || input === undefined) return 0xFFFF00;
      const ColorCtor = foundry?.utils?.Color;
      if (ColorCtor && input instanceof ColorCtor) return Number(input);
      if (typeof input === "number" && Number.isFinite(input)) return input & 0xFFFFFF;
      const v = String(input).trim().replace(/^#/, "");
      if (!/^[0-9a-fA-F]{6}$/.test(v)) return 0xFFFF00;
      return parseInt(v, 16);
    } catch (e) {
      return 0xFFFF00;
    }
  }

  /**
   * Repaint the hover layer. Skipped when the scene is in "highlight all"
   * mode so the same tile isn't outlined twice.
   */
  static redraw() {
    const root = this.overlay;
    if (!root) return;
    const g = root.graphics;
    const label = root.label;
    g.clear();
    if (label) label.visible = false;
    if (this.isHighlightAll()) return;
    const tile = this.hoveredTile;
    if (!tile?.document) return;
    if (!this.isTileVisibleToCurrentUser(tile)) return;
    this.paintTile(tile, g, label);
  }

  /**
   * Repaint the "highlight all" layer: one outline+label per visible tile
   * on the current scene. Called whenever the scene's flag is on or when
   * the tile set / visibility rules change.
   */
  static redrawAll() {
    const root = this.overlay;
    if (!root?.allLayer) return;
    const layer = root.allLayer;

    while (layer.children.length) {
      const c = layer.removeChildAt(0);
      try { c.destroy({ children: true }); } catch (e) {}
    }

    if (!this.isHighlightAll()) return;

    const tiles = canvas.tiles?.placeables ?? [];
    for (const tile of tiles) {
      if (!this.isTileVisibleToCurrentUser(tile)) continue;
      const g = layer.addChild(new PIXI.Graphics());
      g.eventMode = "none";
      const labelText = layer.addChild(new PIXI.Text("", new PIXI.TextStyle({ fontFamily: "Arial", fontSize: 28, fill: 0xFFFFFF })));
      labelText.eventMode = "none";
      labelText.anchor?.set?.(0.5, 1);
      labelText.visible = false;
      this.paintTile(tile, g, labelText);
    }
  }

  /**
   * Draw the outline of a tile into the supplied PIXI.Graphics, and the
   * tile's label into the supplied PIXI.Text. Both targets are positioned
   * in canvas-local coordinates.
   */
  static paintTile(tile, g, labelText) {
    const color = this.parseColor(game.settings.get(MODULE_ID, SETTINGS.COLOR));
    const thickness = Number(game.settings.get(MODULE_ID, SETTINGS.THICKNESS)) || 4;
    const alpha = Number(game.settings.get(MODULE_ID, SETTINGS.ALPHA)) || 1;
    const traceAlpha = game.settings.get(MODULE_ID, SETTINGS.TRACE_ALPHA);
    const smoothness = Math.max(0, Math.min(1, Number(game.settings.get(MODULE_ID, SETTINGS.SMOOTHNESS)) || 0));

    const { x, y, width, height, rotation } = tile.document;

    g.clear();
    g.lineStyle({
      width: thickness,
      color,
      alpha,
      alignment: 0.5,
      join: PIXI.LINE_JOIN.ROUND,
      cap: PIXI.LINE_CAP.ROUND
    });
    g.position.set(x + width / 2, y + height / 2);
    g.pivot.set(width / 2, height / 2);
    g.angle = rotation || 0;

    let polys = null;
    if (traceAlpha) polys = this.getOutline(tile);
    if (polys && polys.length) {
      for (const poly of polys) {
        if (poly.length < 6) continue;
        const drawn = smoothness > 0 ? this.smoothPolygon(poly, smoothness) : poly;
        if (smoothness > 0) this.drawSmoothClosed(g, drawn);
        else g.drawPolygon(drawn);
      }
    } else {
      g.drawRect(0, 0, width, height);
      if (traceAlpha) this.requestOutline(tile);
    }

    this.paintLabel(tile, labelText);
  }

  /**
   * Render the optional name above a tile. Per-tile font size override
   * takes precedence over the global default; the label is always
   * positioned along the top edge of the (possibly rotated) tile.
   */
  static paintLabel(tile, label) {
    if (!label) return;
    label.visible = false;
    if (!game.settings.get(MODULE_ID, SETTINGS.SHOW_LABEL)) return;

    const text = String(tile.document.getFlag(MODULE_ID, TILE_FLAG_LABEL) ?? "").trim();
    if (!text) return;

    const fontFamily = game.settings.get(MODULE_ID, SETTINGS.LABEL_FONT) || this.getDefaultFont();
    const tileSizeFlag = tile.document.getFlag(MODULE_ID, TILE_FLAG_LABEL_SIZE);
    const tileSize = Number(tileSizeFlag);
    const fontSize = Math.max(4, Number.isFinite(tileSize) && tileSize > 0
      ? tileSize
      : (Number(game.settings.get(MODULE_ID, SETTINGS.LABEL_SIZE)) || 28));
    const fillColor = this.parseColor(game.settings.get(MODULE_ID, SETTINGS.LABEL_COLOR));

    label.text = text;
    label.style = new PIXI.TextStyle({
      fontFamily,
      fontSize,
      fill: fillColor,
      stroke: 0x000000,
      strokeThickness: Math.max(2, Math.round(fontSize / 8)),
      align: "center",
      lineJoin: "round",
      dropShadow: true,
      dropShadowBlur: 4,
      dropShadowDistance: 0,
      dropShadowColor: 0x000000,
      dropShadowAlpha: 0.85
    });
    if (label.resolution !== undefined) label.resolution = Math.max(2, canvas.app?.renderer?.resolution ?? 2);

    const { x, y, width, height, rotation } = tile.document;
    const rad = Math.toRadians(rotation || 0);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const cx = x + width / 2;
    const cy = y + height / 2;
    const localTopX = 0;
    const localTopY = -height / 2;
    const wx = cx + localTopX * cos - localTopY * sin;
    const wy = cy + localTopX * sin + localTopY * cos;

    label.anchor.set(0.5, 1);
    label.rotation = 0;
    label.position.set(wx, wy - 6);
    label.visible = true;
  }

  /**
   * Catmull-Rom subdivision for a closed polygon. Output point count grows
   * linearly with `amount`: 0 = degenerate, 1 = 8 samples per edge.
   */
  static smoothPolygon(poly, amount) {
    const n = poly.length / 2;
    if (n < 4) return poly;
    const segments = Math.max(2, Math.round(2 + amount * 6));
    const out = [];
    const at = (i) => {
      const k = ((i % n) + n) % n;
      return [poly[k * 2], poly[k * 2 + 1]];
    };
    for (let i = 0; i < n; i++) {
      const p0 = at(i - 1);
      const p1 = at(i);
      const p2 = at(i + 1);
      const p3 = at(i + 2);
      for (let s = 0; s < segments; s++) {
        const t = s / segments;
        const t2 = t * t;
        const t3 = t2 * t;
        const x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
        const y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
        out.push(x, y);
      }
    }
    return out;
  }

  static drawSmoothClosed(g, poly) {
    if (poly.length < 4) return;
    g.moveTo(poly[0], poly[1]);
    for (let i = 2; i < poly.length; i += 2) g.lineTo(poly[i], poly[i + 1]);
    g.closePath();
  }

  /**
   * Cache key for an outline. Includes everything that would change the
   * rendered silhouette so a tile swap or resize forces a recompute.
   */
  static cacheKey(tile) {
    const d = tile.document;
    const src = d.texture?.src ?? "";
    return `${d.id}|${src}|${d.width}x${d.height}|sx=${d.texture?.scaleX ?? 1}|sy=${d.texture?.scaleY ?? 1}`;
  }

  static getOutline(tile) {
    const entry = this.outlineCache.get(this.cacheKey(tile));
    return entry?.polys ?? null;
  }

  /**
   * Schedule an outline computation for a tile. Concurrent requests for
   * the same key are deduplicated; failures are cached as null so the
   * rectangular fallback is reused without re-attempting.
   */
  static requestOutline(tile) {
    const key = this.cacheKey(tile);
    if (this.outlineCache.has(key)) return;
    if (this.pendingOutlines.has(key)) return;
    const promise = this.computeOutline(tile, key)
      .then(polys => {
        this.outlineCache.set(key, { polys });
        if (this.hoveredTile === tile) this.redraw();
      })
      .catch(() => {
        this.outlineCache.set(key, { polys: null });
      })
      .finally(() => this.pendingOutlines.delete(key));
    this.pendingOutlines.set(key, promise);
  }

  static invalidateAllOutlines() {
    this.outlineCache.clear();
    this.pendingOutlines.clear();
    this.redraw();
  }

  static invalidateOutline(tile) {
    if (!tile?.document) return;
    const key = this.cacheKey(tile);
    this.outlineCache.delete(key);
    this.pendingOutlines.delete(key);
  }

  /**
   * Trace the silhouette of a tile's texture. Loads the image, downsamples
   * to the configured trace resolution, thresholds the alpha channel into
   * a binary mask, follows the contours via Moore-neighbor tracing, and
   * remaps the resulting pixel-space polygons into the tile's local frame
   * (including texture mirroring via negative `scaleX`/`scaleY`).
   */
  static async computeOutline(tile, expectedKey) {
    const doc = tile.document;
    const src = doc.texture?.src;
    if (!src) return null;

    const isVideo = /\.(webm|mp4|m4v|ogv)$/i.test(src);
    if (isVideo) return null;

    const maxRes = Number(game.settings.get(MODULE_ID, SETTINGS.TRACE_RESOLUTION)) || 256;
    const threshold = Number(game.settings.get(MODULE_ID, SETTINGS.ALPHA_THRESHOLD)) || 0.1;
    const tolerance = Number(game.settings.get(MODULE_ID, SETTINGS.SIMPLIFY_TOLERANCE)) || 0;

    const img = await this.loadImage(src);
    if (this.cacheKey(tile) !== expectedKey) return null;

    const tw = doc.width;
    const th = doc.height;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih || !tw || !th) return null;

    const scale = Math.min(1, maxRes / Math.max(iw, ih));
    const sw = Math.max(2, Math.round(iw * scale));
    const sh = Math.max(2, Math.round(ih * scale));

    const canvasEl = document.createElement("canvas");
    canvasEl.width = sw;
    canvasEl.height = sh;
    const ctx = canvasEl.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.clearRect(0, 0, sw, sh);
    try {
      ctx.drawImage(img, 0, 0, sw, sh);
    } catch (e) {
      return null;
    }

    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, sw, sh);
    } catch (e) {
      return null;
    }
    const alpha = new Uint8Array(sw * sh);
    const cutoff = Math.max(1, Math.round(threshold * 255));
    const data = imageData.data;
    for (let i = 0, j = 3; i < alpha.length; i++, j += 4) {
      alpha[i] = data[j] >= cutoff ? 1 : 0;
    }

    const contours = this.marchingSquares(alpha, sw, sh);
    if (!contours.length) return null;

    const sxTex = doc.texture?.scaleX ?? 1;
    const syTex = doc.texture?.scaleY ?? 1;
    const tileToImageX = sw / tw;
    const tileToImageY = sh / th;

    const polys = [];
    for (const c of contours) {
      const simplified = tolerance > 0 ? this.simplifyPolygon(c, tolerance) : c;
      if (simplified.length < 3) continue;
      const flat = new Array(simplified.length * 2);
      for (let i = 0; i < simplified.length; i++) {
        let px = simplified[i][0] / tileToImageX;
        let py = simplified[i][1] / tileToImageY;
        if (sxTex < 0) px = tw - px;
        if (syTex < 0) py = th - py;
        flat[i * 2] = px;
        flat[i * 2 + 1] = py;
      }
      polys.push(flat);
    }
    return polys;
  }

  static loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  /**
   * Find the outermost contours of a binary mask. Returns up to the eight
   * largest contours so multi-island silhouettes (e.g. characters with a
   * detached weapon or floating bits) keep their separate outlines.
   */
  static marchingSquares(mask, w, h) {
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : mask[y * w + x];
    const visited = new Uint8Array(w * h);
    const contours = [];

    const startCells = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (mask[y * w + x] && !at(x - 1, y)) startCells.push([x, y]);
      }
    }

    for (const [sx, sy] of startCells) {
      if (visited[sy * w + sx]) continue;
      const contour = this.traceContour(mask, w, h, sx, sy, visited);
      if (contour && contour.length >= 6) contours.push(contour);
    }

    contours.sort((a, b) => b.length - a.length);
    return contours.slice(0, 8);
  }

  /**
   * 8-direction Moore-neighbor boundary follow starting from a known
   * boundary pixel. The search direction is rotated each step so the
   * walker always tries to turn left first (clockwise traversal).
   */
  static traceContour(mask, w, h, sx, sy, visited) {
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : mask[y * w + x];
    const dirs = [
      [1, 0], [1, 1], [0, 1], [-1, 1],
      [-1, 0], [-1, -1], [0, -1], [1, -1]
    ];
    const points = [];
    let cx = sx, cy = sy;
    let prevDir = 6;
    points.push([cx, cy]);
    visited[cy * w + cx] = 1;

    const maxSteps = w * h * 4;
    for (let step = 0; step < maxSteps; step++) {
      let found = false;
      const startSearch = (prevDir + 6) % 8;
      for (let i = 0; i < 8; i++) {
        const d = (startSearch + i) % 8;
        const nx = cx + dirs[d][0];
        const ny = cy + dirs[d][1];
        if (at(nx, ny)) {
          cx = nx; cy = ny;
          prevDir = d;
          if (cx === sx && cy === sy) return points;
          points.push([cx, cy]);
          if (points.length > maxSteps) return points;
          found = true;
          break;
        }
      }
      if (!found) return points;
    }
    return points;
  }

  /** Ramer–Douglas–Peucker polyline simplification. */
  static simplifyPolygon(points, tolerance) {
    if (points.length < 3) return points;
    const sqTol = tolerance * tolerance;
    const sqDistSeg = (p, a, b) => {
      let x = a[0], y = a[1];
      let dx = b[0] - x, dy = b[1] - y;
      if (dx !== 0 || dy !== 0) {
        const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
        if (t > 1) { x = b[0]; y = b[1]; }
        else if (t > 0) { x += dx * t; y += dy * t; }
      }
      dx = p[0] - x; dy = p[1] - y;
      return dx * dx + dy * dy;
    };
    const simplifyDP = (pts, first, last, out) => {
      let maxSqDist = sqTol;
      let index = -1;
      for (let i = first + 1; i < last; i++) {
        const sq = sqDistSeg(pts[i], pts[first], pts[last]);
        if (sq > maxSqDist) { index = i; maxSqDist = sq; }
      }
      if (index !== -1) {
        if (index - first > 1) simplifyDP(pts, first, index, out);
        out.push(pts[index]);
        if (last - index > 1) simplifyDP(pts, index, last, out);
      }
    };
    const last = points.length - 1;
    const out = [points[0]];
    simplifyDP(points, 0, last, out);
    out.push(points[last]);
    return out;
  }

  static onTileChanged(tileDoc) {
    const placeable = tileDoc.object;
    if (placeable) this.invalidateOutline(placeable);
    if (this.isHighlightAll()) this.redrawAll();
    else if (this.hoveredTile?.document?.id === tileDoc?.id) this.redraw();
  }

  static onTileDeleted(tileDoc) {
    const placeable = tileDoc.object;
    if (placeable) this.invalidateOutline(placeable);
    if (this.hoveredTile?.document?.id === tileDoc?.id) {
      this.hoveredTile = null;
      this.redraw();
    }
    if (this.isHighlightAll()) this.redrawAll();
  }

  static onTileCreated() {
    if (this.isHighlightAll()) this.redrawAll();
  }

  static onSceneUpdate(scene, changes) {
    if (scene.id !== canvas?.scene?.id) return;
    const flagPath = `flags.${MODULE_ID}`;
    if (!foundry.utils.hasProperty(changes, flagPath)) return;

    const onlyHighlightAll = foundry.utils.hasProperty(changes, `${flagPath}.${SCENE_FLAG_HIGHLIGHT_ALL}`)
      && !foundry.utils.hasProperty(changes, `${flagPath}.${SCENE_FLAG_ENABLED}`);
    if (onlyHighlightAll && this.overlay) {
      this.redraw();
      this.redrawAll();
    } else {
      this.refreshActiveScene();
    }
  }
}

/**
 * Add the per-scene "enable highlight" checkbox to the Scene Configuration
 * dialog. Targets the Basics tab (v13 ApplicationV2) with fallbacks for
 * earlier Foundry versions that wrapped tabs in <section> elements.
 */
function injectSceneConfig(app, html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;
  const scene = app.document ?? app.object;
  if (!scene) return;
  if (root.querySelector(`[data-module="${MODULE_ID}"]`)) return;

  const current = scene.getFlag(MODULE_ID, SCENE_FLAG_ENABLED);
  const defaultEnabled = game.settings.get(MODULE_ID, SETTINGS.DEFAULT_PER_SCENE);
  const checked = current === undefined || current === null ? defaultEnabled : Boolean(current);
  const highlightAll = Boolean(scene.getFlag(MODULE_ID, SCENE_FLAG_HIGHLIGHT_ALL));

  const labelEnabled = game.i18n.localize(`${MODULE_ID}.scene.enabled.name`);
  const labelHint = game.i18n.localize(`${MODULE_ID}.scene.enabled.hint`);
  const labelHighlightAll = game.i18n.localize(`${MODULE_ID}.scene.highlightAll.name`);
  const labelHighlightAllHint = game.i18n.localize(`${MODULE_ID}.scene.highlightAll.hint`);
  const sectionTitle = game.i18n.localize(`${MODULE_ID}.scene.section`);

  const html5 = `
    <fieldset data-module="${MODULE_ID}" class="${MODULE_ID}-scene-section">
      <legend>${sectionTitle}</legend>
      <div class="form-group">
        <label>${labelEnabled}</label>
        <div class="form-fields">
          <input type="checkbox" name="flags.${MODULE_ID}.${SCENE_FLAG_ENABLED}" ${checked ? "checked" : ""}>
        </div>
        <p class="hint">${labelHint}</p>
      </div>
      <div class="form-group">
        <label>${labelHighlightAll}</label>
        <div class="form-fields">
          <input type="checkbox" name="flags.${MODULE_ID}.${SCENE_FLAG_HIGHLIGHT_ALL}" ${highlightAll ? "checked" : ""}>
        </div>
        <p class="hint">${labelHighlightAllHint}</p>
      </div>
    </fieldset>
  `;

  const target = root.querySelector('div.tab[data-tab="basics"]')
    ?? root.querySelector('section.tab[data-tab="basics"]')
    ?? root.querySelector('div.tab[data-tab="ambience"]')
    ?? root.querySelector('section.tab[data-tab="ambience"]')
    ?? root.querySelector('div.tab.active, section.tab.active')
    ?? root.querySelector('form');
  if (!target) return;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = html5;
  target.appendChild(wrapper.firstElementChild);
}

/**
 * Add the per-tile "name" and "label size" inputs to the Tile
 * Configuration dialog. Both write to module flags so Foundry's standard
 * form submit pipeline persists them without extra plumbing.
 */
function injectTileConfig(app, html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;
  const tileDoc = app.document ?? app.object;
  if (!tileDoc) return;
  if (root.querySelector(`[data-module="${MODULE_ID}"]`)) return;

  const escape = (s) => foundry.utils.escapeHTML?.(s) ?? String(s).replace(/"/g, "&quot;");
  const current = String(tileDoc.getFlag(MODULE_ID, TILE_FLAG_LABEL) ?? "");
  const sizeFlag = tileDoc.getFlag(MODULE_ID, TILE_FLAG_LABEL_SIZE);
  const sizeValue = (sizeFlag === undefined || sizeFlag === null || sizeFlag === "") ? "" : String(sizeFlag);
  const visibleTo = tileDoc.getFlag(MODULE_ID, TILE_FLAG_VISIBLE_TO) ?? VISIBILITY.ALL;

  const labelName = game.i18n.localize(`${MODULE_ID}.tile.label.name`);
  const labelHint = game.i18n.localize(`${MODULE_ID}.tile.label.hint`);
  const sizeName = game.i18n.localize(`${MODULE_ID}.tile.labelSize.name`);
  const sizeHint = game.i18n.localize(`${MODULE_ID}.tile.labelSize.hint`);
  const visibilityName = game.i18n.localize(`${MODULE_ID}.tile.visibility.name`);
  const visibilityHint = game.i18n.localize(`${MODULE_ID}.tile.visibility.hint`);
  const visAll = game.i18n.localize(`${MODULE_ID}.tile.visibility.all`);
  const visGM = game.i18n.localize(`${MODULE_ID}.tile.visibility.gm`);
  const visPlayers = game.i18n.localize(`${MODULE_ID}.tile.visibility.players`);
  const sectionTitle = game.i18n.localize(`${MODULE_ID}.tile.section`);
  const defaultSize = Number(game.settings.get(MODULE_ID, SETTINGS.LABEL_SIZE)) || 28;

  const html5 = `
    <fieldset data-module="${MODULE_ID}" class="${MODULE_ID}-scene-section">
      <legend>${sectionTitle}</legend>
      <div class="form-group">
        <label>${visibilityName}</label>
        <div class="form-fields">
          <select name="flags.${MODULE_ID}.${TILE_FLAG_VISIBLE_TO}">
            <option value="${VISIBILITY.ALL}" ${visibleTo === VISIBILITY.ALL ? "selected" : ""}>${visAll}</option>
            <option value="${VISIBILITY.GM}" ${visibleTo === VISIBILITY.GM ? "selected" : ""}>${visGM}</option>
            <option value="${VISIBILITY.PLAYERS}" ${visibleTo === VISIBILITY.PLAYERS ? "selected" : ""}>${visPlayers}</option>
          </select>
        </div>
        <p class="hint">${visibilityHint}</p>
      </div>
      <div class="form-group">
        <label>${labelName}</label>
        <div class="form-fields">
          <input type="text" name="flags.${MODULE_ID}.${TILE_FLAG_LABEL}" value="${escape(current)}">
        </div>
        <p class="hint">${labelHint}</p>
      </div>
      <div class="form-group">
        <label>${sizeName}</label>
        <div class="form-fields">
          <input type="number" min="4" max="200" step="1" name="flags.${MODULE_ID}.${TILE_FLAG_LABEL_SIZE}" value="${escape(sizeValue)}" placeholder="${defaultSize}">
        </div>
        <p class="hint">${sizeHint}</p>
      </div>
    </fieldset>
  `;

  const target = root.querySelector('div.tab[data-tab="basic"]')
    ?? root.querySelector('section.tab[data-tab="basic"]')
    ?? root.querySelector('div.tab.active, section.tab.active')
    ?? root.querySelector('form');
  if (!target) return;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = html5;
  const node = wrapper.firstElementChild;
  const footer = target.querySelector("footer.form-footer, footer.sheet-footer");
  if (footer) target.insertBefore(node, footer);
  else target.appendChild(node);
}

Hooks.once("init", () => {
  TileHoverHighlighter.registerSettings();
});

Hooks.once("ready", async () => {
  try {
    if (foundry?.applications?.settings?.menus?.FontConfig?.loadFont) {
      const defs = CONFIG?.fontDefinitions ?? {};
      for (const [family, def] of Object.entries(defs)) {
        try { await foundry.applications.settings.menus.FontConfig.loadFont(family, def); } catch (e) {}
      }
    }
  } catch (e) {}
  await TileHoverHighlighter.loadCustomFonts();
  TileHoverHighlighter.onFontsChanged();
});

Hooks.once("setup", () => {
  TileHoverHighlighter.patchClientSettingsGet();
});

Hooks.on("renderSettingsConfig", (app, html) => {
  TileHoverHighlighter.injectFontStylesheet();
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;
  const selectEl = root.querySelector(`select[name="${MODULE_ID}.${SETTINGS.LABEL_FONT}"]`);
  TileHoverHighlighter.applyFontPreviewToSelect(selectEl);
  TileHoverHighlighter.injectPushWarning(root);
});

Hooks.on("canvasReady", () => TileHoverHighlighter.setupForScene());
Hooks.on("canvasTearDown", () => TileHoverHighlighter.teardown());
Hooks.on("updateScene", (scene, changes) => TileHoverHighlighter.onSceneUpdate(scene, changes));
Hooks.on("updateTile", (tileDoc) => TileHoverHighlighter.onTileChanged(tileDoc));
Hooks.on("deleteTile", (tileDoc) => TileHoverHighlighter.onTileDeleted(tileDoc));
Hooks.on("createTile", () => TileHoverHighlighter.onTileCreated());
Hooks.on("renderSceneConfig", (app, html) => injectSceneConfig(app, html));
Hooks.on("renderTileConfig", (app, html) => injectTileConfig(app, html));

globalThis.TileHoverHighlighter = TileHoverHighlighter;
