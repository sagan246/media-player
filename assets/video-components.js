// Stateless builders for the video tab.
//
// Video playback, queue mutation, and folder selection stay in app.js. This
// module only shapes the repeated HTML so the video page can keep matching the
// music page without duplicating large template strings in the coordinator.
(function(){
  const ui = window.MediaPlayerUi || {};
  const components = window.MediaPlayerComponents || {};
  const esc = ui.esc || (value => String(value ?? ""));
  const {
    cardActionsHtml,
    detailActionsHtml,
    detailPageHtml,
    detailRowHtml,
  } = components;

  function folderActionsHtml(folder){
    return cardActionsHtml([
      {action:"play", actionAttr:"folder-action", valueName:"folder", value:folder, label:"Play folder", icon:"&#9654;", primary:true},
      {action:"add", actionAttr:"folder-action", valueName:"folder", value:folder, label:"Add folder to queue", icon:"+", add:true},
      {action:"shuffle", actionAttr:"folder-action", valueName:"folder", value:folder, label:"Shuffle folder", icon:"&#8644;"},
    ]);
  }

  function videoActionsHtml(id){
    return cardActionsHtml([
      {action:"play", actionAttr:"video-action", valueName:"id", value:id, label:"Play video", icon:"&#9654;", primary:true},
      {action:"add", actionAttr:"video-action", valueName:"id", value:id, label:"Add video to queue", icon:"+", add:true},
    ]);
  }

  function groupActionsHtml(group){
    return cardActionsHtml([
      {action:"play", actionAttr:"video-group-action", valueName:"group", value:group, label:"Play section", icon:"&#9654;", primary:true},
      {action:"add", actionAttr:"video-group-action", valueName:"group", value:group, label:"Add section to queue", icon:"+", add:true},
      {action:"shuffle", actionAttr:"video-group-action", valueName:"group", value:group, label:"Shuffle section", icon:"&#8644;"},
    ]);
  }

  function folderCoverHtml(list, className="videoThumb"){
    const cover = list.find(v => v.has_folder_cover);
    const classes = `${className} videoCoverThumb ${className === "albumDetailCover" ? "detailArt" : ""}`.trim();
    const image = cover ? `<img src="${cover.folder_cover_url}" alt="" loading="lazy" decoding="async">` : "";
    return `<div class="${classes}">${image}</div>`;
  }

  function resumeCardHtml({video, resumeAtText="", queueText="", groupLabel=""}){
    if(!video) return "";
    const art = video.has_folder_cover
      ? `<img src="${video.folder_cover_url}" alt="" loading="lazy" decoding="async">`
      : `<div class="resumeNoArt">Video</div>`;
    return `<div class="resumeCard videoResumeCard" data-action="video-resume" tabindex="0">${art}<div class="resumeCopy"><span class="resumeEyebrow">Continue watching</span><strong>${esc(video.title)}</strong><span>${esc(groupLabel)}${resumeAtText}</span><span>${esc(queueText)} in queue</span></div><button class="playButton iconControl" data-action="video-resume-play" type="button" title="Resume video" aria-label="Resume video">&#9654;</button></div>`;
  }

  function collectionCardHtml({name, label, list, kind="folder", years=[], actionsHtml=""}){
    const yearText = years.length ? ` - ${esc(years.slice(0, 3).join(", "))}` : "";
    const count = `${list.length} video${list.length === 1 ? "" : "s"}`;
    return `<div class="videoCard videoFolderCard" data-${kind}="${esc(name)}" title="${esc(name)}" role="button" tabindex="0">${actionsHtml}${folderCoverHtml(list)}<div class="videoName">${esc(label)}</div><div class="videoMeta">${count}${yearText}</div></div>`;
  }

  function folderDetailHtml({name, label, list, years=[], formats=[], sizeMb="", countText=""}){
    const actions = detailActionsHtml([
      {id:"videoFolderPlay", label:"Play folder", icon:"&#9654;", primary:true},
      {id:"videoFolderShuffle", label:"Shuffle folder", icon:"&#8644;"},
      {id:"videoFolderAdd", label:"Add folder to queue", icon:"+", add:true},
    ]);
    return detailPageHtml({
      classes:"videoAlbumDetail",
      coverHtml:folderCoverHtml(list, "albumDetailCover"),
      coverWrapClass:"videoAlbumCoverWrap",
      infoClass:"videoAlbumInfo",
      metaClass:"videoAlbumMeta",
      title:label || name,
      meta:years.length ? years.slice(0, 3).join(", ") : "",
      stats:[countText, formats.join(", ") || "Unknown format", `${sizeMb} MB`],
      actions,
    });
  }

  function albumRowsHtml(rows){
    return `<div class="videoAlbumTrackList detailTrackList">${rows.map(row => detailRowHtml({
      id:row.id,
      index:row.index,
      title:row.title,
      meta:row.meta,
      active:row.active,
      rowClass:"videoAlbumVideoRow",
      noClass:"videoAlbumTrackNo",
      textClass:"videoAlbumTrackText",
      titleClass:"videoAlbumTrackTitle",
      metaClass:"videoAlbumTrackMeta",
    })).join("")}</div>`;
  }

  function fileCardHtml({video, active=false, meta="", warning=""}){
    return `<div class="videoCard ${active ? "active" : ""}" data-id="${esc(video.id)}" title="${esc(video.path)}" role="button" tabindex="0">${videoActionsHtml(video.id)}<div class="videoName">${esc(video.title)}</div><div class="videoMeta">${esc(meta)}</div>${warning ? `<div class="videoWarn">${esc(warning)}</div>` : ""}</div>`;
  }

  function emptyCardHtml(){
    return `<div class="videoCard"><div class="videoName">Nothing matched</div><div class="videoMeta">Try a different folder.</div></div>`;
  }

  function closeAlbumButtonHtml(){
    return `<button id="videoBackToAlbums" class="secondary iconControl videoAlbumClose overlayClose" title="Close video album" aria-label="Close video album">&#10005;</button>`;
  }

  window.MediaPlayerVideoComponents = {
    albumRowsHtml,
    closeAlbumButtonHtml,
    collectionCardHtml,
    emptyCardHtml,
    fileCardHtml,
    folderActionsHtml,
    folderCoverHtml,
    folderDetailHtml,
    groupActionsHtml,
    resumeCardHtml,
    videoActionsHtml,
  };
})();
