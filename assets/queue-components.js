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
    const subtitleHtml = subtitle ? `<div class="queueItemSub">${esc(subtitle)}</div>` : "";
    return `<div class="queueItem mediaRow"><div class="noArt mediaRowArt">?</div><div class="mediaRowText"><div class="queueItemTitle mediaRowTitle">${esc(title)}</div>${subtitleHtml}</div></div>`;
  }

  function queueItemHtml({index, displayIndex=index, active, artworkHtml, title, subtitle, draggable=false}){
    return `<div class="queueItem mediaRow ${active?"active":""}" data-index="${index}" ${draggable?'draggable="true"':""}>${artworkHtml}<div class="mediaRowText"><div class="queueItemTitle mediaRowTitle">${displayIndex+1}. ${esc(title)}</div><div class="queueItemSub mediaRowMeta">${esc(subtitle)}</div></div>${removeQueueButtonHtml(index)}</div>`;
  }

  function sectionLabelHtml(index, activeIndex){
    if(index === activeIndex) return `<div class="queueSectionLabel">Now Playing</div>`;
    if(index === activeIndex + 1) return `<div class="queueSectionLabel">Up Next</div>`;
    return "";
  }

  function queueListHtml({items, activeIndex, emptyTitle, draggable=true}){
    if(!items.length) return emptyQueueHtml(emptyTitle);
    return items.map((item, displayIndex) => {
      const index = Number.isFinite(Number(item.index)) ? Number(item.index) : displayIndex;
      return sectionLabelHtml(index, activeIndex) + queueItemHtml({
      index,
      displayIndex,
      active: index === activeIndex,
      draggable,
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
