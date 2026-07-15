(function(){
  "use strict";

  /** Owns metadata and embedded-artwork writes for Edit Mode. */
  function create(options){
    const {
      byId,on,esc,fetchJson,domain,detailEl,getTracks,getSelectedId,setSelectedId,
      getSelectedIds,clearSelectedIds,getPlayingId,applyAdaptiveTheme,renderRows,
      loadTracks,editHeaders,
    }=options;
    const field=(name,label,track)=>`<label>${label}<input name="${name}" maxlength="2000" value="${esc(track[name]||"")}"></label>`;

    function artworkPanel(track){
      const supported=["mp3","flac"].includes(String(track.format||"").toLowerCase());
      const help=supported
        ?"MP3/FLAC only. Changes write directly to the file. Album art uses the selected song's album tag."
        :"Artwork editing is only enabled for MP3 and FLAC.";
      return `<div class="artworkPanel"><strong>Artwork</strong><input id="artworkFile" type="file" accept="image/jpeg,image/png,image/webp" ${supported?"":"disabled"}><img id="artworkPreview" class="artworkPreview" alt=""><div class="actions artworkActions"><button type="button" id="saveSongArt" ${supported?"":"disabled"}>Replace Song Art</button><button type="button" class="secondary" id="saveAlbumArt" ${supported?"":"disabled"}>Replace Album Art</button></div><div class="message" id="artworkMsg">${help}</div></div>`;
    }
    function readArtworkFile(){
      return new Promise((resolve,reject)=>{
        const input=byId("artworkFile"),file=input?.files?.[0];
        if(!file){reject(new Error("Choose an artwork image first")); return;}
        if(!["image/jpeg","image/png","image/webp"].includes(file.type)){reject(new Error("Artwork must be JPG, PNG, or WEBP")); return;}
        if(file.size>20*1024*1024){reject(new Error("Artwork image must be 20 MB or smaller")); return;}
        const reader=new FileReader();
        reader.onload=()=>resolve(reader.result);
        reader.onerror=()=>reject(new Error("Could not read artwork image"));
        reader.readAsDataURL(file);
      });
    }
    async function saveArtwork(scope){
      const message=byId("artworkMsg"),selectedIds=getSelectedIds();
      try{
        if(scope==="selected"&&!selectedIds.size){message.className="message error"; message.textContent="Select tracks first."; return;}
        message.className="message";
        message.textContent=scope==="album"?"Saving album artwork...":scope==="selected"?"Saving selected artwork...":"Saving song artwork...";
        const imageData=await readArtworkFile();
        const result=await fetchJson(`/api/track/${getSelectedId()}/artwork`,{
          method:"POST",
          headers:editHeaders({"Content-Type":"application/json"}),
          body:JSON.stringify({scope,image_data:imageData,ids:[...selectedIds]}),
        });
        if(!result.ok){message.className="message error"; message.textContent=result.error||"Artwork save failed"; return;}
        message.className="message ok";
        message.textContent=`Saved artwork to ${result.changed} file${result.changed===1?"":"s"}.`;
        if(scope==="album"||scope==="selected")clearSelectedIds();
        await loadTracks(true,getSelectedId());
      }catch(error){message.className="message error"; message.textContent=error.message||String(error);}
    }
    async function saveSelected(event){
      event.preventDefault();
      const message=byId("msg"),data=domain.metadataPayload(event.currentTarget);
      message.className="message"; message.textContent="Saving...";
      const result=await fetchJson(`/api/track/${getSelectedId()}/metadata`,{
        method:"POST",headers:editHeaders({"Content-Type":"application/json"}),body:JSON.stringify(data),
      });
      if(!result.ok){message.className="message error"; message.textContent=result.error||"Save failed"; return;}
      message.className="message ok";
      message.textContent=result.changed.length?`Saved: ${result.changed.join(", ")}.`:"No changes.";
      await loadTracks(false,getSelectedId());
    }
    function bindArtworkControls(){
      const input=byId("artworkFile"),preview=byId("artworkPreview");
      if(!input)return;
      on(input,"change",()=>{const file=input.files?.[0]; if(!file)return; preview.src=URL.createObjectURL(file); preview.style.display="block";});
      const songButton=byId("saveSongArt"),albumButton=byId("saveAlbumArt"),selectedButton=byId("saveSelectedArt");
      if(songButton)on(songButton,"click",()=>saveArtwork("song"));
      if(albumButton)on(albumButton,"click",()=>saveArtwork("album"));
      if(selectedButton)on(selectedButton,"click",()=>saveArtwork("selected"));
    }
    function selectTrack(id){
      setSelectedId(id);
      const track=getTracks().find(item=>item.id===id);
      if(!track)return;
      if(getPlayingId()===null)applyAdaptiveTheme();
      detailEl.innerHTML=`${track.has_artwork?`<img class="bigCover" src="${track.artwork_url}" alt="">`:`<div class="bigCover emptyCover">No Artwork</div>`}<div class="detailTitle">${esc(track.title)}</div><div class="detailSub">${esc(track.artist||"Unknown artist")} - ${esc(track.album||"No album")} ${track.date?`(${esc(track.date)})`:""}</div>${artworkPanel(track)}<form id="editForm">${field("title","Title",track)}${field("artist","Artist",track)}${field("album","Album",track)}${field("albumartist","Album Artist",track)}${field("date","Date",track)}${field("tracknumber","Track Number",track)}${field("genre","Genre",track)}<label>Path<input value="${esc(track.path)}" disabled></label><div class="actions"><button type="submit">Save Metadata</button><button type="button" class="secondary" id="resetBtn">Reset</button></div><div class="message" id="msg"></div></form>`;
      on(byId("editForm"),"submit",saveSelected);
      on(byId("resetBtn"),"click",()=>selectTrack(id));
      bindArtworkControls();
      renderRows();
    }
    async function bulkSave(){
      const inputs={artist:byId("bulkArtist"),album:byId("bulkAlbum"),albumartist:byId("bulkAlbumArtist"),date:byId("bulkDate"),genre:byId("bulkGenre")};
      const values=domain.bulkMetadataPayload(inputs),selectedIds=getSelectedIds();
      const result=await fetchJson("/api/bulk/metadata",{
        method:"POST",headers:editHeaders({"Content-Type":"application/json"}),body:JSON.stringify({ids:[...selectedIds],values}),
      });
      if(!result.ok){alert(result.error||"Bulk save failed"); return;}
      const changed=result.results.filter(item=>item.ok).length;
      clearSelectedIds();
      alert(`Bulk save complete for ${changed} files. Selection cleared.`);
      await loadTracks(false,getSelectedId());
    }
    return {bulkSave,selectTrack};
  }

  window.MediaPlayerEditController={create};
})();
