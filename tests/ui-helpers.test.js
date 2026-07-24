const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");

global.window = {};
require(path.join(__dirname, "..", "assets", "ui-helpers.js"));

const {reconcileQueue} = window.MediaPlayerUi;

test("catalog refresh keeps the active queue item when it still exists", () => {
  const state = reconcileQueue([10, 11, 12], 1, 11, new Set([11, 12]));
  assert.deepEqual(state, {
    queue: [11, 12],
    queueIndex: 0,
    activeId: 11,
    activeChanged: false,
  });
});

test("catalog refresh advances when the active queue item was removed", () => {
  const state = reconcileQueue([10, 11, 12], 1, 11, new Set([10, 12]));
  assert.deepEqual(state, {
    queue: [10, 12],
    queueIndex: 1,
    activeId: 12,
    activeChanged: true,
  });
});
