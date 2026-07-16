// Shared markup builders for the browser app.
//
// These functions are intentionally stateless. They build repeated UI pieces
// used by music, video, stats, and queue screens while app.js keeps ownership
// of playback state and event binding.
(function(){
  const ui = window.MediaPlayerUi || {};
  const esc = ui.esc || (value => String(value ?? ""));

  function buttonIcon(name){
    const icons = {
      browse: `<svg class="buttonIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h6l2 3h10v9H3z"/><path d="M3 7v12"/></svg>`,
      queue: `<svg class="buttonIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>`,
      volume: `<svg class="buttonIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h4l5-4v12l-5-4H4z"/><path d="M16 9c1 1 1 5 0 6"/><path d="M19 6c3 3 3 9 0 12"/></svg>`,
      volumeMuted: `<svg class="buttonIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h4l5-4v12l-5-4H4z"/><path d="m17 10 4 4"/><path d="m21 10-4 4"/></svg>`,
    };
    return icons[name] || "";
  }

  function actionButtonHtml({action, actionAttr="action", valueName, value, label, icon, primary=false, add=false}){
    const classes = `${primary?"":"secondary "}iconButton iconControl${add?" addIcon":""}`.trim();
    return `<button class="${classes}" data-${actionAttr}="${esc(action)}" data-${valueName}="${esc(value)}" title="${esc(label)}" aria-label="${esc(label)}">${icon}</button>`;
  }

  function cardActionsHtml(buttons){
    return `<div class="cardActions">${buttons.map(actionButtonHtml).join("")}</div>`;
  }

  function detailActionButtonHtml({id, label, icon, primary=false, add=false, text=""}){
    const classes = `${primary?"playButton":"secondary"} ${icon?"iconControl":""}${add?" addIcon":""}`.trim();
    return `<button id="${esc(id)}" class="${classes}" title="${esc(label)}" aria-label="${esc(label)}">${icon || esc(text)}</button>`;
  }

  function detailActionsHtml(buttons){
    return `<div class="albumActions">${buttons.map(detailActionButtonHtml).join("")}</div>`;
  }

  function detailStatsHtml(items){
    const pills = items.filter(Boolean).map(item=>`<span class="pill">${esc(item)}</span>`).join("");
    return pills ? `<div class="albumStats detailStats">${pills}</div>` : "";
  }

  function detailWarningsHtml(warnings){
    return warnings ? `<div class="albumWarnings detailWarnings">${warnings}</div>` : "";
  }

  function detailPageHtml({classes="", coverHtml="", coverWrapClass="", infoClass="", metaClass="", title="", meta="", stats=[], actions="", warnings=""}){
    const className = `albumDetail detailPage ${classes} visible`.trim();
    const coverWrapClasses = `detailArtWrap ${coverWrapClass}`.trim();
    const infoClasses = `albumDetailInfo detailInfo ${infoClass}`.trim();
    const metaClasses = `albumDetailMeta detailMeta ${metaClass}`.trim();
    return `<section class="${className}"><div class="${coverWrapClasses}">${coverHtml}</div><div class="${infoClasses}"><h2 class="detailHeading">${esc(title)}</h2><div class="${metaClasses}">${esc(meta)}</div>${detailStatsHtml(stats)}${actions}${detailWarningsHtml(warnings)}</div></section>`;
  }

  function detailRowHtml({id, index, title, meta, active=false, rowClass="", noClass="", textClass="", titleClass="", metaClass=""}){
    const classes = `${rowClass} detailRow ${active?"active":""}`.trim();
    return `<div class="${classes}" data-id="${esc(id)}" role="button" tabindex="0"><div class="${`detailRowNo ${noClass}`.trim()}">${index+1}</div><div class="${`detailRowText ${textClass}`.trim()}"><div class="${`detailRowTitle ${titleClass}`.trim()}">${esc(title)}</div><div class="${`detailRowMeta ${metaClass}`.trim()}">${esc(meta)}</div></div></div>`;
  }

  function statCardHtml({title="", body="", actionHtml="", className="", ariaLabel=""}){
    const header = title ? `<div class="statsSectionHead statsCardHead"><h3>${esc(title)}</h3>${actionHtml}</div>` : "";
    const label = ariaLabel || title;
    return `<section class="statsSection statsCard ${className}" ${label?`aria-label="${esc(label)}"`:""}>${header}${body}</section>`;
  }

  function statPillHtml(value, label){
    return `<span class="stat"><strong>${esc(value)}</strong> ${esc(label)}</span>`;
  }

  function topIconButton(action, label, icon, extraClass=""){
    return `<button class="secondary iconControl ${extraClass}" data-top-action="${esc(action)}" type="button" title="${esc(label)}" aria-label="${esc(label)}">${icon}</button>`;
  }

  function topQueueButton(action, label, count){
    return `<button class="secondary queueCountButton" data-top-action="${esc(action)}" type="button" title="${esc(label)}" aria-label="${esc(label)}">${buttonIcon("queue")}<span>${esc(count)}</span></button>`;
  }

  function browseItemHtml({name, label, count, active=false, className=""}){
    const classes = `groupItem ${className} ${active ? "active" : ""}`.trim();
    return `<button class="${classes}" data-group="${esc(name)}" title="${esc(name)}"><span class="groupName">${esc(label || name)}</span><span class="groupCount">${esc(count)}</span></button>`;
  }

  function browseItemsHtml(items){
    return items.map(browseItemHtml).join("");
  }

  function browseSummaryText(count, singular){
    return `${count} ${singular}${count === 1 ? "" : "s"}`;
  }

  function sectionGroupHtml({title, label, countText, cardsHtml, sectionClass="", gridClass="", actionHtml=""}){
    return `<section class="albumHomeSection ${sectionClass}"><div class="albumSectionHead"><div class="albumSectionTitle">${actionHtml}<h2>${esc(label || title)}</h2></div><span>${esc(countText)}</span></div><div class="albumSectionGrid ${gridClass}">${cardsHtml}</div></section>`;
  }

  function topControlBarHtml({title="", metricsHtml="", controlsHtml=""}){
    return `<div class="topTabControls">${title ? `<strong>${esc(title)}</strong>` : ""}${metricsHtml ? `<div class="topTabMetrics">${metricsHtml}</div>` : ""}<div class="topTabActions">${controlsHtml}</div></div>`;
  }

  function selectOptionsHtml(options, selectedValue){
    return options.map(([value, label]) => `<option value="${esc(value)}" ${selectedValue === value ? "selected" : ""}>${esc(label)}</option>`).join("");
  }

  // Keep this export small and boring: app.js should be able to import these
  // builders without creating a second place for playback or selection state.
  window.MediaPlayerComponents = {
    actionButtonHtml,
    browseItemHtml,
    browseItemsHtml,
    browseSummaryText,
    buttonIcon,
    cardActionsHtml,
    detailActionsHtml,
    detailPageHtml,
    detailRowHtml,
    sectionGroupHtml,
    selectOptionsHtml,
    statCardHtml,
    statPillHtml,
    topControlBarHtml,
    topIconButton,
    topQueueButton,
  };
})();
