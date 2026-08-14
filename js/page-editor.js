(function () {
  var PATH = (window.location.pathname.split("/").pop() || "index.html");
  var IS_EDIT = /[?&]edit=1/.test(window.location.search);
  var TEXT_SEL = "h1, h2, h3, p, .slogan, .lead, .hero-note, .section-sub, .coverage-note";
  var peStyle = null;
  var peEditing = false;

  function getSb() {
    if (window.portal && window.portal.supabase) return window.portal.supabase;
    try {
      if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
        return window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
      }
    } catch (e) {}
    return null;
  }

  function getHolder() {
    var main = document.querySelector("main");
    if (main) return main.querySelector(".container") || main;
    return document.body;
  }

  function getBoxes() {
    var holder = getHolder();
    if (!holder) return [];
    if (holder === document.body) {
      return [].slice.call(document.querySelectorAll("body > section"));
    }
    return [].slice.call(holder.children).filter(function (el) {
      return el.nodeType === 1 && el.tagName !== "SCRIPT" && el.tagName !== "STYLE";
    });
  }

  function boxKey(el) {
    if (el.id) return "id:" + el.id;
    var h = el.querySelector("h1, h2");
    if (h && h.textContent.trim()) return "h:" + h.textContent.trim();
    return "box:" + el.className;
  }

  function textEls(box) {
    var out = [];
    box.querySelectorAll(TEXT_SEL).forEach(function (e) {
      if (e.closest("button")) return;
      if (e.querySelector("button, a.btn, input, select, textarea")) return;
      out.push(e);
    });
    return out;
  }

  function cardEls(box) {
    var seen = [];
    box.querySelectorAll(".grid > .card, .card").forEach(function (c) {
      if (seen.indexOf(c) > -1) return;
      var p = c.parentNode;
      if (p && p.classList && p.classList.contains("grid")) { seen.push(c); return; }
      if (p === box) { seen.push(c); return; }
      if (p && p.parentNode === box) { seen.push(c); return; }
    });
    return seen;
  }

  function collect() {
    var layout = { version: 1, sections: [], text: {}, cards: {} };
    getBoxes().forEach(function (box) {
      var k = boxKey(box);
      layout.sections.push(k);
      layout.text[k] = textEls(box).map(function (e) { return e.textContent; });
      layout.cards[k] = cardEls(box).map(function (c, i) { return "c" + i; });
    });
    return layout;
  }

  function apply(layout) {
    if (!layout || !layout.sections) return;
    var boxes = getBoxes();
    if (!boxes.length) return;
    var byKey = {};
    boxes.forEach(function (b) { byKey[boxKey(b)] = b; });
    var parent = boxes[0].parentNode;

    layout.sections.forEach(function (k) {
      if (byKey[k] && parent) parent.appendChild(byKey[k]);
    });

    layout.sections.forEach(function (k) {
      var b = byKey[k];
      if (!b) return;
      if (layout.text[k]) {
        var els = textEls(b);
        layout.text[k].forEach(function (txt, i) {
          if (i < els.length) els[i].textContent = txt;
        });
      }
      if (layout.cards[k]) {
        var cards = cardEls(b);
        if (!cards.length) return;
        var order = {};
        cards.forEach(function (c, i) { order["c" + i] = c; });
        var cp = cards[0].parentNode;
        layout.cards[k].forEach(function (ck) {
          if (order[ck] && cp) cp.appendChild(order[ck]);
        });
      }
    });
  }

  function loadLayout() {
    var sb = getSb();
    if (!sb) return;
    sb.from("site_pages").select("layout_json").eq("path", PATH).maybeSingle().then(function (res) {
      if (res.error || !res.data || !res.data.layout_json) return;
      try {
        apply(JSON.parse(res.data.layout_json));
      } catch (e) {}
    }).catch(function () {});
  }

  function injectStyle() {
    if (peStyle) return;
    peStyle = document.createElement("style");
    peStyle.id = "pe-style";
    peStyle.textContent =
      ".pe-box{position:relative;outline:2px dashed rgba(220,38,38,0.55);outline-offset:5px;}" +
      ".pe-box.pe-dragging{opacity:0.45;}" +
      ".pe-box.pe-drop{outline-color:#ff2b2b;box-shadow:0 0 0 4px rgba(255,43,43,0.35);}" +
      ".pe-bar{position:absolute;top:-16px;right:10px;z-index:99999;display:flex;gap:3px;background:#16161c;border:1px solid rgba(220,38,38,0.65);border-radius:9px;padding:3px;box-shadow:0 4px 16px rgba(0,0,0,0.6);}" +
      ".pe-bar button{width:28px;height:28px;font-size:0.9rem;line-height:1;color:#ef4444;background:transparent;border:none;cursor:pointer;border-radius:6px;font-family:inherit;}" +
      ".pe-bar button:hover{background:rgba(220,38,38,0.25);}" +
      ".pe-drag{color:#ef4444;cursor:grab;padding:0 7px;font-size:1rem;display:flex;align-items:center;user-select:none;}" +
      ".pe-text:focus{outline:2px solid rgba(255,43,43,0.85);background:rgba(220,38,38,0.07);border-radius:4px;}" +
      ".pe-hint{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:999999;background:#16161c;border:1px solid rgba(220,38,38,0.6);color:#f4f4f5;padding:9px 18px;border-radius:10px;font-size:0.85rem;box-shadow:0 8px 24px rgba(0,0,0,0.6);}";
    document.head.appendChild(peStyle);
  }

  function siblingsOf(box) {
    return getBoxes().filter(function (b) { return b.parentNode === box.parentNode; });
  }

  function swapWith(box, offset) {
    var list = siblingsOf(box);
    var i = list.indexOf(box);
    var j = i + offset;
    if (i === -1 || j < 0 || j >= list.length) return;
    if (offset > 0) box.parentNode.insertBefore(box, list[j].nextSibling);
    else box.parentNode.insertBefore(box, list[j]);
    if (peEditing) refreshBars();
  }

  function decorate(box) {
    if (box.querySelector(".pe-bar")) return;
    var bar = document.createElement("div");
    bar.className = "pe-bar";
    bar.innerHTML =
      '<span class="pe-drag" title="Seret">⠿</span>' +
      '<button type="button" data-dir="up" title="Naik">&#9650;</button>' +
      '<button type="button" data-dir="down" title="Turun">&#9660;</button>' +
      '<button type="button" data-dir="left" title="Kiri">&#9664;</button>' +
      '<button type="button" data-dir="right" title="Kanan">&#9654;</button>';
    bar.querySelectorAll("button").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var d = btn.getAttribute("data-dir");
        if (d === "up" || d === "left") swapWith(box, -1);
        else swapWith(box, 1);
      });
    });
    box.appendChild(bar);
    box.classList.add("pe-box");
    textEls(box).forEach(function (e) {
      e.contentEditable = "true";
      e.classList.add("pe-text");
    });
    box.draggable = true;
    box.addEventListener("dragstart", function (ev) {
      ev.dataTransfer.setData("text/plain", boxKey(box));
      ev.dataTransfer.effectAllowed = "move";
      box.classList.add("pe-dragging");
    });
    box.addEventListener("dragend", function () {
      box.classList.remove("pe-dragging");
      document.querySelectorAll(".pe-drop").forEach(function (x) { x.classList.remove("pe-drop"); });
    });
    box.addEventListener("dragover", function (ev) {
      ev.preventDefault();
      ev.dataTransfer.dropEffect = "move";
      box.classList.add("pe-drop");
    });
    box.addEventListener("dragleave", function () { box.classList.remove("pe-drop"); });
    box.addEventListener("drop", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      var sk = ev.dataTransfer.getData("text/plain");
      document.querySelectorAll(".pe-drop").forEach(function (x) { x.classList.remove("pe-drop"); });
      var src = null;
      getBoxes().forEach(function (b) { if (boxKey(b) === sk) src = b; });
      var tgt = box;
      if (src && src !== tgt && src.parentNode === tgt.parentNode) {
        tgt.parentNode.insertBefore(src, tgt);
        refreshBars();
      }
    });
  }

  function refreshBars() {
    getBoxes().forEach(function (b) {
      var old = b.querySelector(".pe-bar");
      if (old) old.remove();
      b.classList.remove("pe-box");
      textEls(b).forEach(function (e) { e.contentEditable = "false"; e.classList.remove("pe-text"); });
      b.draggable = false;
      decorate(b);
    });
  }

  function enableEditor() {
    if (peEditing) return;
    peEditing = true;
    injectStyle();
    getBoxes().forEach(decorate);
    var hint = document.createElement("div");
    hint.className = "pe-hint";
    hint.id = "pe-hint";
    hint.textContent = "Mode Edit: seret mana-mana kotak atau guna anak panah. Klik teks untuk ubah. Tekan Simpan di admin panel.";
    document.body.appendChild(hint);
  }

  function disableEditor() {
    if (!peEditing) return;
    peEditing = false;
    getBoxes().forEach(function (b) {
      var old = b.querySelector(".pe-bar");
      if (old) old.remove();
      b.classList.remove("pe-box", "pe-dragging", "pe-drop");
      textEls(b).forEach(function (e) { e.contentEditable = "false"; e.classList.remove("pe-text"); });
      b.draggable = false;
    });
    var hint = document.getElementById("pe-hint");
    if (hint && hint.parentNode) hint.parentNode.removeChild(hint);
  }

  document.addEventListener("pe:edit-on", enableEditor);
  document.addEventListener("pe:edit-off", disableEditor);
  window.__pageEditor = { collect: collect, enable: enableEditor, disable: disableEditor };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      loadLayout();
      if (IS_EDIT) setTimeout(enableEditor, 400);
    });
  } else {
    loadLayout();
    if (IS_EDIT) setTimeout(enableEditor, 400);
  }
})();
