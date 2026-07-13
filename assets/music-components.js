// Stateless builders for music album cards, album detail, and track rows.
//
// The app coordinator prepares URLs, labels, and state booleans before calling
// these helpers. Keeping that split avoids a second source of truth for playback
// or editing state while still getting the big markup strings out of app.js.
(function(){
  const ui = window.MediaPlayerUi || {};
  const components = window.MediaPlayerComponents || {};
  const esc = ui.esc || (value => String(value ?? ""));
  const {cardActionsHtml, detailActionsHtml, detailPageHtml} = components;

  function albumActionsHtml(album){
    return cardActionsHtml([
      {action:"play", valueName:"album", value:album, label:"Play album", icon:"&#9654;", primary:true},
      {action:"add", valueName:"album", value:album, label:"Add album to queue", icon:"+", add:true},
      {action:"shuffle", valueName:"album", value:album, label:"Shuffle album", icon:"&#8644;"},
    ]);
  }

  function albumCardHtml({name, artHtml, years=[], countText="", isPlaying=false}){
    const yearText = years.length ? ` - ${esc(years.join(", "))}` : "";
    return `<div class="albumCard ${isPlaying ? "playingNow" : ""}" data-album="${esc(name)}" tabindex="0">${albumActionsHtml(name)}<button class="artButton" data-action="select" data-album="${esc(name)}">${artHtml}</button><div class="albumName">${esc(name)}</div><div class="albumMeta">${esc(countText)}${yearText}</div></div>`;
  }

  function albumWarningHtml(warnings){
    return warnings.length
      ? warnings.map(w => `<span class="pill missing">${esc(w)}</span>`).join("")
      : `<span class="pill">Album metadata looks tidy</span>`;
  }

  function albumDetailHtml({coverHtml, title, meta, stats, warnings, queueCount, queueIconHtml}){
    const actions = detailActionsHtml([
      {id:"albumPlay", label:"Play album", icon:"&#9654;", primary:true},
      {id:"albumShuffle", label:"Shuffle album", icon:"&#8644;"},
      {id:"albumAddQueue", label:"Add album to queue", icon:"+", add:true},
      {id:"albumQueue", label:"Open queue", icon:`${queueIconHtml}<span>${esc(queueCount)}</span>`},
      {id:"albumEdit", label:"Edit Album Tracks", text:"Edit Album Tracks"},
    ]);
    return detailPageHtml({
      coverHtml,
      title,
      meta,
      stats,
      actions,
      warnings:albumWarningHtml(warnings),
    });
  }

  function mobileAlbumDividerHtml(album){
    return `<tr class="mobileAlbumRow"><td colspan="8">${esc(album)}</td></tr>`;
  }

  function trackRowHtml({track, trackNo="", artHtml="", badgesHtml="", selected=false, playing=false, checked=false}){
    const selectedClass = selected ? "selected" : "";
    const playingClass = playing ? "playingNow" : "";
    return `<tr data-id="${track.id}" class="mediaTableRow ${selectedClass} ${playingClass}"><td class="checkCell"><input class="rowCheck" type="checkbox" data-id="${track.id}" ${checked ? "checked" : ""}></td><td>${artHtml}</td><td class="titleCell mediaRowTitle"><span class="trackNo">${esc(trackNo)}</span>${esc(track.title)}<br><span class="rowBadges"><span class="pill ${track.has_artwork ? "" : "missing"}">${track.has_artwork ? "Art" : "No art"}</span> ${badgesHtml}</span></td><td class="artistCell">${esc(track.artist)}</td><td class="albumCell">${esc(track.album)}</td><td>${esc(track.date)}</td><td class="pathCell">${esc(track.path)}</td><td class="rowActions"><button class="secondary playSong iconControl" data-id="${track.id}" type="button" title="Play song" aria-label="Play song">&#9654;</button><button class="secondary addSongQueue iconControl addIcon" data-id="${track.id}" type="button" title="Add to queue" aria-label="Add to queue">+</button></td></tr>`;
  }

  window.MediaPlayerMusicComponents = {
    albumCardHtml,
    albumDetailHtml,
    albumWarningHtml,
    mobileAlbumDividerHtml,
    trackRowHtml,
  };
})();
