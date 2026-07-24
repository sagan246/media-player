// Stateless builders for music album cards, album detail, and track rows.
//
// The app coordinator prepares URLs, labels, and state booleans before calling
// these helpers. Keeping that split avoids a second source of truth for playback
// state while still getting the big markup strings out of app.js.
(function(){
  const ui = window.MediaPlayerUi || {};
  const components = window.MediaPlayerComponents || {};
  const esc = ui.esc || (value => String(value ?? ""));
  const {cardActionsHtml, detailActionsHtml, detailPageHtml} = components;

  function albumActionsHtml(albumKey){
    return cardActionsHtml([
      {action:"play", valueName:"album", value:albumKey, label:"Play album", icon:"&#9654;", primary:true},
      {action:"add", valueName:"album", value:albumKey, label:"Add album to queue", icon:"+", add:true},
      {action:"shuffle", valueName:"album", value:albumKey, label:"Shuffle album", icon:"&#8644;"},
    ]);
  }

  function albumCardHtml({key, name, artHtml, years=[], countText="", isPlaying=false}){
    const yearText = years.length ? ` - ${esc(years.join(", "))}` : "";
    return `<div class="albumCard ${isPlaying ? "playingNow" : ""}" data-album="${esc(key)}" tabindex="0">${albumActionsHtml(key)}<button class="artButton" data-action="select" data-album="${esc(key)}">${artHtml}</button><div class="albumName">${esc(name)}</div><div class="albumMeta">${esc(countText)}${yearText}</div></div>`;
  }

  function albumDetailHtml({coverHtml, title, meta, stats, queueCount, queueIconHtml}){
    const actions = detailActionsHtml([
      {id:"albumPlay", label:"Play album", icon:"&#9654;", primary:true},
      {id:"albumShuffle", label:"Shuffle album", icon:"&#8644;"},
      {id:"albumAddQueue", label:"Add album to queue", icon:"+", add:true},
      {id:"albumQueue", label:"Open queue", icon:`${queueIconHtml}<span>${esc(queueCount)}</span>`},
    ]);
    return detailPageHtml({
      coverHtml,
      title,
      meta,
      stats,
      actions,
    });
  }

  function mobileAlbumDividerHtml(album){
    return `<tr class="mobileAlbumRow"><td colspan="7">${esc(album)}</td></tr>`;
  }

  function trackRowHtml({track, trackNo="", artHtml="", selected=false, playing=false}){
    const selectedClass = selected ? "selected" : "";
    const playingClass = playing ? "playingNow" : "";
    return `<tr data-id="${track.id}" class="mediaTableRow ${selectedClass} ${playingClass}"><td>${artHtml}</td><td class="titleCell mediaRowTitle"><span class="trackNo">${esc(trackNo)}</span>${esc(track.title)}</td><td class="artistCell">${esc(track.artist)}</td><td class="albumCell">${esc(track.album)}</td><td>${esc(track.date)}</td><td class="pathCell">${esc(track.path)}</td><td class="rowActions"><button class="secondary playSong iconControl" data-id="${track.id}" type="button" title="Play song" aria-label="Play song">&#9654;</button><button class="secondary addSongQueue iconControl addIcon" data-id="${track.id}" type="button" title="Add to queue" aria-label="Add to queue">+</button></td></tr>`;
  }

  window.MediaPlayerMusicComponents = {
    albumCardHtml,
    albumDetailHtml,
    mobileAlbumDividerHtml,
    trackRowHtml,
  };
})();
