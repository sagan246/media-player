(function(){
  "use strict";
  function normalizePlaybackContext(context){
    if(!context || typeof context !== "object")return null;
    const kind=String(context.kind||"").trim().slice(0,40);
    const label=String(context.label||"").trim().slice(0,160);
    if(!kind && !label)return null;
    return {kind:kind||"Queue",label,shuffled:Boolean(context.shuffled)};
  }
  function buildPlaybackState({queue,queueKeys,queueIndex,playingId,playingKey,selectedId,selectedKey,activePlaylistId,currentTime,repeatMode,context}){
    return {
      queue:[...queue],
      queueKeys:Array.isArray(queueKeys)?[...queueKeys]:[],
      queueIndex,
      playingId,
      playingKey:playingKey||"",
      selectedId,
      selectedKey:selectedKey||"",
      activePlaylistId,
      currentTime:Number.isFinite(currentTime)?currentTime:0,
      repeatMode,
      context:normalizePlaybackContext(context),
      updatedAt:Date.now(),
    };
  }
  function resolveStableQueue(state,catalog){
    if(!catalog?.keyToId || !Array.isArray(state.queueKeys) || state.queueKeys.length!==state.queue.length)return null;
    const originalIndex=Math.min(Math.max(Number(state.queueIndex)||0,0),state.queueKeys.length-1);
    const resolved=state.queueKeys
      .map((key,index)=>({id:catalog.keyToId.get(key),index}))
      .filter(item=>Number.isInteger(item.id));
    if(!resolved.length)return null;
    let active=resolved.find(item=>item.index===originalIndex)
      || resolved.find(item=>item.index>originalIndex)
      || resolved.at(-1);
    const queue=resolved.map(item=>item.id);
    const queueIndex=resolved.indexOf(active);
    const playingId=queue[queueIndex];
    const selectedId=catalog.keyToId.get(state.selectedKey)||playingId;
    return {
      ...state,
      queue,
      queueIndex,
      playingId,
      selectedId,
      currentTime:active.index===originalIndex?(Number(state.currentTime)||0):0,
    };
  }
  function parsePlaybackState(raw,catalog){
    let state=null;
    try{state=JSON.parse(raw||"null");}catch{return null;}
    if(!state||!Array.isArray(state.queue)||!state.queue.length)return null;
    const stable=resolveStableQueue(state,catalog);
    if(stable)return stable;
    const validIds=catalog instanceof Set?catalog:catalog?.ids;
    if(!(validIds instanceof Set))return null;
    const originalIndex=Math.min(Math.max(Number(state.queueIndex)||0,0),state.queue.length-1);
    const resolved=state.queue.map((id,index)=>({id:Number(id),index})).filter(item=>validIds.has(item.id));
    if(!resolved.length)return null;
    const active=resolved.find(item=>item.index===originalIndex)||resolved.find(item=>item.index>originalIndex)||resolved.at(-1);
    const queue=resolved.map(item=>item.id);
    const queueIndex=resolved.indexOf(active);
    return {...state,queue,queueIndex,playingId:queue[queueIndex],selectedId:queue[queueIndex],currentTime:active.index===originalIndex?(Number(state.currentTime)||0):0};
  }
  function prepareSource(player,track,{resumeAt=0}={}){
    const seconds=Number(resumeAt)||0;
    if(seconds>0){
      player.addEventListener("loadedmetadata",()=>{
        if(Number.isFinite(player.duration))player.currentTime=Math.min(seconds,Math.max(0,player.duration-.25));
      },{once:true});
    }
    player.src=track.audio_url;
    player.load();
  }

  function normalizeAlbumPart(value){
    return String(value ?? "").trim().toLocaleLowerCase();
  }

  /**
   * Album titles are not unique. The containing folder is the strongest
   * release boundary in a folder-based library; artist metadata is the
   * fallback for tracks that live at the library root.
   */
  function albumIdentity(track){
    const title=normalizeAlbumPart(track?.album || "(No album)");
    const owner=normalizeAlbumPart(track?.folder || track?.albumartist || track?.artist || "(unknown)");
    return JSON.stringify([title,owner]);
  }

  function parseReleaseDate(value){
    const match=String(value ?? "").trim().match(/^(\d{4})(?:[-./](\d{1,2}))?(?:[-./](\d{1,2}))?/);
    if(!match)return null;
    const year=Number(match[1]), month=match[2] ? Number(match[2]) : 0, day=match[3] ? Number(match[3]) : 0;
    if(year<1 || month<0 || month>12 || day<0 || day>31)return null;
    if(day && (!month || day>new Date(Date.UTC(year,month,0)).getUTCDate()))return null;
    return year*10000+month*100+day;
  }

  function albumReleaseDate(tracks){
    const dates=tracks.map(track=>parseReleaseDate(track?.date)).filter(Number.isFinite);
    return dates.length ? Math.min(...dates) : null;
  }

  function albumEntries(source){
    const albums=new Map();
    for(const track of source){
      const key=albumIdentity(track);
      if(!albums.has(key))albums.set(key,[]);
      albums.get(key).push(track);
    }
    return [...albums.entries()];
  }

  function trackSortParts(track){
    return {
      disc:Number(track?.sort_disc)||1,
      track:Number(track?.sort_track)||9999,
    };
  }

  function sortAlbumTracks(tracks){
    return [...tracks].sort((a,b)=>{
      const aOrder=trackSortParts(a), bOrder=trackSortParts(b);
      if(aOrder.disc!==bOrder.disc)return aOrder.disc-bOrder.disc;
      if(aOrder.track!==bOrder.track)return aOrder.track-bOrder.track;
      return String(a.title||"").localeCompare(String(b.title||""),undefined,{numeric:true,sensitivity:"base"});
    });
  }

  /**
   * Unknown dates remain last in either direction. Titles are always the
   * deterministic tie-breaker instead of reversing alphabetical order.
   */
  function sortAlbumEntries(entries,direction="newest"){
    const multiplier=direction==="oldest" ? 1 : -1;
    return [...entries].sort((a,b)=>{
      const aDate=albumReleaseDate(a[1]), bDate=albumReleaseDate(b[1]);
      if(aDate===null && bDate!==null)return 1;
      if(aDate!==null && bDate===null)return -1;
      if(aDate!==null && bDate!==null && aDate!==bDate)return (aDate-bDate)*multiplier;
      const aTitle=String(a[1][0]?.album || "(No album)");
      const bTitle=String(b[1][0]?.album || "(No album)");
      return aTitle.localeCompare(bTitle,undefined,{numeric:true,sensitivity:"base"}) || a[0].localeCompare(b[0]);
    });
  }

  window.MediaPlayerMusicDomain={
    albumEntries,
    albumIdentity,
    albumReleaseDate,
    buildPlaybackState,
    normalizePlaybackContext,
    parsePlaybackState,
    parseReleaseDate,
    prepareSource,
    resolveStableQueue,
    sortAlbumEntries,
    sortAlbumTracks,
    trackSortParts,
  };
})();
