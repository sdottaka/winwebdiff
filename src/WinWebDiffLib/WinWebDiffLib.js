(function () {
  window.wdw = { "inClick": false };
  function getNearestVisibleElement(el) {
    while (el) {
      const rc = el.getBoundingClientRect();
      if (rc.left == 0 && rc.top == 0 && rc.width == 0 && rc.height == 0) {
        el = el.parentElement;
        continue;
      }
      break;
    }
    return el;
  }
  function syncScroll(msg) {
    const el = document.querySelector(msg.selector);
    if (el && getWindowLocation() === msg.window) {
      clearTimeout(wdw.timeout);
      wdw.timeout = setTimeout(function () {
        const rleft = Math.round((el.scrollWidth - el.clientWidth) * msg.rleft);
        let rtop;
        let el1 = el.querySelector("[data-wwdid='" + msg.nearestDiffs.ids[0] + "']");
        if (el1) {
          el1 = getNearestVisibleElement(el1);
          if (!el1)
            msg.nearestDiffs.ids[0] = -1;
        }
        let el2 = el.querySelector("[data-wwdid='" + msg.nearestDiffs.ids[1] + "']");
        if (el2) {
          el2 = getNearestVisibleElement(el2);
          if (!el2)
            msg.nearestDiffs.ids[1] = -1;
        }
        const rectParent = el.getBoundingClientRect();
        let rectParentTop = rectParent.top;
        if (el.parentElement) {
          rectParentTop -= el.scrollTop;
        }
        if (msg.nearestDiffs.ids[0] == -1 && msg.nearestDiffs.ids[1] == -1) {
          rtop = Math.round((el.scrollHeight - el.clientHeight) * msg.rtop);
        } else if (msg.nearestDiffs.ids[0] == -1 && msg.nearestDiffs.ids[1] != -1) {
          const rect2 = el2.getBoundingClientRect();
          rtop = Math.round(0 + (rect2.top - rectParentTop) * msg.nearestDiffs.rypos - msg.nearestDiffs.yo);
        } else if (msg.nearestDiffs.ids[0] != -1 && msg.nearestDiffs.ids[1] == -1) {
          const rect1 = el1.getBoundingClientRect();
          rtop = Math.round(rect1.top - rectParentTop + (el.scrollHeight - (rect1.top + rect1.height - rectParentTop)) * msg.nearestDiffs.rypos - msg.nearestDiffs.yo);
        } else if (msg.nearestDiffs.ids[0] == msg.nearestDiffs.ids[1]) {
          const rect1 = el1.getBoundingClientRect();
          rtop = Math.round(rect1.top - rectParentTop + rect1.height * msg.nearestDiffs.rypos - msg.nearestDiffs.yo);
        } else {
          const rect1 = el1.getBoundingClientRect();
          const rect2 = el2.getBoundingClientRect();
          rtop = Math.round(rect1.top + rect1.height - rectParentTop + (rect2.top - (rect1.top + rect1.height)) * msg.nearestDiffs.rypos - msg.nearestDiffs.yo);
        }
        if (el.scroll) {
          window.removeEventListener("scroll", onScroll, true);
          el.scroll(rleft, rtop);
          setTimeout(function () { window.addEventListener("scroll", onScroll, true); }, 10);
        }
      }, 100);
    }
  }
  function syncClick(msg) {
    var el = document.querySelector(msg.selector);
    if (el && getWindowLocation() === msg.window) {
      wdw.inClick = true;
      if (el.click)
        el.click();
      wdw.inClick = false;
    }
  }
  function syncInput(msg) {
    var el = document.querySelector(msg.selector);
    if (el && getWindowLocation() === msg.window) {
      el.value = msg.value;
    }
  }
  function getWindowLocation() {
    let locationString = "";
    let currentWindow = window;

    while (currentWindow !== window.top) {
      const frames = currentWindow.parent.frames;
      let index = -1;
      for (let i = 0; i < frames.length; i++) {
        if (frames[i] === currentWindow) {
          index = i;
          break;
        }
      }
      if (index !== -1) {
        locationString = `[${index}]` + locationString;
      } else {
        locationString = "top" + locationString;
      }
      currentWindow = currentWindow.parent;
    }

    return locationString;
  }
  function getElementSelector(element) {
    if (!(element instanceof Element)) {
      return null;
    }

    const selectorList = [];
    while (element.parentNode) {
      let nodeName = element.nodeName.toLowerCase();
      if (element.id) {
        selectorList.unshift(`#${element.id}`);
        break;
      } else {
        let sibCount = 0;
        let sibIndex = 0;
        const siblings = element.parentNode.childNodes;
        for (let i = 0; i < siblings.length; i++) {
          const sibling = siblings[i];
          if (sibling.nodeType === 1) {
            if (sibling === element) {
              sibIndex = sibCount;
            }
            if (sibling.nodeName.toLowerCase() === nodeName) {
              sibCount++;
            }
          }
        }
        if (sibIndex > 0) {
          nodeName += `:nth-of-type(${sibIndex + 1})`;
        }
        selectorList.unshift(nodeName);
        element = element.parentNode;
      }
    }
    return selectorList.join(" > ");
  }
  function isElementFixed(el) {
    while (el) {
      const sty = window.getComputedStyle(el);
      if (sty.position === 'fixed' || sty.position === 'sticky')
        return true;
      el = el.parentElement;
    }
    return false;
  }
  function hasScrollableAncestor(el, elRoot) {
    let ancestor = el.parentElement;
    while (ancestor && elRoot != ancestor) {
      if (ancestor.scrollHeight != ancestor.clientHeight)
        return true;
      ancestor = ancestor.parentElement;
    }
    return false;
  }
  function getNearestDiffs(elScroll) {
    const scrTop = elScroll.scrollTop;
    let id1 = -1, id2 = -1;
    let y1 = 0, y2 = elScroll.scrollHeight;
    let rectParent = elScroll.getBoundingClientRect();
    let rectParentTop = rectParent.top;
    const yc = scrTop + elScroll.clientHeight / 2;
    if (elScroll.parentElement) {
      rectParentTop -= scrTop;
    }
    for (let el of elScroll.getElementsByClassName("wwd-diff")) {
      const rect = el.getBoundingClientRect();
      if (rect.left == 0 && rect.top == 0 && rect.width == 0 && rect.height == 0)
        continue;
      if (hasScrollableAncestor(el, elScroll))
        continue;
      if (isElementFixed(el))
        continue;
      const id = el.dataset["wwdid"];
      const t = rect.top - rectParentTop;
      const b = t + rect.height;
      if (t <= yc && yc <= b) {
        id1 = id;
        id2 = id;
        y1 = t;
        y2 = b;
        break;
      }
      if (b < yc && b >= y1) {
        id1 = id;
        y1 = b;
      }
      if (t > yc && t < y2) {
        id2 = id;
        y2 = t;
      }
    }
    return { "ids": [id1, id2], "rypos": ((yc - y1) / (y2 - y1)), "yo": yc - scrTop };
  }
  function onScroll(e) {
    const elScroll = ("scrollingElement" in e.target) ? e.target.scrollingElement : e.target;
    clearTimeout(wdw.timeout2);
    wdw.timeout2 = setTimeout(function () {
      const sel = getElementSelector(elScroll);
      const nearestDiffs = getNearestDiffs(elScroll);
      const msg = {
        "event": "scroll",
        "window": getWindowLocation(),
        "selector": sel,
        "rleft": ((elScroll.scrollWidth == elScroll.clientWidth) ? 0 : (elScroll.scrollLeft / (elScroll.scrollWidth - elScroll.clientWidth))),
        "rtop": ((elScroll.scrollHeight == elScroll.clientHeight) ? 0 : (elScroll.scrollTop / (elScroll.scrollHeight - elScroll.clientHeight))),
        "nearestDiffs": nearestDiffs
      };
      window.chrome.webview.postMessage(JSON.stringify(msg));
    }, 100);
  }
  function onClick(e) {
    if (wdw.inClick)
      return;
    const sel = getElementSelector(e.target);
    const msg = { "event": "click", "window": getWindowLocation(), "selector": sel };
    window.chrome.webview.postMessage(JSON.stringify(msg));
  }
  function onInput(e) {
    const sel = getElementSelector(e.target);
    const msg = { "event": "input", "window": getWindowLocation(), "selector": sel, "value": e.target.value };
    window.chrome.webview.postMessage(JSON.stringify(msg));
  }
  function onDblClick(e) {
    const el = e.target;
    const sel = getElementSelector(el);
    const wwdid = ("wwdid" in el.dataset) ? el.dataset["wwdid"] : (("wwdid" in el.parentElement.dataset) ? el.parentElement.dataset["wwdid"] : -1);
    const msg = { "event": "dblclick", "window": getWindowLocation(), "selector": sel, "wwdid": parseInt(wwdid) };
    window.chrome.webview.postMessage(JSON.stringify(msg));
  }
  function onMessage(arg) {
    const data = arg.data;
    switch (data.event) {
      case "scroll":
        syncScroll(data);
        break;
      case "click":
        syncClick(data);
        break;
      case "input":
        syncInput(data);
        break;
    }
  }
  window.addEventListener("click", onClick, true);
  window.addEventListener("input", onInput, true);
  window.addEventListener("dblclick", onDblClick, true);
  window.addEventListener("scroll", onScroll, true);
  window.chrome.webview.addEventListener("message", onMessage);
})();
