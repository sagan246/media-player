// Small shared helpers used by the browser app. Keeping them here makes the
// main app file easier to scan for actual player behavior.
window.MediaPlayerUi = {
  byId(id) {
    return document.getElementById(id);
  },
  on(el, event, handler) {
    el.addEventListener(event, handler);
  },
  setOpen(el, open) {
    el.classList.toggle("open", open);
    el.setAttribute("aria-hidden", String(!open));
    if(el.id === "nowPlayingDrawer") {
      document.body.classList.toggle("modalOpen", open);
    }
  },
  isActivationKey(event) {
    return event.key === "Enter" || event.key === " ";
  },
  setActive(el, active) {
    el.classList.toggle("active", active);
  },
  setBodyMode(name, active) {
    document.body.classList.toggle(name, active);
  },
  esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    }[char]));
  },
  localDateString(dateValue = new Date()) {
    const date = dateValue instanceof Date ? dateValue : new Date(`${dateValue}T00:00:00`);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
  },
  reconcileQueue(queue, queueIndex, activeId, validIds) {
    const original = Array.isArray(queue) ? queue : [];
    const activeIndex = Math.min(Math.max(Number(queueIndex) || 0, 0), Math.max(original.length - 1, 0));
    const available = original
      .map((id, index) => ({id, index}))
      .filter(item => validIds.has(item.id));
    if(!available.length) return {queue: [], queueIndex: -1, activeId: null, activeChanged: activeId !== null};
    const active = available.find(item => item.id === activeId)
      || available.find(item => item.index >= activeIndex)
      || available.at(-1);
    return {
      queue: available.map(item => item.id),
      queueIndex: available.indexOf(active),
      activeId: active.id,
      activeChanged: active.id !== activeId,
    };
  },
  async fetchJson(url, options = {}) {
    const response = await fetch(url, {cache: "no-store", ...options});
    if(!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  },
};
