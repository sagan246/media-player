(function(){
  "use strict";

  /** Shared drawer rendering and drag behavior for music and video queues. */
  function create(options){
    const {setOpen, queueListHtml} = options;

    function bindList(listEl, playIndex, removeIndex){
      listEl.querySelectorAll(".queueItem[data-index]").forEach(item => item.addEventListener("click", event => {
        if(event.target.closest("button")) return;
        playIndex(Number(item.dataset.index));
      }));
      listEl.querySelectorAll(".queueItem[data-index]").forEach(item => item.addEventListener("keydown", event => {
        if(event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        playIndex(Number(item.dataset.index));
      }));
      listEl.querySelectorAll("button[data-remove]").forEach(button => button.addEventListener("click", event => {
        event.stopPropagation();
        removeIndex(Number(button.dataset.remove));
      }));
    }

    function bindMoveButtons(listEl, moveItem){
      listEl.querySelectorAll("button[data-move]").forEach(button => button.addEventListener("click", event => {
        event.stopPropagation();
        const fromIndex = Number(button.dataset.index);
        const toIndex = fromIndex + Number(button.dataset.move);
        moveItem(fromIndex, toIndex);
        requestAnimationFrame(() => {
          listEl.querySelector(`.queueItem[data-index="${toIndex}"]`)?.focus();
        });
      }));
    }

    function bindDrag(listEl, moveItem){
      listEl.querySelectorAll(".queueItem[data-index]").forEach(item => {
        item.addEventListener("dragstart", event => {
          item.classList.add("dragging");
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", item.dataset.index);
        });
        item.addEventListener("dragend", () => item.classList.remove("dragging"));
        item.addEventListener("dragover", event => {
          event.preventDefault();
          item.classList.add("dropTarget");
          event.dataTransfer.dropEffect = "move";
        });
        item.addEventListener("dragleave", () => item.classList.remove("dropTarget"));
        item.addEventListener("drop", event => {
          event.preventDefault();
          item.classList.remove("dropTarget");
          moveItem(Number(event.dataTransfer.getData("text/plain")), Number(item.dataset.index));
        });
      });
    }

    function render({listEl, items, activeIndex, emptyTitle, playIndex, removeIndex, moveItem, removable=true}){
      listEl.innerHTML = queueListHtml ? queueListHtml({items, activeIndex, emptyTitle, removable}) : "";
      bindList(listEl, playIndex, removeIndex);
      bindDrag(listEl, moveItem);
      bindMoveButtons(listEl, moveItem);
    }

    function scrollCurrentToTop(listEl, index){
      if(index < 0){
        listEl.style.setProperty("--queue-scroll-runway", "0px");
        return;
      }
      requestAnimationFrame(() => {
        const item = listEl.querySelector(`.queueItem[data-index="${index}"]`);
        if(!item) return;
        const sectionLabel = item.previousElementSibling?.classList.contains("queueSectionLabel")
          ? item.previousElementSibling
          : null;
        const scrollTarget = sectionLabel || item;
        const runway = Math.max(0, listEl.clientHeight - item.offsetHeight - 16);
        listEl.style.setProperty("--queue-scroll-runway", `${runway}px`);
        const listRect = listEl.getBoundingClientRect();
        const targetRect = scrollTarget.getBoundingClientRect();
        listEl.scrollTop += targetRect.top - listRect.top - 8;
      });
    }

    function toggle(drawer, listEl, activeIndex, renderQueue){
      const opening = !drawer.classList.contains("open");
      setOpen(drawer, opening);
      renderQueue();
      if(opening){
        scrollCurrentToTop(listEl, activeIndex);
        requestAnimationFrame(() => drawer.querySelector(".queueTitleButton, .closeQueue")?.focus({preventScroll:true}));
      }
    }

    return {render, toggle};
  }

  window.MediaPlayerQueueController = {create};
})();
