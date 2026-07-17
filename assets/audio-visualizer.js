(function(){
  "use strict";

  const MODES = ["bars", "wave", "dots", "mirror", "ring", "mountain", "orbit", "rain"];
  const CANVAS_IDS = ["nowPlayingVisualizer", "gameVisualizer"];
  const GAME_SIGNAL_INTERVAL = 1000 / 30;

  function isMobileDevice(){
    return Boolean(navigator.userAgentData?.mobile)
      || /Android|Mobile|iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function create({player, byId, themeEngine, allowMobileNowPlaying=()=>false, allowMobileGame=()=>false}){
    const mobileDevice = isMobileDevice();
    let audioContext = null;
    let analyser = null;
    let source = null;
    let frequencyData = null;
    let frame = null;
    let lastFrameAt = 0;
    let lastGameSignalAt = 0;
    let mode = localStorage.getItem("visualizerMode") || "bars";

    if(!MODES.includes(mode)) mode = "bars";

    function mobileGameVisualizerEnabled(){return Boolean(allowMobileGame());}
    // Mobile Web Audio can interrupt native lock-screen controls, so Now
    // Playing only opts into it through an explicit saved device preference.
    function allowed(){return !mobileDevice || Boolean(allowMobileNowPlaying());}
    function analyserAllowed(){return allowed() || mobileGameVisualizerEnabled();}
    function currentMode(){return mode;}

    function setMode(value){
      mode = MODES.includes(value) ? value : "bars";
      localStorage.setItem("visualizerMode", mode);
      const canvas = byId("nowPlayingVisualizer");
      if(canvas) canvas.title = `Visualizer: ${mode}. Click to switch.`;
    }

    function clear(id="nowPlayingVisualizer"){
      const canvas = byId(id);
      const context = canvas?.getContext("2d");
      if(context) context.clearRect(0, 0, canvas.width, canvas.height);
    }

    function clearAll(){CANVAS_IDS.forEach(clear);}

    function sendGameEnergy(levels, active=true){
      const gameFrame = byId("gameFrame");
      gameFrame?.contentWindow?.postMessage({
        type:"media-player-game-audio",
        active,
        mobileEnabled:mobileGameVisualizerEnabled(),
        energy:levels?.energy || 0,
        bass:levels?.bass || 0,
        mids:levels?.mids || 0,
        highs:levels?.highs || 0
      }, location.origin);
    }

    function initialize(){
      if(!analyserAllowed()) return false;
      if(analyser) return true;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if(!AudioContext) return false;
      try{
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = .78;
        frequencyData = new Uint8Array(analyser.frequencyBinCount);
        source = audioContext.createMediaElementSource(player);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        return true;
      }catch(error){
        console.warn("[audio] visualizer unavailable", error);
        analyser = null;
        return false;
      }
    }

    function resume(){
      if(!initialize()) return Promise.resolve(false);
      if(audioContext?.state === "suspended"){
        return audioContext.resume().then(()=>true).catch(()=>false);
      }
      return Promise.resolve(true);
    }

    function start(){
      resume().then(ok=>{
        if(!ok || frame || player.paused || player.ended) return;
        drawFrame();
      });
    }

    function stop(){
      if(frame){
        cancelAnimationFrame(frame);
        frame = null;
      }
      clearAll();
      sendGameEnergy(null, false);
    }

    function cycle(){
      setMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length]);
      clearAll();
      if(!player.paused && !player.ended) requestAnimationFrame(start);
    }

    function fillRounded(context, x, y, width, height, radius){
      if(context.roundRect){
        context.beginPath();
        context.roundRect(x, y, width, height, radius);
        context.fill();
      }else{
        context.fillRect(x, y, width, height);
      }
    }

    function prepare(canvas){
      const context = canvas.getContext("2d");
      if(!context || !analyser || !frequencyData) return null;
      const rect = canvas.getBoundingClientRect();
      if(rect.width < 2 || rect.height < 2) return null;
      const nativeDpr = window.devicePixelRatio || 1;
      // A full-screen Retina canvas is unnecessarily expensive on phones.
      // Capping its backing resolution keeps playback controls responsive
      // without changing the visualizer's on-screen size.
      const dpr = mobileDevice
        ? Math.min(nativeDpr, canvas.id === "gameVisualizer" ? 1.35 : 2)
        : nativeDpr;
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if(canvas.width !== width || canvas.height !== height){
        canvas.width = width;
        canvas.height = height;
      }
      context.clearRect(0, 0, width, height);
      return {context, dpr, width, height};
    }

    function valueBetween(start, end){
      let sum = 0;
      for(let index=start; index<end; index++) sum += frequencyData[index];
      return sum / (end - start) / 255;
    }

    function bandValue(index, count){
      const start = Math.floor((index / count) * frequencyData.length * .72);
      const end = Math.max(start + 1, Math.floor(((index + 1) / count) * frequencyData.length * .72));
      return valueBetween(start, end);
    }

    function themeValue(name, fallback){
      return themeEngine.themeCssValue ? themeEngine.themeCssValue(name, fallback) : fallback;
    }

    function themeRgba(name, fallback, alpha){return `rgba(${themeValue(name, fallback)},${alpha})`;}
    function lightTheme(){return [...document.body.classList].some(name=>name.includes("theme-light"));}

    function drawBars(canvas, count){
      const state = prepare(canvas);
      if(!state) return;
      const {context, dpr, width, height} = state;
      const gap = Math.max(2*dpr, width/(count*5));
      const barWidth = (width-gap*(count-1))/count;
      for(let index=0; index<count; index++){
        const value = bandValue(index, count);
        const barHeight = Math.max(3*dpr, value*height*.92);
        const x = index*(barWidth+gap);
        const y = height-barHeight;
        const gradient = context.createLinearGradient(0, y, 0, height);
        gradient.addColorStop(0, themeValue("--accent-link", "#8db7ff"));
        gradient.addColorStop(1, themeValue("--accent", "#3f6fd8"));
        context.fillStyle = gradient;
        fillRounded(context, x, y, barWidth, barHeight, Math.min(barWidth/2, 4*dpr));
      }
    }

    function drawWave(canvas, count){
      const state = prepare(canvas);
      if(!state) return;
      const {context, dpr, width, height} = state;
      const middle = height*.55;
      context.lineWidth = 3*dpr;
      context.lineCap = "round";
      const gradient = context.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, themeValue("--accent", "#3f6fd8"));
      gradient.addColorStop(.5, themeValue("--accent-link", "#9cc4ff"));
      gradient.addColorStop(1, themeValue("--accent", "#3f6fd8"));
      context.strokeStyle = gradient;
      context.beginPath();
      for(let index=0; index<count; index++){
        const value = bandValue(index, count);
        const x = (index/(count-1))*width;
        const y = middle-Math.sin(index*.55+performance.now()/260)*value*height*.32-value*height*.22;
        if(index===0) context.moveTo(x,y); else context.lineTo(x,y);
      }
      context.stroke();
    }

    function drawDots(canvas, count){
      const state = prepare(canvas);
      if(!state) return;
      const {context, dpr, width, height} = state;
      const rows=4, gap=width/(count+1), light=lightTheme();
      // Pale adaptive accents could make this mode nearly disappear on light
      // backgrounds. Use the stronger accent there and retain the brighter
      // sheen on dark themes, preserving the original four-row dot meter.
      const colorName=light ? "--accent-rgb" : "--accent-sheen-rgb";
      const fallback=light ? "63,111,216" : "141,183,255";
      for(let index=0; index<count; index++){
        const value=bandValue(index,count), lit=Math.max(1,Math.round(value*rows));
        for(let row=0; row<rows; row++){
          const active=row<lit;
          context.fillStyle=themeRgba(
            colorName,
            fallback,
            active ? .42+value*.54 : (light ? .14 : .09)
          );
          context.beginPath();
          context.arc((index+1)*gap,height-(row+1)*(height/(rows+1)),Math.max(2.5*dpr,4*dpr*value),0,Math.PI*2);
          context.fill();
        }
      }
    }

    function drawMirror(canvas, count){
      const state=prepare(canvas);
      if(!state)return;
      const {context,dpr,width,height}=state;
      const middle=height*.5, gap=Math.max(2*dpr,width/(count*5)), barWidth=(width-gap*(count-1))/count;
      for(let index=0;index<count;index++){
        const value=bandValue(index,count), barHeight=Math.max(2*dpr,value*height*.45), x=index*(barWidth+gap);
        const gradient=context.createLinearGradient(0,middle-barHeight,0,middle+barHeight);
        gradient.addColorStop(0,themeRgba("--accent-sheen-rgb","156,196,255",.95));
        gradient.addColorStop(.5,themeRgba("--accent-rgb","63,111,216",.45));
        gradient.addColorStop(1,themeRgba("--accent-sheen-rgb","156,196,255",.95));
        context.fillStyle=gradient;
        fillRounded(context,x,middle-barHeight,barWidth,barHeight*2,Math.min(barWidth/2,4*dpr));
      }
    }

    function drawRing(canvas, count){
      const state=prepare(canvas);
      if(!state)return;
      const {context,dpr,width,height}=state;
      const centerX=width/2, centerY=height/2, base=Math.min(width,height)*.18;
      let total=0;
      for(let index=0;index<frequencyData.length*.72;index++)total+=frequencyData[index];
      const average=total/(frequencyData.length*.72)/255;
      context.lineCap="round";
      for(let index=0;index<count;index++){
        const value=bandValue(index,count), angle=(index/count)*Math.PI*2+performance.now()/2400;
        const inner=base+average*height*.12, outer=inner+value*height*.26;
        context.strokeStyle=themeRgba("--accent-sheen-rgb","141,183,255",.22+value*.72);
        context.lineWidth=Math.max(2*dpr,3*dpr*value);
        context.beginPath();
        context.moveTo(centerX+Math.cos(angle)*inner,centerY+Math.sin(angle)*inner);
        context.lineTo(centerX+Math.cos(angle)*outer,centerY+Math.sin(angle)*outer);
        context.stroke();
      }
      context.strokeStyle=themeRgba("--accent-rgb","63,111,216",.28);
      context.lineWidth=dpr;
      context.beginPath();
      context.arc(centerX,centerY,base+average*height*.12,0,Math.PI*2);
      context.stroke();
    }

    // The game has its own filled audio bloom. It stays visually independent
    // from the selectable Now Playing visualizers and leaves no hollow center.
    function drawGameBloom(canvas){
      if(!canvas)return null;
      const state=prepare(canvas);
      if(!state)return null;
      const {context,dpr,width,height}=state;
      const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      const bass=valueBetween(0,Math.min(8,frequencyData.length));
      const mids=valueBetween(Math.min(8,frequencyData.length-1),Math.min(26,frequencyData.length));
      const highs=valueBetween(Math.min(26,frequencyData.length-1),frequencyData.length);
      const energy=Math.min(1,bass*.52+mids*.34+highs*.14);
      const motion=reduced ? .12 : energy;
      const centerX=width/2;
      const centerY=height*.5;
      const baseRadius=Math.min(width,height)*(.47+bass*.035);
      const time=reduced ? 0 : performance.now()/6500;
      const cobalt="76,126,255";
      const violet="152,92,255";

      context.save();
      context.globalCompositeOperation="screen";
      context.lineCap="round";

      const bloom=context.createRadialGradient(centerX,centerY,0,centerX,centerY,baseRadius);
      bloom.addColorStop(0,`rgba(${cobalt},${.15+motion*.17})`);
      bloom.addColorStop(.28,`rgba(${violet},${.12+motion*.14})`);
      bloom.addColorStop(.56,`rgba(${cobalt},${.085+motion*.11})`);
      bloom.addColorStop(.82,`rgba(${violet},${.035+motion*.06})`);
      bloom.addColorStop(1,"rgba(20,28,60,0)");
      context.fillStyle=bloom;
      context.shadowColor=`rgba(${cobalt},${.12+motion*.18})`;
      context.shadowBlur=(20+motion*34)*dpr;
      context.beginPath();
      context.arc(centerX,centerY,baseRadius,0,Math.PI*2);
      context.fill();
      context.shadowBlur=0;

      // Slow offset light fields keep the filled center alive without
      // competing with the pieces the player needs to track.
      for(let fieldIndex=0;fieldIndex<3;fieldIndex++){
        const angle=time*(fieldIndex%2 ? -1.5 : 1.2)+fieldIndex*Math.PI*2/3;
        const offset=baseRadius*(.16+mids*.08);
        const fieldX=centerX+Math.cos(angle)*offset;
        const fieldY=centerY+Math.sin(angle)*offset;
        const fieldRadius=baseRadius*(.38+fieldIndex*.055);
        const fieldColor=fieldIndex%2 ? violet : cobalt;
        const field=context.createRadialGradient(fieldX,fieldY,0,fieldX,fieldY,fieldRadius);
        field.addColorStop(0,`rgba(${fieldColor},${.065+motion*.105})`);
        field.addColorStop(1,`rgba(${fieldColor},0)`);
        context.fillStyle=field;
        context.beginPath();
        context.arc(fieldX,fieldY,fieldRadius,0,Math.PI*2);
        context.fill();
      }

      // Two faint travelling waves register bass hits without leaving a
      // permanent target pattern in the middle of the playfield.
      const rippleClock=reduced ? .55 : (performance.now()/2600)%1;
      for(let ripple=0;ripple<2;ripple++){
        const phase=(rippleClock+ripple*.5)%1;
        const rippleRadius=baseRadius*(.18+phase*.72);
        const color=ripple%2 ? violet : cobalt;
        context.strokeStyle=`rgba(${color},${(1-phase)*(.012+bass*.055)})`;
        context.lineWidth=(2+(1-phase)*8+bass*4)*dpr;
        context.beginPath();
        context.arc(centerX,centerY,rippleRadius,0,Math.PI*2);
        context.stroke();
      }

      const count=72;
      for(let index=0;index<count;index++){
        const value=reduced ? .1 : bandValue(index,count);
        const angle=(index/count)*Math.PI*2+time;
        const wave=Math.sin(index*.47+time*3)*mids;
        const inner=baseRadius*(.77+wave*.025);
        const outer=inner+height*(.008+value*.048);
        const color=index%3===0 ? violet : cobalt;
        context.strokeStyle=`rgba(${color},${.035+value*.23})`;
        context.lineWidth=Math.max(dpr,(1+highs*1.8)*dpr);
        context.beginPath();
        context.moveTo(centerX+Math.cos(angle)*inner,centerY+Math.sin(angle)*inner);
        context.lineTo(centerX+Math.cos(angle)*outer,centerY+Math.sin(angle)*outer);
        context.stroke();
      }
      context.restore();
      return {energy,bass,mids,highs};
    }

    function drawMountain(canvas, count){
      const state=prepare(canvas);
      if(!state)return;
      const {context,width,height}=state, ground=height*.9;
      const gradient=context.createLinearGradient(0,height*.12,0,ground);
      gradient.addColorStop(0,themeRgba("--accent-sheen-rgb","156,196,255",.55));
      gradient.addColorStop(.55,themeRgba("--accent-rgb","63,111,216",.26));
      gradient.addColorStop(1,themeRgba("--accent-rgb","63,111,216",.02));
      context.fillStyle=gradient;
      context.beginPath();
      context.moveTo(0,ground);
      for(let index=0;index<count;index++){
        const value=bandValue(index,count), x=(index/(count-1))*width;
        context.lineTo(x,ground-value*height*.78-Math.sin(index*.5+performance.now()/500)*height*.035);
      }
      context.lineTo(width,ground);
      context.closePath();
      context.fill();
    }

    function drawOrbit(canvas, count){
      const state=prepare(canvas);
      if(!state)return;
      const {context,dpr,width,height}=state, centerX=width/2, centerY=height/2;
      let bass=0;
      for(let index=0;index<10&&index<frequencyData.length;index++)bass+=frequencyData[index];
      bass=bass/Math.min(10,frequencyData.length)/255;
      const base=Math.min(width,height)*(.18+bass*.18), time=performance.now()/900;
      for(let index=0;index<count;index++){
        const value=bandValue(index,count), angle=(index/count)*Math.PI*2+time*(index%2?1:-.7);
        const radius=base+value*height*.23;
        context.fillStyle=themeRgba("--accent-sheen-rgb","141,183,255",.18+value*.65);
        context.beginPath();
        context.arc(centerX+Math.cos(angle)*radius,centerY+Math.sin(angle)*radius,Math.max(2*dpr,5*dpr*value),0,Math.PI*2);
        context.fill();
      }
    }

    function drawRain(canvas, count){
      const state=prepare(canvas);
      if(!state)return;
      const {context,dpr,width,height}=state, light=lightTheme(), time=performance.now()/38;
      for(let index=0;index<count;index++){
        const value=bandValue(index,count), x=(index+.5)*(width/count), drops=Math.max(1,Math.round(value*4));
        for(let drop=0;drop<drops;drop++){
          const y=(time*(.45+value)+index*17+drop*29)%height;
          context.fillStyle=light
            ? themeRgba("--accent-rgb","63,111,216",.28+value*.62)
            : themeRgba("--accent-sheen-rgb","141,183,255",.12+value*.55);
          fillRounded(context,x-(light?1.75:1.5)*dpr,y,(light?3.5:3)*dpr,Math.max(6*dpr,18*dpr*value),2*dpr);
        }
      }
    }

    function drawFrame(){
      frame=null;
      if(player.paused||player.ended){stop(); return;}
      const frameNow=performance.now();
      if(mobileDevice&&frameNow-lastFrameAt<1000/30){
        frame=requestAnimationFrame(drawFrame);
        return;
      }
      lastFrameAt=frameNow;
      analyser.getByteFrequencyData(frequencyData);
      const renderers={wave:[drawWave,44],dots:[drawDots,32],mirror:[drawMirror,32],ring:[drawRing,48],mountain:[drawMountain,48],orbit:[drawOrbit,28],rain:[drawRain,40],bars:[drawBars,32]};
      const [renderer,count]=renderers[mode]||renderers.bars;
      const nowPlayingCanvas=byId("nowPlayingVisualizer");
      if(nowPlayingCanvas)renderer(nowPlayingCanvas,count);

      const gameLevels=drawGameBloom(byId("gameVisualizer"));
      const now=frameNow;
      if(gameLevels&&now-lastGameSignalAt>=GAME_SIGNAL_INTERVAL){
        lastGameSignalAt=now;
        sendGameEnergy(gameLevels, true);
      }
      frame=requestAnimationFrame(drawFrame);
    }

    return {allowed,currentMode,setMode,cycle,resume,start,stop,clear};
  }

  window.MediaPlayerAudioVisualizer={MODES,create};
})();
