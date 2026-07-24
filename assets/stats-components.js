// Stateless markup helpers for the listening stats page.
//
// app.js still decides which range is selected and which tracks are playable;
// this file only turns rows/summary data into reusable stats UI.
(function(){
  const ui = window.MediaPlayerUi || {};
  const components = window.MediaPlayerComponents || {};
  const esc = ui.esc || (value => String(value ?? ""));
  const statCardHtml = components.statCardHtml || (({body=""}) => body);
  const statPillHtml = components.statPillHtml || ((value, label) => `<span>${esc(value)} ${esc(label)}</span>`);

  function statsRows(rows, columns, emptyText){
    if(!rows.length)return `<div class="statsEmpty">${esc(emptyText)}</div>`;
    return `<table class="statsTable"><thead><tr>${columns.map(c=>`<th>${esc(c.label)}</th>`).join("")}</tr></thead><tbody>${rows.map(row=>{
      const playAttr=row.playable_id!==""&&row.playable_id!==undefined?` class="playableStatsRow" data-play-track="${esc(row.playable_id)}" tabindex="0" title="Play this song"`:"";
      return `<tr${playAttr}>${columns.map(c=>`<td>${c.render(row)}</td>`).join("")}</tr>`;
    }).join("")}</tbody></table>`;
  }

  function statsMinutes(row){return (Number(row?.seconds)||0)/60;}
  function statsIntensity(minutes, maxMinutes){
    if(minutes<=0)return .08;
    return Math.min(.92, .18 + (minutes/Math.max(maxMinutes,1))*.74);
  }
  function themeCssValue(name, fallback){
    const value = getComputedStyle(document.body).getPropertyValue(name).trim();
    return value || fallback;
  }
  function statsHeatStyle(minutes, maxMinutes){
    return `background:rgba(${themeCssValue("--accent-rgb","100,116,139")},${statsIntensity(minutes,maxMinutes).toFixed(2)})`;
  }
  function statsChartSection(title, body){
    return statCardHtml({className:"statsChart", ariaLabel:title, body});
  }
  function statsHourLabel(hour, compact=false){
    const value=Number(hour)||0;
    const period=value<12?"AM":"PM";
    const display=value%12||12;
    return compact ? `${display}${period.toLowerCase()}` : `${display} ${period}`;
  }
  function statsMinutesLabel(minutes, compact=false){
    const total=Math.round(Number(minutes)||0);
    if(compact||total<60)return `${total}m`;
    const hours=Math.floor(total/60), rest=total%60;
    return rest ? `${hours}h ${rest}m` : `${hours}h`;
  }
  function statsResponsiveMinutes(minutes){
    return `<span class="desktopDuration">${esc(statsMinutesLabel(minutes))}</span><span class="mobileDuration">${esc(statsMinutesLabel(minutes,true))}</span>`;
  }

  function statsHourHeatmap(rows){
    const maxMinutes=Math.max(...rows.map(statsMinutes),1);
    const cells=rows.map(row=>{
      const minutes=statsMinutes(row);
      return `<div class="statsHeatCell" title="${esc(`${statsHourLabel(row.hour)} - ${statsMinutesLabel(minutes)}`)}"><div class="statsHeatBlock" style="${statsHeatStyle(minutes,maxMinutes)}">${minutes>0?esc(statsMinutesLabel(minutes,true)):""}</div><div class="statsHeatLabel"><span class="desktopHourLabel">${esc(statsHourLabel(row.hour))}</span><span class="mobileHourLabel">${esc(statsHourLabel(row.hour,true))}</span></div></div>`;
    }).join("");
    return statsChartSection("Hourly Listening", `<div class="statsHourHeat">${cells}</div>`);
  }

  function statsWeekBars(rows, {isFutureStatsDay}){
    const labels=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const ordered=[...rows].sort((a,b)=>String(a.day||"").localeCompare(String(b.day||"")));
    const maxMinutes=Math.max(...ordered.map(statsMinutes),1);
    const bars=ordered.map(row=>{
      const minutes=statsMinutes(row);
      const height=minutes>0?Math.max(8,Math.round((minutes/maxMinutes)*100)):0;
      const date=row.day?new Date(`${row.day}T00:00:00`):null;
      const label=date?labels[date.getDay()]:String(row.day||"").slice(5);
      const future=isFutureStatsDay(row.day);
      return `<div class="statsWeekBar${future?" statsFutureCell":" statsDrillCell"}" ${future?"":`data-stats-day="${esc(row.day||"")}" role="button" tabindex="0"`} title="${esc(`${row.day} - ${statsMinutesLabel(minutes)}`)}"><div class="statsBarValue">${statsResponsiveMinutes(minutes)}</div><div class="statsBarTrack"><div class="statsBarFill" style="height:${height}%"></div></div><div class="statsBarLabel">${esc(label)}</div></div>`;
    }).join("");
    return statsChartSection("Weekly Listening", `<div class="statsWeekBars">${bars}</div>`);
  }

  function statsMonthCalendar(rows, {isFutureStatsDay, statsMonthTitle}){
    const labels=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const maxMinutes=Math.max(...rows.map(statsMinutes),1);
    const cells=[];
    const firstDate=rows[0]?.day?new Date(`${rows[0].day}T00:00:00`):null;
    for(let index=0; index<(firstDate?firstDate.getDay():0); index++)cells.push(`<div class="statsCalendarCell blankCalendarCell"></div>`);
    for(const row of rows){
      const minutes=statsMinutes(row);
      const dayNumber=String(row.day||"").slice(8).replace(/^0/,"");
      const future=isFutureStatsDay(row.day);
      cells.push(`<div class="statsCalendarCell${future?" statsFutureCell":" statsDrillCell"}" ${future?"":`data-stats-day="${esc(row.day||"")}" role="button" tabindex="0"`} title="${esc(`${row.day} - ${statsMinutesLabel(minutes)}`)}" style="${future?"":statsHeatStyle(minutes,maxMinutes)}"><span>${esc(dayNumber)}</span>${minutes>0&&!future?`<strong>${esc(statsMinutesLabel(minutes,true))}</strong>`:""}</div>`);
    }
    while(cells.length%7!==0)cells.push(`<div class="statsCalendarCell blankCalendarCell"></div>`);
    return statsChartSection("Monthly Listening", `<div class="statsCalendarTitle">${esc(statsMonthTitle())}</div><div class="statsCalendarWeekdays">${labels.map(label=>`<span>${label}</span>`).join("")}</div><div class="statsCalendarGrid">${cells.join("")}</div>`);
  }

  function statsYearHeatmap(rows, {rangeStart, isFutureStatsRangeAnchor}){
    const monthNames=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const months=monthNames.map((label,index)=>({label,seconds:0,month:index}));
    for(const row of rows){
      const monthIndex=Number(String(row.day||"").slice(5,7))-1;
      if(months[monthIndex])months[monthIndex].seconds+=Number(row.seconds)||0;
    }
    const maxMinutes=Math.max(...months.map(statsMinutes),1);
    const year=String(rangeStart||"").slice(0,4);
    const cells=months.map(item=>{
      const minutes=statsMinutes(item);
      const monthStartDate=`${year}-${String(item.month+1).padStart(2,"0")}-01`;
      const future=isFutureStatsRangeAnchor("month", monthStartDate);
      return `<div class="statsYearCell${future?" statsFutureCell":" statsDrillCell"}" ${future?"":`data-stats-month="${esc(monthStartDate)}" role="button" tabindex="0"`} title="${esc(`${item.label} - ${statsMinutesLabel(minutes)}`)}" style="${future?"":statsHeatStyle(minutes,maxMinutes)}"><span>${esc(item.label)}</span>${minutes>0&&!future?`<strong>${esc(statsMinutesLabel(minutes,true))}</strong>`:""}</div>`;
    }).join("");
    return statsChartSection("Yearly Listening", `<div class="statsYearHeat">${cells}</div>`);
  }

  function statsTimeChart(rows, unit, options){
    if(!rows.length)return statsChartSection("Listening Minutes", `<div class="statsEmpty">No listening time recorded yet.</div>`);
    if(unit==="hour")return statsHourHeatmap(rows);
    if(options.period==="week")return statsWeekBars(rows, options);
    if(options.period==="month")return statsMonthCalendar(rows, options);
    if(options.period==="year")return statsYearHeatmap(rows, options);
    return "";
  }

  // Stats values arrive from the server already summarized. These helpers only
  // format them for the current theme/layout; they do not decide what counts as
  // a listen.
  function statsMetric(number, label, extraClass=""){
    const className = extraClass ? `statsMetric ${extraClass}` : "statsMetric";
    return `<div class="${esc(className)}"><strong>${esc(number)}</strong><span>${esc(label)}</span></div>`;
  }
  function formatStatsMonth(day){
    if(!day)return "Not yet";
    const date = new Date(`${day}T00:00:00`);
    return date.toLocaleDateString(undefined, {month:"short", year:"numeric"});
  }
  function allTimeStatsCard(summary){
    const plays = Number(summary.total_play_count)||0;
    const uniqueTracks = Number(summary.unique_tracks)||0;
    const listeningDays = Number(summary.listening_days)||0;
    return `<section class="allTimeStatsCard">${statsMetric(formatStatsMonth(summary.first_day), "started listening")}${statsMetric(listeningDays.toLocaleString(), "listening days")}${statsMetric(plays.toLocaleString(), "songs played")}${statsMetric(uniqueTracks.toLocaleString(), "unique songs played")}</section>`;
  }
  function statsTopControls({summary, fmtDuration, primaryMetricLabel, rangeOptionsHtml, rangeControlHtml}){
    return `<div class="statsTopControls"><strong>Music Stats</strong><div class="statsTopMetrics">${statPillHtml(fmtDuration(summary.seconds||0), primaryMetricLabel)}${statPillHtml(fmtDuration(summary.lifetime_seconds||0), "all time")}</div><select id="statsRange" class="statsRange">${rangeOptionsHtml}</select>${rangeControlHtml}</div>`;
  }
  function statsRangeControlHtml({period, rangeLabel, dayValue, maxDay, currentRange=false, today=false}){
    const dayClass = period === "day" ? " visible" : "";
    const stepClass = ["week", "month", "year"].includes(period) ? " visible" : "";
    return `<div class="statsStepRange${stepClass}"><button id="statsPrevRange" class="secondary iconControl" type="button" title="Previous range" aria-label="Previous range">&#9664;</button><span>${esc(rangeLabel)}</span><button id="statsNextRange" class="secondary iconControl" type="button" title="Next range" aria-label="Next range"${currentRange ? " disabled" : ""}>&#9654;</button></div><div class="statsDayRange${dayClass}"><button id="statsPrevDay" class="secondary iconControl" type="button" title="Previous day" aria-label="Previous day">&#9664;</button><input id="statsDay" type="date" value="${esc(dayValue)}" max="${esc(maxDay)}" aria-label="Stats day"><button id="statsNextDay" class="secondary iconControl" type="button" title="Next day" aria-label="Next day"${today ? " disabled" : ""}>&#9654;</button></div>`;
  }
  function statsHero({rangeOptionsHtml, summary, fmtDuration, primaryMetricLabel, rangeControlHtml}){
    return `<div class="statsHero"><div><h2>Music Stats</h2></div><div class="statsHeroMetrics">${statsMetric(fmtDuration(summary.seconds||0), primaryMetricLabel)}${statsMetric(fmtDuration(summary.lifetime_seconds||0), "all-time listening")}</div><div class="statsControls"><select id="statsRange" class="statsRange">${rangeOptionsHtml}</select>${rangeControlHtml}</div></div>`;
  }
  function statsTableSection(title, rows, columns, emptyText, actionHtml=""){
    return statCardHtml({title, actionHtml, body:statsRows(rows, columns, emptyText)});
  }
  function fmtStatsSongTime(seconds){
    if(!Number.isFinite(Number(seconds))||Number(seconds)<=0)return "0:00";
    const total=Math.round(Number(seconds));
    const hours=Math.floor(total/3600), minutes=Math.floor((total%3600)/60), secs=total%60;
    return hours?`${hours}h ${minutes}m ${String(secs).padStart(2,"0")}s`:`${minutes}:${String(secs).padStart(2,"0")}`;
  }

  // Export one namespace so app.js can keep its dependency line obvious.
  window.MediaPlayerStatsComponents = {
    allTimeStatsCard,
    fmtStatsSongTime,
    statsMetric,
    statsHero,
    statsRangeControlHtml,
    statsTableSection,
    statsTimeChart,
    statsTopControls,
  };
})();
