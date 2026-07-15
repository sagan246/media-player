(function(){
  "use strict";

  /**
   * Accumulate real listening time and batch writes to the stats API.
   * Short skips are ignored, while a play is counted only after a threshold.
   */
  function create({player, getTrack, buildPayload, send, onFlush, minRecordSeconds=5}){
    let session = null;
    let lastSentAt = 0;

    function reset(trackId){
      const track = getTrack(trackId);
      session = track ? {
        trackId: track.id,
        lastTime: Number.isFinite(player.currentTime) ? player.currentTime : 0,
        pendingSeconds: 0,
        listenedSeconds: 0,
        playCounted: false,
      } : null;
      lastSentAt = Date.now();
    }

    function isFor(trackId){
      return !!session && session.trackId === trackId;
    }

    function ensure(trackId){
      if(!isFor(trackId)) reset(trackId);
    }

    function playThreshold(){
      const duration = Number(player.duration) || 0;
      return duration > 0 ? Math.min(30, Math.max(10, duration * .5)) : 30;
    }

    function flush({countPlay=false}={}){
      if(!session) return false;
      const track = getTrack(session.trackId);
      if(!track) return false;
      const seconds = Math.max(0, session.pendingSeconds);
      if(!countPlay && seconds < minRecordSeconds) return false;
      session.pendingSeconds = 0;
      send({track:buildPayload(track), seconds, count_play:countPlay});
      if(onFlush) onFlush();
      return true;
    }

    function update(trackId){
      if(trackId === null || player.paused || player.ended) return;
      ensure(trackId);
      if(!session) return;

      const current = Number(player.currentTime) || 0;
      const delta = current - session.lastTime;
      session.lastTime = current;
      if(delta > 0 && delta < 8){
        session.pendingSeconds += delta;
        session.listenedSeconds += delta;
      }

      const countPlay = !session.playCounted && session.listenedSeconds >= playThreshold();
      if(countPlay) session.playCounted = true;
      if(countPlay || session.pendingSeconds >= 15 || Date.now() - lastSentAt > 30000){
        lastSentAt = Date.now();
        flush({countPlay});
      }
    }

    return {reset, ensure, isFor, flush, update};
  }

  window.MediaPlayerListeningStatsRecorder = {create};
})();
