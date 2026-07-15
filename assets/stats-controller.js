(function(){
  "use strict";

  const RANGES=[["day","Day"],["week","Week"],["month","Month"],["year","Year"],["all","All Time"]];

  /** Owns listening-stat range state, loading, rendering, and interactions. */
  function create(options){
    const {
      byId,on,esc,fetchJson,localDateString,domain,components,
      topPanel,contentPanel,getTracks,getKnownDuration,getMediaType,
      isMobile,playList,playSingleTrack,fmtDuration,
    }=options;
    const {
      allTimeStatsCard,fmtStatsSongTime,statsHero,statsRangeControlHtml,
      statsTableSection,statsTimeChart,statsTopControls,
    }=components;
    let period=localStorage.getItem("statsPeriod")||"week";
    let day=localStorage.getItem("statsDay")||localDateString();
    const legacyEnd=localStorage.getItem("statsRangeEnd")||localDateString();
    const anchors={
      week:localStorage.getItem("statsRangeEnd:week")||legacyEnd,
      month:localStorage.getItem("statsRangeEnd:month")||legacyEnd,
      year:localStorage.getItem("statsRangeEnd:year")||legacyEnd,
    };
    let data=null;
    let topTrackIds=[];
    if(!RANGES.some(([value])=>value===period))period="week";

    const dateFromText=value=>domain.dateFromText(value,localDateString);
    const shiftDate=(value,days)=>domain.shiftDate(value,days,localDateString);
    const monthStart=value=>domain.monthStart(value,localDateString);
    const monthEnd=value=>domain.monthEnd(value,localDateString);
    const yearStart=value=>domain.yearStart(value,localDateString);
    const yearEnd=value=>domain.yearEnd(value,localDateString);
    const weekStart=value=>domain.weekStart(value,localDateString);
    const weekEnd=value=>domain.weekEnd(value,localDateString);
    const shiftMonth=(value,direction)=>domain.shiftMonthAnchor(value,direction,localDateString);
    const shiftYear=(value,direction)=>domain.shiftYearAnchor(value,direction,localDateString);
    const save=(key,value)=>{localStorage.setItem(key,value); return value;};
    const steppable=()=>["week","month","year"].includes(period);

    function currentRangeStart(value=period){
      const today=localDateString();
      if(value==="week")return weekStart(today);
      if(value==="month")return monthStart(today);
      if(value==="year")return yearStart(today);
      return today;
    }
    function latestAnchor(value){return currentRangeStart(value);}
    function candidateStart(value,anchorValue){
      if(value==="week")return weekStart(anchorValue);
      if(value==="month")return monthStart(anchorValue);
      if(value==="year")return yearStart(anchorValue);
      return anchorValue;
    }
    function isFutureAnchor(value,anchorValue){return candidateStart(value,anchorValue)>latestAnchor(value);}
    function clampAnchor(value,anchorValue){return isFutureAnchor(value,anchorValue)?latestAnchor(value):anchorValue;}
    function setAnchor(value,anchorValue){
      const clamped=clampAnchor(value,anchorValue||localDateString());
      anchors[value]=clamped;
      localStorage.setItem(`statsRangeEnd:${value}`,clamped);
      return clamped;
    }
    function rangeAnchor(value=period){
      const raw=anchors[value]||localDateString();
      const clamped=clampAnchor(value,raw);
      if(clamped!==raw)setAnchor(value,clamped);
      return clamped;
    }
    function trySetAnchor(value,anchorValue){if(isFutureAnchor(value,anchorValue))return false; setAnchor(value,anchorValue); return true;}
    function rangeDates(){
      const anchor=rangeAnchor();
      if(period==="week")return {start:weekStart(anchor),end:weekEnd(anchor)};
      if(period==="month")return {start:monthStart(anchor),end:monthEnd(anchor)};
      if(period==="year")return {start:yearStart(anchor),end:yearEnd(anchor)};
      const end=anchor>localDateString()?localDateString():anchor;
      return {start:end,end};
    }
    function atCurrentRange(){return steppable()&&rangeDates().start>=currentRangeStart();}
    function atToday(){return (day||localDateString())>=localDateString();}
    function isFutureDay(value){return Boolean(value)&&value>localDateString();}
    function clampDay(value){const today=localDateString(); return value&&value<today?value:today;}
    function primaryMetricLabel(){
      if(period==="all")return "all time";
      if(period==="day")return day===localDateString()?"today":"selected day";
      if(period==="week")return atCurrentRange()?"this week":"selected week";
      if(period==="month")return atCurrentRange()?"this month":"selected month";
      if(period==="year")return atCurrentRange()?"this year":"selected year";
      return "this range";
    }
    function rangeLabel(){
      const {start,end}=rangeDates();
      if(period==="year")return start.slice(0,4);
      return start.slice(0,4)===end.slice(0,4)?`${start.slice(5)} to ${end.slice(5)}`:`${start} to ${end}`;
    }
    function monthTitle(){return dateFromText(rangeDates().start).toLocaleDateString(undefined,{month:"long",year:"numeric"});}
    function shiftRange(direction){
      const current=rangeAnchor();
      const next=period==="week"?shiftDate(current,direction*7):period==="month"?shiftMonth(current,direction):period==="year"?shiftYear(current,direction):shiftDate(current,direction);
      if(isFutureAnchor(period,next))return;
      setAnchor(period,next);
      load();
    }
    function optionsHtml(){return RANGES.map(([value,label])=>`<option value="${value}" ${period===value?"selected":""}>${label}</option>`).join("");}
    function controlHtml(){return statsRangeControlHtml({period,rangeLabel:rangeLabel(),dayValue:clampDay(day),maxDay:localDateString(),currentRange:atCurrentRange(),today:atToday()});}
    function trackKey(track){
      const norm=value=>String(value||"").trim().toLowerCase();
      const duration=Math.round(Number(getKnownDuration(track.id)||track.duration||0)||0);
      return `${norm(track.artist)}|${norm(track.album)}|${norm(track.title)}|${duration}`;
    }
    function songTrack(row){
      if(!row)return null;
      const tracks=getTracks();
      if(row.track_key){const match=tracks.find(track=>trackKey(track)===row.track_key); if(match)return match;}
      const norm=value=>String(value||"").trim().toLowerCase();
      return tracks.find(track=>norm(track.title)===norm(row.title)&&norm(track.artist)===norm(row.artist)&&norm(track.album)===norm(row.album))
        ||tracks.find(track=>norm(track.title)===norm(row.title)&&norm(track.artist)===norm(row.artist))||null;
    }
    function songRows(rows){return rows.map(row=>{const track=songTrack(row); return {...row,playable_id:track?track.id:""};});}
    function tables(songs){
      const ordered=[...songs].sort((a,b)=>(Number(b.seconds)||0)-(Number(a.seconds)||0));
      const shown=songRows(isMobile()?ordered.slice(0,8):ordered);
      topTrackIds=shown.map(row=>Number(row.playable_id)).filter(Number.isFinite);
      const action=topTrackIds.length?`<button id="playTopSongs" class="secondary iconControl statsSectionAction" type="button" title="Play top songs" aria-label="Play top songs">&#9654;</button>`:"";
      return `<div class="statsSections">${statsTableSection("Top Songs",shown,[
        {label:"Song",render:row=>`<div class="statsTitle">${esc(row.title)}</div><div class="statsSub">${esc(row.artist)} - ${esc(row.album)}</div>`},
        {label:"Time",render:row=>esc(fmtStatsSongTime(row.seconds))},
      ],"No top songs yet.",action)}</div>`;
    }
    function chart(rows,unit){return statsTimeChart(rows,unit,{period,isFutureStatsDay:isFutureDay,isFutureStatsRangeAnchor:isFutureAnchor,rangeStart:rangeDates().start,statsMonthTitle:monthTitle});}
    function bindSongs(){
      const playTopSongs=byId("playTopSongs");
      if(playTopSongs)on(playTopSongs,"click",()=>playList(topTrackIds.map(id=>getTracks().find(track=>track.id===id)).filter(Boolean)));
      contentPanel.querySelectorAll("tr[data-play-track]").forEach(row=>{
        const id=Number(row.dataset.playTrack); if(!Number.isFinite(id))return;
        const play=()=>playSingleTrack(id);
        row.addEventListener("click",play);
        row.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault(); play();}});
      });
    }
    function drill(cell){
      const month=cell.dataset.statsMonth,selectedDay=cell.dataset.statsDay;
      if(month){if(isFutureAnchor("month",month))return; period=save("statsPeriod","month"); trySetAnchor("month",month); load();}
      else if(selectedDay){if(isFutureDay(selectedDay))return; period=save("statsPeriod","day"); day=save("statsDay",selectedDay); load();}
    }
    function bindDrilldowns(){contentPanel.querySelectorAll(".statsDrillCell").forEach(cell=>{on(cell,"click",()=>drill(cell)); on(cell,"keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault(); drill(cell);}});});}
    function bindControls(){
      on(byId("statsRange"),"change",event=>{period=save("statsPeriod",event.target.value); if(steppable()&&!anchors[period])setAnchor(period,localDateString()); load();});
      on(byId("statsPrevRange"),"click",()=>shiftRange(-1));
      on(byId("statsNextRange"),"click",()=>shiftRange(1));
      on(byId("statsPrevDay"),"click",()=>{day=save("statsDay",shiftDate(day,-1)); load();});
      on(byId("statsNextDay"),"click",()=>{const next=shiftDate(day,1); if(isFutureDay(next))return; day=save("statsDay",next); load();});
      on(byId("statsDay"),"change",event=>{const next=event.target.value||localDateString(); if(isFutureDay(next)){event.target.value=day; return;} day=save("statsDay",next); if(period==="day")load();});
    }
    function render(){
      if(!data){contentPanel.innerHTML=`<div class="statsEmpty">Loading listening stats...</div>`; return;}
      const summary=data.summary||{},daily=data.chart_daily||[],songs=data.top_songs||[];
      const chartHtml=period==="all"?allTimeStatsCard(summary):chart(daily,data.chart_unit||"day");
      if(isMobile()){
        topPanel.innerHTML="";
        contentPanel.innerHTML=`${statsHero({rangeOptionsHtml:optionsHtml(),summary,fmtDuration,primaryMetricLabel:primaryMetricLabel(),rangeControlHtml:controlHtml()})}${chartHtml}${tables(songs)}`;
      }else{
        topPanel.innerHTML=statsTopControls({summary,fmtDuration,primaryMetricLabel:primaryMetricLabel(),rangeOptionsHtml:optionsHtml(),rangeControlHtml:controlHtml()});
        contentPanel.innerHTML=`${chartHtml}${tables(songs)}`;
      }
      bindControls(); bindSongs(); bindDrilldowns();
    }
    function url(){
      const params=new URLSearchParams({period});
      if(period==="day"){params.set("start",day||localDateString()); params.set("end",day||localDateString());}
      else if(steppable()){const {start,end}=rangeDates(); params.set("start",start); params.set("end",end);}
      params.set("_",String(Date.now()));
      return `/api/listening-stats?${params}`;
    }
    async function load(){
      try{data=await fetchJson(url()); if(getMediaType()==="statsPage")render();}
      catch(error){
        console.warn("[stats] load failed",error); data=null;
        if(getMediaType()==="statsPage")contentPanel.innerHTML=`<div class="statsEmpty">Could not load listening stats. Restart the server so the new stats API is available, then refresh this page.</div>`;
      }
    }
    return {hasData:()=>Boolean(data),load,render};
  }

  window.MediaPlayerStatsController={create};
})();
