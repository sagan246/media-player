(function(){
  "use strict";

  /** Queue mutations for video; source loading remains with the app coordinator. */
  function create(options){
    const {
      getQueue,
      getIndex,
      setQueue,
      setIndex,
      getSelectedId,
      setContext,
      save,
      playIndex,
      stopPlayback,
      updateLabel,
      renderQueue,
      renderVideos,
      showToast,
      pulseQueue,
      shuffle,
    } = options;

    function playList(list, randomize=false, startId=null, settings={}){
      const playable = randomize ? shuffle(list) : [...list];
      if(!playable.length) return;
      const ids = playable.map(video => video.id);
      setQueue(ids);
      setContext({...settings.context, shuffled:Boolean(randomize)});
      setIndex(startId === null ? 0 : Math.max(0, ids.indexOf(startId)));
      save({force:true});
      const source=settings.context?.label||settings.context?.kind||"selection";
      showToast(`Playing ${ids.length} ${ids.length===1?"video":"videos"} · ${source}`);
      playIndex(getIndex());
    }

    function add(list, settings={}){
      const queue = getQueue();
      const existing = new Set(queue);
      const ids = [];
      list.forEach(video => {
        if(video && !existing.has(video.id)){
          existing.add(video.id);
          ids.push(video.id);
        }
      });
      if(!ids.length) return;
      const wasEmpty = queue.length === 0;
      queue.push(...ids);
      showToast(`${ids.length === 1 ? "Added 1 video" : `Added ${ids.length} videos`} · ${queue.length} in queue`);
      pulseQueue();
      if(wasEmpty){
        setContext(settings.context || {kind:"Queue", label:"Added videos"});
        setIndex(0);
        save({force:true});
        playIndex(0);
      }else{
        save({force:true});
        updateLabel();
        renderQueue();
      }
    }

    function remove(index){
      const queue = getQueue();
      let currentIndex = getIndex();
      if(index < 0 || index >= queue.length) return;
      queue.splice(index, 1);
      if(index < currentIndex){
        setIndex(--currentIndex);
      }else if(index === currentIndex){
        if(queue.length){
          currentIndex = Math.min(index, queue.length - 1);
          setIndex(currentIndex);
          save({force:true});
          playIndex(currentIndex);
        }else{
          setIndex(-1);
          setContext(null);
          stopPlayback();
          save({force:true});
          renderVideos();
        }
      }
      save({force:true});
      updateLabel();
      renderQueue();
    }

    function move(fromIndex, toIndex){
      const queue = getQueue();
      if(fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= queue.length || toIndex >= queue.length) return;
      const current = queue[getIndex()] ?? getSelectedId();
      const [item] = queue.splice(fromIndex, 1);
      queue.splice(toIndex, 0, item);
      setIndex(current === undefined ? -1 : queue.indexOf(current));
      save({force:true});
      updateLabel();
      renderQueue();
    }

    return {add, move, playList, remove};
  }

  window.MediaPlayerVideoController = {create};
})();
