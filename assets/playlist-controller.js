(function(){
  "use strict";

  /** Owns playlist persistence, resume positions, and the save/rename dialog. */
  function create(options){
    const {
      byId,on,fetchJson,domain,dialog,form,nameInput,message,
      getTracks,getQueue,getQueueIndex,getSelectedPlaylistId,setSelectedPlaylistId,
      getSelectedGroup,setSelectedGroup,getMediaType,isEditable,renderAll,renderQueue,showToast,
    }=options;
    let playlists=[];
    let activeId=null;
    let dialogMode="create";
    const resumeWrites=new Map();
    const request=domain.request;

    const list=()=>playlists;
    const byPlaylistId=id=>playlists.find(playlist=>playlist.id===id)||null;
    const tracksFor=playlist=>playlist?playlist.track_ids.map(id=>getTracks().find(track=>track.id===id)).filter(Boolean):[];
    const matchesQueue=playlist=>domain.queueMatchesPlaylist(getQueue(),playlist);
    function resumeIndex(playlist){
      const saved=playlist?.resume_track_id;
      if(!Number.isInteger(saved))return 0;
      const index=playlist.track_ids.indexOf(saved);
      return index<0?0:index;
    }
    function persistResume(playlist,trackId){
      const previous=resumeWrites.get(playlist.id)||Promise.resolve();
      const next=previous.catch(()=>{}).then(()=>request(`/api/playlists/${encodeURIComponent(playlist.id)}/resume`,{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({track_id:trackId}),
      })).catch(error=>console.warn("[playlist] resume save failed",error));
      resumeWrites.set(playlist.id,next);
    }
    function syncActive(){
      const playlist=byPlaylistId(activeId);
      if(!playlist){activeId=null; return;}
      if(!matchesQueue(playlist))return;
      const trackId=getQueue()[getQueueIndex()];
      if(!Number.isInteger(trackId)||playlist.resume_track_id===trackId)return;
      playlist.resume_track_id=trackId;
      persistResume(playlist,trackId);
    }
    async function load(render=true){
      const data=await fetchJson("/api/playlists");
      playlists=data.playlists||[];
      if(getSelectedPlaylistId()&&!byPlaylistId(getSelectedPlaylistId())){
        setSelectedPlaylistId(null);
        if(!playlists.length)setSelectedGroup("All");
      }
      if(render&&getMediaType()==="music")renderAll();
    }
    function updateSaveAction(){
      const button=byId("saveQueuePlaylist");
      if(!button)return;
      const playlist=byPlaylistId(activeId);
      const label=playlist?`Update ${playlist.name} from queue`:"Save queue as playlist";
      button.title=label;
      button.setAttribute("aria-label",label);
      button.dataset.playlistId=playlist?.id||"";
    }
    async function updateFromQueue(playlist){
      if(!isEditable())return;
      const trackIds=domain.uniqueAvailableTrackIds(getQueue(),getTracks());
      if(!trackIds.length){showToast("Queue is empty"); return;}
      try{
        await request(`/api/playlists/${encodeURIComponent(playlist.id)}`,{
          method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({track_ids:trackIds}),
        });
        await load(false); syncActive(); showToast("Playlist updated"); renderAll(); renderQueue();
      }catch(error){showToast(error.message);}
    }
    function saveOrUpdate(){
      const playlist=byPlaylistId(activeId);
      if(playlist){updateFromQueue(playlist); return;}
      openDialog("create");
    }
    function openDialog(mode,playlist=null){
      if(!isEditable())return;
      if(mode==="create"&&!getQueue().length){showToast("Queue is empty"); return;}
      dialogMode=mode;
      dialog.dataset.playlistId=playlist?.id||"";
      byId("playlistDialogTitle").textContent=mode==="rename"?"Rename Playlist":"Save Playlist";
      byId("confirmPlaylist").textContent=mode==="rename"?"Rename":"Save";
      nameInput.value=playlist?.name||"";
      message.textContent=""; message.className="message";
      dialog.showModal();
      requestAnimationFrame(()=>nameInput.focus());
    }
    async function submit(event){
      event.preventDefault();
      const name=nameInput.value.trim();
      if(!name){message.className="message error"; message.textContent="Enter a playlist name."; return;}
      if(name.length>80){message.className="message error"; message.textContent="Playlist names must be 80 characters or fewer."; return;}
      message.textContent=dialogMode==="rename"?"Renaming...":"Saving...";
      try{
        if(dialogMode==="rename"){
          await request(`/api/playlists/${encodeURIComponent(dialog.dataset.playlistId)}`,{
            method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({name}),
          });
        }else{
          const trackIds=domain.uniqueAvailableTrackIds(getQueue(),getTracks());
          const result=await request("/api/playlists",{
            method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,track_ids:trackIds}),
          });
          activeId=result.id;
        }
        await load(false); syncActive(); dialog.close();
        showToast(dialogMode==="rename"?"Playlist renamed":"Playlist saved"); renderAll();
      }catch(error){message.className="message error"; message.textContent=error.message;}
    }
    async function remove(playlist){
      if(!isEditable()||!confirm(`Delete playlist "${playlist.name}"?`))return;
      try{
        await request(`/api/playlists/${encodeURIComponent(playlist.id)}`,{method:"DELETE"});
        if(activeId===playlist.id)activeId=null;
        setSelectedPlaylistId(null);
        await load(false); showToast("Playlist deleted"); renderAll();
      }catch(error){showToast(error.message);}
    }
    function bindDialog(){
      on(form,"submit",submit);
      on(byId("closePlaylistDialog"),"click",()=>dialog.close());
      on(byId("cancelPlaylistDialog"),"click",()=>dialog.close());
      on(dialog,"click",event=>{if(event.target===dialog)dialog.close();});
    }
    return {
      activeId:()=>activeId,
      bindDialog,
      byId:byPlaylistId,
      delete:remove,
      list,
      load,
      matchesQueue,
      openDialog,
      resumeIndex,
      saveOrUpdate,
      setActiveId:id=>{activeId=id;},
      syncActive,
      tracksFor,
      updateSaveAction,
    };
  }

  window.MediaPlayerPlaylistController={create};
})();
