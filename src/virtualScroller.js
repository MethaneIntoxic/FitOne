// ========== VIRTUAL LIST RENDERER ==========
// Lightweight incremental renderer for large lists.

(function () {
  function renderChunk(state, reset) {
    const container = state.container;
    const items = state.items;
    if (!container) return;

    const start = reset ? 0 : state.renderedCount;
    const nextCount = Math.min(items.length, start + state.pageSize);
    if (reset) container.innerHTML = "";

    if (start >= nextCount) return;

    const html = [];
    for (let i = start; i < nextCount; i++) {
      html.push(state.renderItem(items[i], i));
    }

    if (reset) {
      container.innerHTML = html.join("");
    } else {
      container.insertAdjacentHTML("beforeend", html.join(""));
    }

    state.renderedCount = nextCount;
  }

  function bindScroll(container) {
    if (!container || container._virtualListBound) return;
    container._virtualListBound = true;

    const handleMaybeAppend = function () {
      if (!document.body.contains(container)) {
        container.removeEventListener("scroll", handleMaybeAppend);
        window.removeEventListener("scroll", handleMaybeAppend);
        window.removeEventListener("resize", handleMaybeAppend);
        container._virtualListBound = false;
        return;
      }
      const state = container._virtualListState;
      if (!state) return;
      if (state.renderedCount >= state.items.length) return;
      const threshold = 120;
      const nearBottomInContainer =
        container.scrollTop + container.clientHeight >=
        container.scrollHeight - threshold;
      const containerCanScroll = container.scrollHeight > container.clientHeight + 4;
      const rect = container.getBoundingClientRect();
      const viewportBottom = (window.innerHeight || document.documentElement.clientHeight || 0) + threshold;
      const nearViewport = rect.top < viewportBottom && rect.bottom <= viewportBottom;
      if ((containerCanScroll && nearBottomInContainer) || (!containerCanScroll && nearViewport)) {
        renderChunk(state, false);
      }
    };

    container.addEventListener("scroll", handleMaybeAppend);
    window.addEventListener("scroll", handleMaybeAppend, { passive: true });
    window.addEventListener("resize", handleMaybeAppend);
    setTimeout(handleMaybeAppend, 0);
  }

  function renderVirtualList(container, items, renderItem, options) {
    const opts = options || {};
    const list = Array.isArray(items) ? items : [];
    const pageSize = Math.max(10, Number(opts.pageSize) || 40);
    const emptyHtml =
      typeof opts.emptyHtml === "string"
        ? opts.emptyHtml
        : '<div class="empty"><div class="empty-text">No items found</div></div>';

    if (!container || typeof renderItem !== "function") return;

    if (!list.length) {
      container.innerHTML = emptyHtml;
      container.classList.remove("virtual-scroll-host");
      container._virtualListState = null;
      return;
    }

    container.classList.add("virtual-scroll-host");

    const state = {
      container,
      items: list,
      renderItem,
      pageSize,
      renderedCount: 0,
    };

    container._virtualListState = state;
    renderChunk(state, true);
    bindScroll(container);
  }

  if (typeof window !== "undefined") {
    window.renderVirtualList = renderVirtualList;
  }
})();
