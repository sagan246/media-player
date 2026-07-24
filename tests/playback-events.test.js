const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");

global.window = {};
require(path.join(__dirname, "..", "assets", "playback-events.js"));

class FakeTarget extends EventTarget {
  constructor(){
    super();
    this.value = "0";
    this.textContent = "";
  }
}

test("Repeat One starts a fresh listening session before replaying", () => {
  const player = new FakeTarget();
  player.currentTime = 123;
  const calls = [];
  const inert = new FakeTarget();

  window.MediaPlayerPlaybackEvents.bindAudio({
    on:(target,event,handler)=>target.addEventListener(event,handler),
    byId:()=>null,
    player,
    seekBar:inert,
    volumeBar:inert,
    currentTimeEl:inert,
    durationEl:inert,
    fmt:()=>"",
    getPlayingId:()=>7,
    getQueue:()=>[7],
    getQueueIndex:()=>0,
    getRepeatMode:()=>"one",
    isSeeking:()=>false,
    setSeeking:()=>{},
    isSwitching:()=>false,
    setSwitching:()=>{},
    mediaSession:{setup:()=>{}},
    listeningRecorder:{
      flush:()=>calls.push("flush"),
      reset:id=>calls.push(`reset:${id}`),
      ensure:()=>{},
      update:()=>{},
    },
    startVisualizer:()=>{},
    stopVisualizer:()=>{},
    saveState:()=>{},
    updateNow:()=>{},
    renderQueue:()=>{},
    playCurrent:()=>calls.push("play"),
    playQueueIndex:()=>{},
    rememberDuration:()=>{},
    remainingText:()=>"",
    updateLyrics:()=>{},
    setVolume:()=>{},
  });

  player.dispatchEvent(new Event("ended"));

  assert.equal(player.currentTime,0);
  assert.deepEqual(calls,["flush","reset:7","play"]);
});
