const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");

function elementStub(){
  const classes = new Set();
  const properties = new Map();
  return {
    classList:{
      add:value=>classes.add(value),
      remove:value=>classes.delete(value),
      contains:value=>classes.has(value),
    },
    dataset:{},
    style:{
      setProperty:(name,value)=>properties.set(name,String(value)),
      removeProperty:name=>properties.delete(name),
      getPropertyValue:name=>properties.get(name) || "",
    },
    _classes:classes,
    _properties:properties,
  };
}

const body = elementStub();
const root = elementStub();
const themeMeta = {content:"", setAttribute(name,value){if(name === "content") this.content=value;}};

global.window = {matchMedia:()=>({matches:false})};
global.document = {
  body,
  documentElement:root,
  querySelector:selector=>selector === 'meta[name="theme-color"]' ? themeMeta : null,
};
global.localStorage = {
  values:new Map(),
  getItem(key){return this.values.get(key) || null;},
  setItem(key,value){this.values.set(key,String(value));},
};

require(path.join(__dirname, "..", "assets", "theme-data.js"));
require(path.join(__dirname, "..", "assets", "theme-engine.js"));

const engine = window.MediaPlayerThemeEngine;

test("theme descriptors retain adaptive light and dark choices", () => {
  assert.equal(new Set(engine.THEME_CHOICES.map(theme => theme.id)).size, engine.THEME_CHOICES.length);
  assert.equal(engine.themeById("albumAdaptiveLight").mode, "light");
  assert.equal(engine.themeById("albumAdaptive").mode, "dark");
  assert.equal(engine.isAdaptiveTheme("albumAdaptiveLight"), true);
  assert.equal(engine.isAdaptiveTheme("blue"), false);
});

test("unknown saved themes fall back to the configured default", () => {
  localStorage.values.set("accentTheme", "removed-theme");
  localStorage.values.set("themePreferenceExplicit", "true");
  assert.equal(engine.initialTheme(), engine.DEFAULT_THEME_ID);
  localStorage.values.clear();
});

test("applying a theme exposes semantic mode and family state", () => {
  const theme = engine.themeById("lightPurple");
  engine.applyThemeClass(theme);

  assert.equal(body.dataset.themeMode, "light");
  assert.equal(body.dataset.themeFamily, "purple");
  assert.equal(root.dataset.themeMode, "light");
  assert.equal(themeMeta.content, "#f5f3ff");
});

test("fixed palettes are applied through shared accent variables", () => {
  const theme = engine.themeById("green");
  engine.clearAccentThemeVars();
  engine.applyFixedColor(theme);

  assert.equal(body._properties.get("--accent-rgb"), "5,150,105");
  assert.equal(body._properties.get("--accent"), "#059669");
  assert.equal(body._properties.get("--track-number-color"), "#a7f3d0");
});

test("adaptive colors use the same shared accent variables", () => {
  engine.clearAccentThemeVars();
  engine.applyAdaptiveColor("albumAdaptiveLight", {r:20,g:100,b:180});

  assert.equal(body._properties.get("--accent-rgb"), "20,100,180");
  assert.ok(body._properties.get("--accent-link"));
  assert.ok(body._properties.get("--track-number-color"));
});
