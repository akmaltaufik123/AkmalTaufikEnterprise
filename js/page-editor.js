(function () {
  var PATH = (window.location.pathname.split("/").pop() || "index.html");
  var IS_EDIT = /[?&]edit=1/.test(window.location.search);
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

  function directText(el) {
    return (el.textContent || "").replace(/\s+/g, " ").trim();
  }

  function isContainer(el) {
    var kids = 0;
    for (var i = 0; i < el.children.length; i++) {
      var t = el.children[i].tagName;
      if (t !== "SCRIPT" && t !== "STYLE") kids++;
    }
    return kids >= 2;
  }

  function unitSiblings(el) {
    if (!el.parentNode) return [];
    return [].slice.call(el.parentNode.children).filter(function (c) {
      var t = c.tagName;
      return t !== "SCRIPT" && t !== "STYLE";
    });
  }

  function swapWith(el, offset) {
    var list = unitSiblings(el);
    var i = list.indexOf(el);
    if (i === -1) return;
    var j = i + offset;
    if (j < 0 || j >= list.length) return;
    if (offset > 0) el.parentNode.insertBefore(el, list[j].nextSibling);
    else el.parentNode.insertBefore(el, list[j]);
  }

  function snapshotOrig() {
    var walk = function (el) {
      for (var i = 0; i < el.children.length; i++) {
        var c = el.children[i];
        var t = c.tagName;
        if (t === "SCRIPT" || t === "STYLE" || t === "LINK" || t === "META") continue;
        if (!c.dataset.peOrig && directText(c)) c.dataset.peOrig = directText(c);
        walk(c);
      }
    };
    walk(document.body);
  }

  function containerKey(el) {
    if (el.id) return "id:" + el.id;
    var first = el.children[0];
    var t = "";
    if (first) {
      t = first.dataset.peOrig || directText(first);
    }
    if (t) return "t:" + t.slice(0, 40);
    return "c:" + el.tagName + ":" + (el.className || "");
  }

  function getContainers() {
    var out = [];
    var walk = function (el) {
      for (var i = 0; i < el.children.length; i++) {
        var c = el.children[i];
        var t = c.tagName;
        if (t === "SCRIPT" || t === "STYLE" || t === "LINK" || t === "META") continue;
        if (isContainer(c)) out.push(c);
        walk(c);
      }
    };
    walk(document.body);
    return out;
  }

  function collect() {
    var layout = { version: 2, containers: [] };
    var bodyC = { key: "body", order: [], text: [] };
    [].slice.call(document.body.children).forEach(function (c) {
      var t = c.tagName;
      if (t === "SCRIPT" || t === "STYLE") return;
      bodyC.order.push(c.dataset.peOrig || directText(c) || c.tagName);
      bodyC.text.push(directText(c));
    });
    layout.containers.push(bodyC);

    getContainers().forEach(function (el) {
      var c = { key: containerKey(el), order: [], text: [] };
      el.children.forEach(function (k) {
        var t = k.tagName;
        if (t === "SCRIPT" || t === "STYLE") return;
        c.order.push(k.dataset.peOrig || directText(k) || k.tagName);
        c.text.push(directText(k));
      });
      layout.containers.push(c);
    });
    return layout;
  }

  function apply(layout) {
    if (!layout) return;
    if (layout.version === 1) { applyV1(layout); return; }
    if (!layout.containers) return;

    var containers = getContainers();
    var byKey = {};
    containers.forEach(function (c) {
      var k = containerKey(c);
      if (!byKey[k]) byKey[k] = c;
    });

    layout.containers.forEach(function (sc) {
      var el = null;
      if (sc.key === "body") {
        el = document.body;
      } else if (byKey[sc.key]) {
        el = byKey[sc.key];
      } else {
        var idx = -1;
        layout.containers.forEach(function (c, i) { if (c === sc) idx = i; });
        if (idx > 0 && containers[idx - 1]) el = containers[idx - 1];
      }
      if (!el || el.dataset.peApplied === "1") return;
      if (!sc.order || sc.order.length !== el.children.length) return;

      var units = [].slice.call(el.children).filter(function (c) {
        var t = c.tagName;
        return t !== "SCRIPT" && t !== "STYLE";
      });
      if (units.length !== sc.order.length) return;

      var ordered = [];
      var used = {};
      sc.order.forEach(function (orig) {
        for (var i = 0; i < units.length; i++) {
          if (used[i]) continue;
          var u = units[i];
          var uo = u.dataset.peOrig || directText(u) || u.tagName;
          if (uo === orig || (orig && uo && orig.indexOf(uo) > -1) || (uo && orig && uo.indexOf(orig) > -1)) {
            used[i] = true;
            ordered.push(u);
            break;
          }
        }
      });
      units.forEach(function (u, i) { if (!used[i]) ordered.push(u); });

      if (ordered.length === units.length) {
        ordered.forEach(function (u) { el.appendChild(u); });
      }

      if (sc.text) {
        var kids = [].slice.call(el.children);
        sc.text.forEach(function (txt, i) {
          if (i < kids.length && txt != null && txt !== "") {
            if (kids[i].textContent !== txt) kids[i].textContent = txt;
          }
        });
      }
      el.dataset.peApplied = "1";
    });
  }

  function applyV1(layout) {
    if (!layout.sections) return;
    var boxes = [].slice.call(document.querySelectorAll("body > section"));
    if (!boxes.length) return;
    var byKey = {};
    boxes.forEach(function (b) {
      var k = b.id ? "id:" + b.id : "h:" + (b.querySelector("h1, h2") ? b.querySelector("h1, h2").textContent.trim() : "");
      byKey[k] = b;
    });
    layout.sections.forEach(function (k) { if (byKey[k]) document.body.appendChild(byKey[k]); });
    layout.sections.forEach(function (k) {
      var b = byKey[k];
      if (!b) return;
      if (layout.text[k]) {
        var els = [].slice.call(b.querySelectorAll("h1, h2, h3, p, .slogan, .lead, .hero-note, .section-sub, .coverage-note"));
        layout.text[k].forEach(function (txt, i) { if (i < els.length) els[i].textContent = txt; });
      }
      if (layout.cards[k]) {
        var cards = [].slice.call(b.querySelectorAll(".grid > .card, .card"));
        if (!cards.length) return;
        var order = {};
        cards.forEach(function (c, i) { order["c" + i] = c; });
        layout.cards[k].forEach(function (ck) { if (order[ck]) cards[0].parentNode.appendChild(order[ck]); });
      }
    });
  }

  function loadLayout() {
    snapshotOrig();
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
      ".pe-box{position:relative;}" +
      ".pe-box:hover{outline:1px dashed rgba(220,38,38,0.7);outline-offset:2px;}" +
      ".pe-box.pe-dragging{opacity:0.4;outline:2px dashed #ff2b2b;}" +
      ".pe-box.pe-drop{outline:2px dashed #ff2b2b;box-shadow:0 0 0 4px rgba(255,43,43,0.3);}" +
      ".pe-bar{position:absolute;top:-12px;right:0;z-index:999999;display:none;gap:2px;background:#16161c;border:1px solid rgba(220,38,38,0.7);border-radius:8px;padding:2px;box-shadow:0 4px 16px rgba(0,0,0,0.6);}" +
      ".pe-box:hover > .pe-bar{display:flex;}" +
      ".pe-bar button{width:24px;height:24px;font-size:0.8rem;line-height:1;color:#ef4444;background:transparent;border:none;cursor:pointer;border-radius:5px;font-family:inherit;}" +
      ".pe-bar button:hover{background:rgba(220,38,38,0.25);}" +
      ".pe-drag{color:#ef4444;cursor:grab;padding:0 6px;font-size:0.95rem;display:flex;align-items:center;user-select:none;}" +
      ".pe-text:focus{outline:2px solid rgba(255,43,43,0.85);background:rgba(220,38,38,0.07);border-radius:4px;cursor:text;}" +
      ".pe-hint{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:999999;background:#16161c;border:1px solid rgba(220,38,38,0.6);color:#f4f4f5;padding:9px 18px;border-radius:10px;font-size:0.85rem;box-shadow:0 8px 24px rgba(0,0,0,0.6);}" +
      ".pe-box[contenteditable],.pe-text{cursor:text;}";
    document.head.appendChild(peStyle);
  }

  function decorate(el) {
    if (el.classList.contains("pe-box")) return;
    el.classList.add("pe-box");

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
        if (d === "up" || d === "left") swapWith(el, -1);
        else swapWith(el, 1);
      });
    });
    el.appendChild(bar);

    var handle = bar.querySelector(".pe-drag");
    handle.addEventListener("mousedown", function () { el.draggable = true; });
    handle.addEventListener("mouseup", function () { el.draggable = false; });
    el.addEventListener("dragstart", function (ev) {
      ev.dataTransfer.setData("text/plain", directText(el) || el.tagName);
      ev.dataTransfer.effectAllowed = "move";
      el.classList.add("pe-dragging");
    });
    el.addEventListener("dragend", function () {
      el.draggable = false;
      el.classList.remove("pe-dragging");
      document.querySelectorAll(".pe-drop").forEach(function (x) { x.classList.remove("pe-drop"); });
    });
    el.addEventListener("dragover", function (ev) {
      if (ev.target !== el && !el.contains(ev.target)) return;
      ev.preventDefault();
      ev.dataTransfer.dropEffect = "move";
      el.classList.add("pe-drop");
    });
    el.addEventListener("dragleave", function () { el.classList.remove("pe-drop"); });
    el.addEventListener("drop", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      el.classList.remove("pe-drop");
      var tgt = el;
      var src = document.querySelector(".pe-dragging");
      if (src && src !== tgt && src.parentNode === tgt.parentNode) {
        tgt.parentNode.insertBefore(src, tgt);
      }
    });

    if (directText(el)) {
      el.contentEditable = "true";
      el.classList.add("pe-text");
    }
  }

  function decorateAll() {
    var walk = function (el) {
      for (var i = 0; i < el.children.length; i++) {
        var c = el.children[i];
        var t = c.tagName;
        if (t === "SCRIPT" || t === "STYLE" || t === "LINK" || t === "META") continue;
        decorate(c);
        walk(c);
      }
    };
    walk(document.body);
  }

  function enableEditor() {
    if (peEditing) return;
    peEditing = true;
    injectStyle();
    decorateAll();
    var hint = document.createElement("div");
    hint.className = "pe-hint";
    hint.id = "pe-hint";
    hint.textContent = "Mode Edit: seret mana-mana elemen (guna ⠿) atau anak panah ↑↓←→. Klik teks untuk ubah terus.";
    document.body.appendChild(hint);
    if (IS_EDIT) addSaveBar();
  }

  function disableEditor() {
    if (!peEditing) return;
    peEditing = false;
    document.querySelectorAll(".pe-box").forEach(function (b) {
      var bar = b.querySelector(".pe-bar");
      if (bar) bar.remove();
      b.classList.remove("pe-box", "pe-dragging", "pe-drop");
      b.contentEditable = "false";
      b.classList.remove("pe-text");
      b.draggable = false;
    });
    var hint = document.getElementById("pe-hint");
    if (hint && hint.parentNode) hint.parentNode.removeChild(hint);
    var bar = document.getElementById("pe-savebar");
    if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
  }

  function addSaveBar() {
    var bar = document.getElementById("pe-savebar");
    if (bar) return;
    bar = document.createElement("div");
    bar.id = "pe-savebar";
    bar.style.cssText =
      "position:fixed;bottom:16px;right:16px;z-index:999999;display:flex;gap:8px;align-items:center;" +
      "background:#16161c;border:1px solid rgba(220,38,38,0.65);border-radius:12px;padding:10px 14px;" +
      "box-shadow:0 10px 30px rgba(0,0,0,0.7);";
    bar.innerHTML =
      '<span style="color:#f4f4f5;font-size:.85rem">Editor Visual</span>' +
      '<button type="button" id="pe-save" style="background:#dc2626;border:none;color:#fff;padding:8px 14px;border-radius:8px;cursor:pointer;font-weight:700">Simpan Susunan</button>' +
      '<button type="button" id="pe-reset" style="background:transparent;border:1px solid rgba(220,38,38,.6);color:#ef4444;padding:8px 14px;border-radius:8px;cursor:pointer">Reset</button>' +
      '<button type="button" id="pe-close" style="background:transparent;border:none;color:#a1a1aa;cursor:pointer;font-size:1.1rem" title="Keluar">&times;</button>';
    document.body.appendChild(bar);

    document.getElementById("pe-save").addEventListener("click", function () {
      var layout = collect();
      var sb = getSb();
      if (!sb) { peMsg("Ralat: tiada sambungan Supabase."); return; }
      sb.auth.getSession().then(function (res) {
        var session = res.data && res.data.session;
        if (!session) { peMsg("Sila log masuk dahulu sebagai admin."); return; }
        if (!(session.user.app_metadata && session.user.app_metadata.is_admin)) {
          peMsg("Akaun ini bukan admin.");
          return;
        }
        var json = JSON.stringify(layout);
        sb.from("site_pages").select("path").eq("path", PATH).maybeSingle().then(function (r) {
          if (!r.error && r.data) {
            return sb.from("site_pages").update({ layout_json: json }).eq("path", PATH);
          }
          return sb.from("site_pages").insert({ path: PATH, layout_json: json });
        }).then(function () {
          peMsg("Susunan laman disimpan!");
        }).catch(function (err) {
          peMsg("Ralat simpan: " + (err && err.message ? err.message : "sila semak SQL column layout_json"));
        });
      });
    });

    document.getElementById("pe-reset").addEventListener("click", function () {
      if (!confirm("Padam semua susunan tersuai untuk halaman ini?")) return;
      var sb = getSb();
      sb.from("site_pages").update({ layout_json: null }).eq("path", PATH).then(function () {
        window.location.reload();
      });
    });

    document.getElementById("pe-close").addEventListener("click", function () {
      window.location.href = window.location.pathname;
    });
  }

  function peMsg(msg) {
    var m = document.getElementById("pe-msg");
    if (!m) {
      m = document.createElement("div");
      m.id = "pe-msg";
      m.style.cssText =
        "position:fixed;bottom:74px;right:16px;z-index:999999;background:#16161c;border:1px solid rgba(220,38,38,.6);" +
        "color:#f4f4f5;padding:10px 16px;border-radius:10px;font-size:.85rem;box-shadow:0 8px 24px rgba(0,0,0,.6);max-width:320px;";
      document.body.appendChild(m);
    }
    m.textContent = msg;
    m.style.display = "block";
    clearTimeout(m._t);
    m._t = setTimeout(function () { m.style.display = "none"; }, 4000);
  }

  function scheduleReapply() {
    if (IS_EDIT) return;
    [1500, 3000].forEach(function (ms) {
      setTimeout(function () {
        if (document.hidden) return;
        snapshotOrig();
        var sb = getSb();
        if (!sb) return;
        sb.from("site_pages").select("layout_json").eq("path", PATH).maybeSingle().then(function (res) {
          if (res.error || !res.data || !res.data.layout_json) return;
          try { apply(JSON.parse(res.data.layout_json)); } catch (e) {}
        }).catch(function () {});
      }, ms);
    });
  }

  document.addEventListener("pe:edit-on", enableEditor);
  document.addEventListener("pe:edit-off", disableEditor);
  window.__pageEditor = { collect: collect, enable: enableEditor, disable: disableEditor };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      loadLayout();
      scheduleReapply();
      if (IS_EDIT) setTimeout(enableEditor, 400);
    });
  } else {
    loadLayout();
    scheduleReapply();
    if (IS_EDIT) setTimeout(enableEditor, 400);
  }
})();