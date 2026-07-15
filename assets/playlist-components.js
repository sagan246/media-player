// Stateless playlist cards and detail markup.
(function(){
  const ui = window.MediaPlayerUi || {};
  const components = window.MediaPlayerComponents || {};
  const esc = ui.esc || (value => String(value ?? ""));
  const {cardActionsHtml, detailActionsHtml, detailPageHtml} = components;
  const renameIcon = `<svg class="buttonIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>`;
  const deleteIcon = `<svg class="buttonIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 15h10l1-15"/><path d="M10 11v6M14 11v6"/></svg>`;

  function actionsHtml(id){
    return cardActionsHtml([
      {action:"play", actionAttr:"playlist-action", valueName:"playlist-id", value:id, label:"Play playlist", icon:"&#9654;", primary:true},
      {action:"add", actionAttr:"playlist-action", valueName:"playlist-id", value:id, label:"Add playlist to queue", icon:"+", add:true},
      {action:"shuffle", actionAttr:"playlist-action", valueName:"playlist-id", value:id, label:"Shuffle playlist", icon:"&#8644;"},
    ]);
  }

  function artMosaicHtml(artUrls, className="albumArt"){
    const urls = [...new Set(artUrls.filter(Boolean))].slice(0,4);
    if(!urls.length) return `<div class="playlistNoArt">Playlist</div>`;
    const tiles = urls.length === 1 ? urls : urls.length === 2 ? [urls[0],urls[1],urls[0],urls[1]] : urls;
    return `<div class="playlistMosaic playlistTiles${tiles.length} ${className}">${tiles.map(url=>`<img src="${esc(url)}" alt="" loading="lazy" decoding="async">`).join("")}</div>`;
  }

  function cardHtml({playlist, artUrls, isPlaying=false}){
    const available = playlist.track_ids.length;
    const missing = playlist.missing_count ? ` - ${playlist.missing_count} unavailable` : "";
    return `<div class="albumCard playlistCard ${isPlaying?"playingNow":""}" data-playlist-id="${esc(playlist.id)}" tabindex="0">${actionsHtml(playlist.id)}<button class="artButton" data-playlist-open="${esc(playlist.id)}">${artMosaicHtml(artUrls)}</button><div class="albumName">${esc(playlist.name)}</div><div class="albumMeta">${available} track${available===1?"":"s"}${esc(missing)}</div></div>`;
  }

  function detailHtml({playlist, artUrls, formats, sizeMb, queueCount, queueIconHtml, editable}){
    const actions = detailActionsHtml([
      {id:"playlistPlay", label:"Play playlist", icon:"&#9654;", primary:true},
      {id:"playlistShuffle", label:"Shuffle playlist", icon:"&#8644;"},
      {id:"playlistAddQueue", label:"Add playlist to queue", icon:"+", add:true},
      {id:"playlistQueue", label:"Open queue", icon:`${queueIconHtml}<span>${esc(queueCount)}</span>`},
      ...(editable ? [
        {id:"playlistRename", label:"Rename playlist", icon:renameIcon},
        {id:"playlistDelete", label:"Delete playlist", icon:deleteIcon},
      ] : []),
    ]);
    const missing = playlist.missing_count ? `${playlist.missing_count} unavailable` : "";
    return detailPageHtml({
      classes:"playlistDetail",
      coverHtml:artMosaicHtml(artUrls,"albumDetailCover detailArt"),
      title:playlist.name,
      meta:"Playlist",
      stats:[`${playlist.track_ids.length} track${playlist.track_ids.length===1?"":"s"}`, formats.join(", "), `${sizeMb} MB`],
      actions,
      warnings:missing ? `<span class="pill missing">${esc(missing)}</span>` : "",
    });
  }

  window.MediaPlayerPlaylistComponents = {cardHtml, detailHtml};
})();
