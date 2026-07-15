(function(){
  "use strict";

  /**
   * Store one playback state object with throttled writes and one-time restore.
   * Queue interpretation stays in the music/video domain modules.
   */
  function create({key, buildState, parseState, throttleMs=3000, storage=localStorage}){
    let restored = false;
    let lastSaveAt = 0;

    function save(values, {force=false}={}){
      if(!force && Date.now() - lastSaveAt < throttleMs) return false;
      lastSaveAt = Date.now();
      storage.setItem(key, JSON.stringify(buildState(values)));
      return true;
    }

    function clear(){
      storage.removeItem(key);
    }

    function peek(){
      try{ return JSON.parse(storage.getItem(key) || "null"); }
      catch{ return null; }
    }

    function restore(validIds){
      if(restored) return null;
      restored = true;
      return parseState(storage.getItem(key), validIds);
    }

    return {save, clear, peek, restore};
  }

  window.MediaPlayerPlaybackPersistence = {create};
})();
