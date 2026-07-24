(function(){
  "use strict";

  /** Queue mutations for music; the app coordinator retains audio-element control. */
  function create(options){
    const {
      getQueue,
      getIndex,
      setQueue,
      setIndex,
      getPlayingId,
      setActivePlaylist,
      setContext,
      save,
      playIndex,
      stopPlayback,
      update,
      renderQueue,
      renderRows,
      showToast,
      pulseQueue,
    } = options;

    function shuffled(list){
      const copy = [...list];
      for(let index = copy.length - 1; index > 0; index--){
        const other = Math.floor(Math.random() * (index + 1));
        [copy[index], copy[other]] = [copy[other], copy[index]];
      }
      return copy;
    }

    function unique(list){
      const seen = new Set();
      return list.filter(track => track && !seen.has(track.id) && seen.add(track.id));
    }

    function playList(list, randomize=false, startId=null, settings={}){
      const ordered = unique(list);
      const playable = randomize ? shuffled(ordered) : ordered;
      if(!playable.length) return;
      setActivePlaylist(settings.playlistId || null);
      setContext({...settings.context, shuffled:Boolean(randomize)});
      const ids = playable.map(track => track.id);
      const savedIndex = Number(settings.startIndex);
      const index = Number.isInteger(savedIndex)
        ? Math.min(Math.max(savedIndex, 0), ids.length - 1)
        : startId === null ? 0 : Math.max(0, ids.indexOf(startId));
      setQueue(ids);
      setIndex(index);
      save({force:true});
      const source=settings.context?.label||settings.context?.kind||"selection";
      showToast(`Playing ${ids.length} ${ids.length===1?"track":"tracks"} · ${source}`);
      playIndex(index, settings);
    }

    function add(list, settings={}){
      const queue = getQueue();
      const existing = new Set(queue);
      const ids = [];
      list.forEach(track => {
        if(track && !existing.has(track.id)){
          existing.add(track.id);
          ids.push(track.id);
        }
      });
      if(!ids.length) return;
      const wasEmpty = queue.length === 0;
      queue.push(...ids);
      showToast(`${ids.length === 1 ? "Added 1 track" : `Added ${ids.length} tracks`} · ${queue.length} in queue`);
      pulseQueue();
      if(wasEmpty){
        setActivePlaylist(settings.playlistId || null);
        setContext(settings.context || {kind:"Queue", label:"Added tracks"});
        setIndex(0);
        save({force:true});
        playIndex(0);
      }else{
        save({force:true});
        update();
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
          setActivePlaylist(null);
          setContext(null);
          stopPlayback();
          save({force:true});
          update();
          renderRows();
        }
      }
      save({force:true});
      update();
      renderQueue();
    }

    function move(fromIndex, toIndex){
      const queue = getQueue();
      if(fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= queue.length || toIndex >= queue.length) return;
      const current = queue[getIndex()] ?? getPlayingId();
      const [item] = queue.splice(fromIndex, 1);
      queue.splice(toIndex, 0, item);
      setIndex(current === undefined ? -1 : queue.indexOf(current));
      save({force:true});
      update();
      renderQueue();
    }

    return {add, move, playList, remove, shuffle:shuffled, unique};
  }

  window.MediaPlayerMusicController = {create};
})();
