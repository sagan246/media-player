(function(){
  "use strict";

  /** Wire the shared audio element without owning library or queue state. */
  function bindAudio(options){
    const {
      on,byId,player,seekBar,volumeBar,currentTimeEl,durationEl,fmt,
      getPlayingId,getQueue,getQueueIndex,getRepeatMode,isSeeking,setSeeking,
      isSwitching,setSwitching,mediaSession,listeningRecorder,startVisualizer,
      stopVisualizer,saveState,updateNow,renderQueue,playCurrent,playQueueIndex,
      rememberDuration,remainingText,updateLyrics,setVolume,
    }=options;
    on(player,"canplay",()=>console.debug("[audio] browser canplay",{src:player.currentSrc,currentTime:player.currentTime}));
    on(player,"playing",()=>console.debug("[audio] browser playing",{src:player.currentSrc,currentTime:player.currentTime}));
    on(player,"play",()=>{
      setSwitching(false); mediaSession.setup(); listeningRecorder.ensure(getPlayingId());
      startVisualizer(); saveState({force:true}); updateNow();
    });
    on(player,"pause",()=>{
      mediaSession.setup(); saveState({force:true}); listeningRecorder.flush();
      if(isSwitching())return;
      stopVisualizer(); updateNow();
    });
    on(player,"ended",()=>{
      mediaSession.setup(); stopVisualizer(); listeningRecorder.flush();
      if(getRepeatMode()==="one"){
        player.currentTime=0;
        listeningRecorder.reset(getPlayingId());
        playCurrent({retry:true});
        return;
      }
      if(getQueueIndex()+1<getQueue().length)playQueueIndex(getQueueIndex()+1);
      else if(getRepeatMode()==="all"&&getQueue().length)playQueueIndex(0);
    });
    on(player,"loadedmetadata",()=>{
      mediaSession.setup();
      seekBar.value=player.duration?Math.round((player.currentTime/player.duration)*1000):0;
      currentTimeEl.textContent=fmt(player.currentTime);
      durationEl.textContent=fmt(player.duration);
      const current=byId("npCurrentTime"),duration=byId("npDuration"),seek=byId("npSeekBar");
      if(current)current.textContent=currentTimeEl.textContent;
      if(duration)duration.textContent=remainingText();
      if(seek)seek.value=seekBar.value;
      if(getPlayingId()!==null&&Number.isFinite(player.duration))rememberDuration(getPlayingId(),player.duration);
      updateNow(); renderQueue();
    });
    on(player,"error",()=>console.warn("[audio] browser audio error",{code:player.error?.code,message:player.error?.message,src:player.currentSrc,id:getPlayingId()}));
    on(player,"timeupdate",()=>{
      if(isSeeking())return;
      currentTimeEl.textContent=fmt(player.currentTime);
      seekBar.value=player.duration?Math.round((player.currentTime/player.duration)*1000):0;
      const current=byId("npCurrentTime"),duration=byId("npDuration"),seek=byId("npSeekBar");
      if(current)current.textContent=currentTimeEl.textContent;
      if(duration)duration.textContent=remainingText();
      if(seek)seek.value=seekBar.value;
      updateLyrics(); listeningRecorder.update(getPlayingId()); saveState();
    });
    on(seekBar,"input",()=>setSeeking(true));
    on(seekBar,"change",()=>{
      if(player.duration)player.currentTime=(Number(seekBar.value)/1000)*player.duration;
      setSeeking(false); saveState({force:true});
    });
    on(volumeBar,"input",()=>setVolume(volumeBar.value));
  }

  /** Wire video persistence and queue transitions around the native player. */
  function bindVideo(options){
    const {on,player,saveState,updateButtons,getRepeatMode,getQueue,getQueueIndex,playQueueIndex}=options;
    on(player,"play",()=>{saveState({force:true}); updateButtons();});
    on(player,"pause",()=>{saveState({force:true}); updateButtons();});
    on(player,"timeupdate",()=>saveState());
    on(player,"seeked",()=>saveState({force:true}));
    on(player,"ended",()=>{
      saveState({force:true}); updateButtons();
      if(getRepeatMode()==="one"){player.currentTime=0; player.play(); return;}
      if(getQueueIndex()+1<getQueue().length)playQueueIndex(getQueueIndex()+1);
      else if(getRepeatMode()==="all"&&getQueue().length)playQueueIndex(0);
    });
  }

  window.MediaPlayerPlaybackEvents={bindAudio,bindVideo};
})();
