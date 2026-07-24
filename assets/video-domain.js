(function(){
  "use strict";
  function yearFromText(text){const years=[...String(text||"").matchAll(/(?:19|20)\d{2}/g)].map(match=>Number(match[0])).filter(Boolean); return years.length?Math.max(...years):0;}
  function videoYear(video){return Number(video.year)||yearFromText(`${video.folder||""} ${video.title||""}`);}
  function videoFileCompare(a,b){
    const folderOrder=String(a.folder||"").localeCompare(String(b.folder||""),undefined,{numeric:true,sensitivity:"base"});
    return folderOrder || String(a.title||"").localeCompare(String(b.title||""),undefined,{numeric:true,sensitivity:"base"});
  }
  function normalizePlaybackContext(context){
    if(!context || typeof context !== "object")return null;
    const kind=String(context.kind||"").trim().slice(0,40);
    const label=String(context.label||"").trim().slice(0,160);
    if(!kind && !label)return null;
    return {kind:kind||"Queue",label,shuffled:Boolean(context.shuffled)};
  }
  function buildPlaybackState({videoQueue,videoQueueKeys,videoQueueIndex,selectedVideoId,selectedVideoKey,currentTime,videoRepeatMode,context}){return {videoQueue:[...videoQueue],videoQueueKeys:Array.isArray(videoQueueKeys)?[...videoQueueKeys]:[],videoQueueIndex,selectedVideoId,selectedVideoKey:selectedVideoKey||"",currentTime:Number.isFinite(currentTime)?currentTime:0,videoRepeatMode,context:normalizePlaybackContext(context),updatedAt:Date.now()};}
  function parsePlaybackState(raw,catalog){
    let state=null;
    try{state=JSON.parse(raw||"null");}catch{return null;}
    if(!state||!Array.isArray(state.videoQueue)||!state.videoQueue.length)return null;
    if(catalog?.keyToId&&Array.isArray(state.videoQueueKeys)&&state.videoQueueKeys.length===state.videoQueue.length){
      const originalIndex=Math.min(Math.max(Number(state.videoQueueIndex)||0,0),state.videoQueueKeys.length-1);
      const resolved=state.videoQueueKeys.map((key,index)=>({id:catalog.keyToId.get(key),index})).filter(item=>Number.isInteger(item.id));
      if(!resolved.length)return null;
      const active=resolved.find(item=>item.index===originalIndex)||resolved.find(item=>item.index>originalIndex)||resolved.at(-1);
      const videoQueue=resolved.map(item=>item.id);
      const videoQueueIndex=resolved.indexOf(active);
      return {...state,videoQueue,videoQueueIndex,selectedVideoId:videoQueue[videoQueueIndex],currentTime:active.index===originalIndex?(Number(state.currentTime)||0):0};
    }
    const validIds=catalog instanceof Set?catalog:catalog?.ids;
    if(!(validIds instanceof Set))return null;
    const originalIndex=Math.min(Math.max(Number(state.videoQueueIndex)||0,0),state.videoQueue.length-1);
    const resolved=state.videoQueue.map((id,index)=>({id:Number(id),index})).filter(item=>validIds.has(item.id));
    if(!resolved.length)return null;
    const active=resolved.find(item=>item.index===originalIndex)||resolved.find(item=>item.index>originalIndex)||resolved.at(-1);
    const videoQueue=resolved.map(item=>item.id);
    const videoQueueIndex=resolved.indexOf(active);
    return {...state,videoQueue,videoQueueIndex,selectedVideoId:videoQueue[videoQueueIndex],currentTime:active.index===originalIndex?(Number(state.currentTime)||0):0};
  }
  function prepareSource(player,video,{resumeAt=0,autoplay=true}={}){
    const seconds=Number(resumeAt)||0;
    if(seconds>0){
      player.addEventListener("loadedmetadata",()=>{
        if(Number.isFinite(player.duration))player.currentTime=Math.min(seconds,Math.max(0,player.duration-.25));
      },{once:true});
    }
    player.src=video.video_url;
    player.load();
    if(!autoplay){player.pause(); return;}
    const pending=player.play();
    if(pending&&typeof pending.catch==="function")pending.catch(()=>{});
  }
  window.MediaPlayerVideoDomain={yearFromText,videoYear,videoFileCompare,buildPlaybackState,normalizePlaybackContext,parsePlaybackState,prepareSource};
})();
