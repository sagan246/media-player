// Lyrics helpers for local text and LRC files.
//
// The player owns fetching and current playback time. This module keeps the
// parsing and synced-line UI rules isolated so lyric fixes do not disturb audio.
(function(){
  const ui = window.MediaPlayerUi || {};
  const esc = ui.esc || (value => String(value ?? ""));

  function parseLrcTimestamp(value){
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?$/);
    if(!match) return null;
    const fraction = match[3] ? Number(`0.${match[3].padEnd(3, "0").slice(0, 3)}`) : 0;
    return Number(match[1]) * 60 + Number(match[2]) + fraction;
  }

  function parseLrc(text){
    const lines = [];
    String(text || "").split(/\r?\n/).forEach(rawLine => {
      const stamps = [...rawLine.matchAll(/\[([0-9:.]+)\]/g)]
        .map(match => parseLrcTimestamp(match[1]))
        .filter(value => value !== null);
      const lyric = rawLine.replace(/\[[^\]]+\]/g, "").trim();
      if(!stamps.length || !lyric) return;
      stamps.forEach(time => lines.push({time, lyric}));
    });
    return lines.sort((a, b) => a.time - b.time);
  }

  function looksLikeLrc(text){
    return /\[[0-9]{1,2}:[0-9]{2}(?:[.:][0-9]{1,3})?\]/.test(String(text || ""));
  }

  function syncedLyricsHtml(lines){
    return lines.map((line, index) => `<button type="button" class="lrcLine" data-lrc-index="${index}" data-lrc-time="${esc(line.time)}">${esc(line.lyric)}</button>`).join("");
  }

  function activeLrcIndex(lines, currentTime, offset=.15){
    let activeIndex = -1;
    for(let i = 0; i < lines.length; i++){
      if(lines[i].time <= currentTime + offset) activeIndex = i;
      else break;
    }
    return activeIndex;
  }

  // Desktop uses a compact lyric window instead of exposing the entire LRC.
  // Mobile ignores this class and retains its continuous scrolling experience.
  function updateVisibleWindow(container, activeIndex, radius=3){
    if(!container) return;
    const focusIndex = Math.max(0, Number(activeIndex) || 0);
    container.querySelectorAll(".lrcLine").forEach((line, index) => {
      line.classList.toggle("lrcWindowLine", Math.abs(index - focusIndex) <= radius);
    });
  }

  function scrollLyricIntoFocus(activeLine, forceScroll=false){
    const scroller = activeLine.closest(".syncedLyrics");
    if(!scroller){
      activeLine.scrollIntoView({block:"center", behavior:"auto"});
      return;
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const desktopLyrics = window.matchMedia("(min-width: 1100px)").matches;
    if(desktopLyrics){
      // Desktop renders a fixed seven-line window, so scrolling would clip
      // previous lines after the hidden LRC rows reflow.
      scroller.scrollTo({top:0, behavior:"auto"});
      return;
    }
    // On mobile, anchor the top edge so wrapped lyrics do not climb into the
    // faded mask.
    const targetTop = Math.max(28, scroller.clientHeight * .09);
    const scrollTop = activeLine.offsetTop - targetTop;
    scroller.scrollTo({
      top: Math.max(0, scrollTop),
      behavior: forceScroll || reduceMotion ? "auto" : "smooth",
    });
  }

  window.MediaPlayerLyrics = {
    activeLrcIndex,
    looksLikeLrc,
    parseLrc,
    parseLrcTimestamp,
    scrollLyricIntoFocus,
    syncedLyricsHtml,
    updateVisibleWindow,
  };
})();
