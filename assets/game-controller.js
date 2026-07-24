(function(){
  "use strict";

  /**
   * Coordinate the optional game iframe without leaking game protocol details
   * into the main application coordinator.
   */
  function create(options){
    const {
      frame,
      fetchJson,
      getArtworkUrl,
      getMobileVisualizerEnabled,
      onCatModeChange,
      onVisualizerOnlyChange,
    }=options;

    let allTimeScore=0;

    function post(message){
      if(!frame?.dataset.loaded)return;
      frame.contentWindow?.postMessage(message,location.origin);
    }

    function syncArtwork(){
      post({
        type:"media-player-game-artwork",
        artworkUrl:getArtworkUrl(),
        mobileVisualizerEnabled:Boolean(getMobileVisualizerEnabled()),
      });
    }

    function sendHighScore(){
      post({type:"media-player-game-all-time",score:allTimeScore});
    }

    function renderHighScore(score){
      allTimeScore=Math.max(0,Number.parseInt(score,10)||0);
      sendHighScore();
    }

    async function loadHighScore(){
      try{renderHighScore((await fetchJson("/api/game-score")).best_score);}
      catch(error){console.warn("[game] high score load failed",error);}
    }

    async function recordHighScore(score){
      const candidate=Number.parseInt(score,10);
      if(!Number.isInteger(candidate)||candidate<0)return;
      try{
        const result=await fetchJson("/api/game-score",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({score:candidate}),
        });
        renderHighScore(result.best_score);
      }catch(error){console.warn("[game] high score save failed",error);}
    }

    function setVisible(visible){
      post({type:"media-player-game-visibility",visible:Boolean(visible)});
    }

    function handleMessage(event){
      if(event.origin!==location.origin)return;
      const data=event.data;
      if(!data||typeof data.type!=="string")return;
      if(data.type==="media-player-game-ready"){
        syncArtwork();
        onCatModeChange(Boolean(data.catMode));
        sendHighScore();
        if(Number(data.bestScore)>allTimeScore)recordHighScore(data.bestScore);
      }else if(data.type==="media-player-game-score"){
        recordHighScore(data.score);
      }else if(data.type==="media-player-game-mode"){
        onVisualizerOnlyChange(Boolean(data.visualizerOnly));
      }else if(data.type==="media-player-game-cat-mode"){
        onCatModeChange(Boolean(data.enabled));
      }
    }

    return {handleMessage,loadHighScore,setVisible,syncArtwork};
  }

  window.MediaPlayerGameController={create};
})();
