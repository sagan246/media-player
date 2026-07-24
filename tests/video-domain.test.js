const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");

global.window = {};
require(path.join(__dirname, "..", "assets", "video-domain.js"));

test("video ordering uses public folder and title fields", () => {
  const source = [
    {folder:"Concert B", title:"2 Finale", year:2024},
    {folder:"Concert A", title:"10 Encore", year:2023},
    {folder:"Concert A", title:"2 Opening", year:2023},
  ];

  assert.deepEqual(
    [...source].sort(window.MediaPlayerVideoDomain.videoFileCompare).map(video => video.title),
    ["2 Opening", "10 Encore", "2 Finale"],
  );
  assert.equal(window.MediaPlayerVideoDomain.videoYear(source[0]), 2024);
});

test("saved video queues retain the active video after scan IDs change", () => {
  const state = {
    videoQueue:[10,11,12],
    videoQueueKeys:["removed","active","next"],
    videoQueueIndex:1,
    selectedVideoId:11,
    selectedVideoKey:"active",
    currentTime:75,
  };
  const restored = window.MediaPlayerVideoDomain.parsePlaybackState(JSON.stringify(state), {
    ids:new Set([3,4]),
    keyToId:new Map([["active",3],["next",4]]),
  });

  assert.deepEqual(restored.videoQueue,[3,4]);
  assert.equal(restored.videoQueueIndex,0);
  assert.equal(restored.selectedVideoId,3);
  assert.equal(restored.currentTime,75);
});

test("video playback state keeps a normalized queue source", () => {
  const state = window.MediaPlayerVideoDomain.buildPlaybackState({
    videoQueue:[1],
    videoQueueKeys:["one"],
    videoQueueIndex:0,
    selectedVideoId:1,
    selectedVideoKey:"one",
    currentTime:8,
    videoRepeatMode:"all",
    context:{kind:"Folder",label:"Concert",shuffled:false},
  });

  assert.deepEqual(state.context,{kind:"Folder",label:"Concert",shuffled:false});
});
