// Markup builders for the full-screen Now Playing view.
//
// These helpers know what the screen looks like, but not how playback works.
// app.js still owns audio state, queue state, and event binding.
(function(){
  const ui = window.MediaPlayerUi || {};
  const components = window.MediaPlayerComponents || {};
  const esc = ui.esc || (value => String(value ?? ""));
  const buttonIcon = components.buttonIcon || (() => "");

  function artworkHtml(artSrc){
    return artSrc
      ? `<img class="nowPlayingArt" src="${esc(artSrc)}" alt="">`
      : `<div class="nowPlayingArt">No Artwork</div>`;
  }

  function metaHtml(track, contextText=""){
    const year = String(track.date || "").slice(0, 4);
    const format = String(track.format || "").toUpperCase();
    const album = track.album
      ? `<button class="nowPlayingAlbumLink" type="button" title="View album">${esc(track.album)}</button>`
      : "No album";
    return `<div class="nowPlayingText"><div class="nowPlayingTitle">${esc(track.title)}</div><div class="nowPlayingMeta">${album} - ${esc(track.artist || "Unknown artist")}${year ? ` - ${esc(year)}` : ""}${format ? ` - ${esc(format)}` : ""}</div>${contextText?`<div class="nowPlayingContext">${esc(contextText)}</div>`:""}</div>`;
  }

  function visualizerHtml({enabled, visualizerMode}){
    return enabled
      ? `<canvas id="nowPlayingVisualizer" class="nowPlayingVisualizer" width="560" height="96" aria-hidden="true" title="Visualizer: ${esc(visualizerMode)}. Click to switch."></canvas>`
      : "";
  }

  function seekHtml({seekValue, currentTime, remainingTime}){
    return `<div class="nowPlayingSeek"><input id="npSeekBar" type="range" min="0" max="1000" value="${esc(seekValue)}"><span id="npCurrentTime">${esc(currentTime)}</span><span id="npDuration">${esc(remainingTime)}</span></div>`;
  }

  function controlsHtml({paused, queueCount, volume, muted}){
    const playIcon = paused ? "&#9654;" : "&#10074;&#10074;";
    const muteLabel = muted ? "Unmute" : "Mute";
    const volumeIcon = buttonIcon(muted ? "volumeMuted" : "volume");
    return `<div class="nowPlayingControls"><button id="npQueue" class="secondary nowPlayingQueueButton" title="Open queue" aria-label="Open queue">${buttonIcon("queue")}<span>${esc(queueCount)}</span></button><div class="nowPlayingTransport"><button id="npPrev" class="secondary iconControl" title="Previous" aria-label="Previous">&#9664;&#9664;</button><button id="npPlayPause" class="playButton iconControl" title="Play/Pause" aria-label="Play/Pause">${playIcon}</button><button id="npNext" class="secondary iconControl" title="Next" aria-label="Next">&#9654;&#9654;</button></div><div class="nowPlayingVolume"><button id="npVolumeMute" class="volumeMuteButton iconControl" type="button" title="${muteLabel}" aria-label="${muteLabel}">${volumeIcon}</button><input id="npVolumeBar" type="range" min="0" max="1" step="0.01" value="${esc(volume)}" title="Volume"></div></div>`;
  }

  function lyricsHtml(track){
    if(!track.has_lyrics) return "";
    return `<div class="lyricsBox"><div id="lyricsContent" class="lyricsText">Loading lyrics...</div></div>`;
  }

  function emptyHtml(){
    return `<div class="nowPlayingArt">No Song</div><div><div class="nowPlayingTitle">Nothing playing</div><div class="nowPlayingMeta">Choose a song, album, or category.</div></div>`;
  }

  function fullHtml({track, artSrc, visualizerEnabled, visualizerMode, seekValue, currentTime, remainingTime, paused, queueCount, volume, muted, contextText=""}){
    return [
      artworkHtml(artSrc),
      metaHtml(track, contextText),
      visualizerHtml({enabled:visualizerEnabled, visualizerMode}),
      seekHtml({seekValue, currentTime, remainingTime}),
      controlsHtml({paused, queueCount, volume, muted}),
      lyricsHtml(track),
    ].join("");
  }

  window.MediaPlayerNowPlayingComponents = {
    artworkHtml,
    controlsHtml,
    emptyHtml,
    fullHtml,
    lyricsHtml,
    metaHtml,
    seekHtml,
    visualizerHtml,
  };
})();
