(function(){
  "use strict";

  /** Keep browser and lock-screen media controls separate from playback state. */
  function create({onPlay, onPause, onPrevious, onNext, artworkFor}){
    const supported = "mediaSession" in navigator;

    function setAction(action, handler){
      if(!supported) return;
      try{ navigator.mediaSession.setActionHandler(action, handler); }catch{}
    }

    function setup(){
      if(!supported) return;
      setAction("play", onPlay);
      setAction("pause", onPause);
      setAction("previoustrack", onPrevious);
      setAction("nexttrack", onNext);

      // Clearing seek actions makes iOS prefer previous/next track controls.
      setAction("seekbackward", null);
      setAction("seekforward", null);
      setAction("seekto", null);
    }

    function update(track, {paused=false}={}){
      if(!supported || !track) return;
      setup();
      try{
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title || "Unknown title",
          artist: track.artist || "Unknown artist",
          album: track.album || "",
          artwork: artworkFor ? artworkFor(track) : [],
        });
        navigator.mediaSession.playbackState = paused ? "paused" : "playing";
      }catch{}
    }

    return {setup, update};
  }

  window.MediaPlayerMediaSession = {create};
})();
