// Queue markup helpers shared by music and video queues.
//
// The app still owns queue arrays, playback indices, and drag/drop behavior.
// This module only renders the common queue language so music/video stay aligned.
(function(){
  const ui = window.MediaPlayerUi || {};
  const esc = ui.esc || (value => String(value ?? ""));

  function removeQueueButtonHtml(index){
    return `<button class="secondary iconControl" data-remove="${index}" title="Remove" aria-label="Remove">&#10005;</button>`;
  }

  function emptyQueueHtml(title, subtitle=""){
    const statusPanelHtml = window.MediaPlayerComponents?.statusPanelHtml;
    return statusPanelHtml
      ? statusPanelHtml({kind:"empty", title, message:subtitle, compact:true})
      : `<div class="queueEmpty" role="status">${esc(title)}</div>`;
  }

  function moveButtonsHtml(index, count){
    return `<div class="queueMoveActions"><button class="secondary iconControl" data-move="-1" data-index="${index}" title="Move earlier" aria-label="Move ${esc(index+1)} earlier" ${index===0?"disabled":""}>&uarr;</button><button class="secondary iconControl" data-move="1" data-index="${index}" title="Move later" aria-label="Move ${esc(index+1)} later" ${index===count-1?"disabled":""}>&darr;</button></div>`;
  }

  function queueItemHtml({index, displayIndex=index, count, active, artworkHtml, title, subtitle, draggable=false, removable=true}){
    const removeHtml = removable ? removeQueueButtonHtml(index) : "";
    return `<div class="queueItem mediaRow ${active?"active":""}" data-index="${index}" role="button" tabindex="0" aria-label="Play ${esc(title)}" ${active?'aria-current="true"':""} ${draggable?'draggable="true"':""}>${artworkHtml}<div class="mediaRowText"><div class="queueItemTitle mediaRowTitle">${displayIndex+1}. ${esc(title)}</div><div class="queueItemSub mediaRowMeta">${esc(subtitle)}</div></div>${moveButtonsHtml(index,count)}${removeHtml}</div>`;
  }

  function sectionLabelHtml(index, activeIndex){
    if(index === activeIndex) return `<div class="queueSectionLabel">Now Playing</div>`;
    if(index === activeIndex + 1) return `<div class="queueSectionLabel">Up Next</div>`;
    return "";
  }

  function queueListHtml({items, activeIndex, emptyTitle, draggable=true, removable=true}){
    if(!items.length) return emptyQueueHtml(emptyTitle);
    return items.map((item, displayIndex) => {
      const index = Number.isFinite(Number(item.index)) ? Number(item.index) : displayIndex;
      return sectionLabelHtml(index, activeIndex) + queueItemHtml({
      index,
      displayIndex,
      count:items.length,
      active: index === activeIndex,
      draggable,
      removable,
      artworkHtml: item.artworkHtml,
      title: item.title,
      subtitle: item.subtitle,
      });
    }).join("");
  }

  function queueSummaryText(count, singular, durationText=""){
    return `${count} ${singular}${count===1?"":"s"}${durationText?` - ${durationText}`:""}`;
  }

  window.MediaPlayerQueueComponents = {
    emptyQueueHtml,
    queueItemHtml,
    queueListHtml,
    queueSummaryText,
  };
})();
