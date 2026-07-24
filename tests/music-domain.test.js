const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");

global.window = {};
require(path.join(__dirname, "..", "assets", "music-domain.js"));

const {
  albumEntries,
  albumIdentity,
  albumReleaseDate,
  parseReleaseDate,
  parsePlaybackState,
  sortAlbumTracks,
  sortAlbumEntries,
  buildPlaybackState,
} = global.window.MediaPlayerMusicDomain;

test("album tracks use explicit disc and track order without browser paths", () => {
  const source = [
    {title:"Second disc", sort_disc:2, sort_track:1},
    {title:"Second", sort_disc:1, sort_track:2},
    {title:"First", sort_disc:1, sort_track:1},
  ];

  assert.deepEqual(sortAlbumTracks(source).map(track => track.title), ["First", "Second", "Second disc"]);
});

test("album identity separates matching titles in different release folders", () => {
  const first = {album:"Live", albumartist:"Artist A", folder:"Artist A/Live"};
  const second = {album:"Live", albumartist:"Artist B", folder:"Artist B/Live"};

  assert.notEqual(albumIdentity(first), albumIdentity(second));
  assert.equal(albumEntries([first, second]).length, 2);
});

test("album identity remains stable when album artist is missing on one track", () => {
  const tagged = {album:"Radio", albumartist:"Artist", folder:"Artist/2008 Radio"};
  const untagged = {album:"Radio", albumartist:"", folder:"Artist/2008 Radio"};

  assert.equal(albumIdentity(tagged), albumIdentity(untagged));
});

test("album identity separates matching titles in different folders", () => {
  const first = {album:"Radio", folder:"Artist/2008 Radio"};
  const second = {album:"Radio", folder:"Artist/2009 Radio"};

  assert.notEqual(albumIdentity(first), albumIdentity(second));
});

test("release dates retain month and day precision", () => {
  assert.equal(parseReleaseDate("2024-11-08"), 20241108);
  assert.equal(parseReleaseDate("2024/2/3"), 20240203);
  assert.equal(parseReleaseDate("2024"), 20240000);
  assert.equal(parseReleaseDate("2024-02-31"), null);
  assert.equal(parseReleaseDate("unknown"), null);
  assert.equal(albumReleaseDate([{date:"2024-11-08"}, {date:"2024-11-09"}]), 20241108);
});

test("newest and oldest use explicit chronology with stable title ties", () => {
  const source = [
    {album:"January", albumartist:"Artist", date:"2024-01-15"},
    {album:"December", albumartist:"Artist", date:"2024-12-01"},
    {album:"Alpha", albumartist:"Artist", date:"2024-06-01"},
    {album:"Beta", albumartist:"Artist", date:"2024-06-01"},
    {album:"Unknown", albumartist:"Artist", date:""},
  ];
  const entries = albumEntries(source);
  const names = direction => sortAlbumEntries(entries, direction).map(([, tracks]) => tracks[0].album);

  assert.deepEqual(names("newest"), ["December", "Alpha", "Beta", "January", "Unknown"]);
  assert.deepEqual(names("oldest"), ["January", "Alpha", "Beta", "December", "Unknown"]);
});

test("saved queues retain the active track after scan IDs change", () => {
  const state = {
    queue:[10,11,12],
    queueKeys:["removed","active","next"],
    queueIndex:1,
    playingId:11,
    playingKey:"active",
    selectedId:11,
    selectedKey:"active",
    currentTime:42,
  };
  const restored = parsePlaybackState(JSON.stringify(state), {
    ids:new Set([3,4]),
    keyToId:new Map([["active",3],["next",4]]),
  });

  assert.deepEqual(restored.queue,[3,4]);
  assert.equal(restored.queueIndex,0);
  assert.equal(restored.playingId,3);
  assert.equal(restored.selectedId,3);
  assert.equal(restored.currentTime,42);
});

test("saved queues advance cleanly when the active track was removed", () => {
  const state = {
    queue:[10,11,12],
    queueKeys:["previous","removed","next"],
    queueIndex:1,
    currentTime:42,
  };
  const restored = parsePlaybackState(JSON.stringify(state), {
    ids:new Set([3,4]),
    keyToId:new Map([["previous",3],["next",4]]),
  });

  assert.deepEqual(restored.queue,[3,4]);
  assert.equal(restored.queueIndex,1);
  assert.equal(restored.playingId,4);
  assert.equal(restored.currentTime,0);
});

test("music playback state keeps a normalized queue source", () => {
  const state = buildPlaybackState({
    queue:[1],
    queueKeys:["one"],
    queueIndex:0,
    playingId:1,
    playingKey:"one",
    selectedId:1,
    selectedKey:"one",
    activePlaylistId:null,
    currentTime:4,
    repeatMode:"off",
    context:{kind:"Album", label:"Example", shuffled:true},
  });

  assert.deepEqual(state.context,{kind:"Album",label:"Example",shuffled:true});
});
