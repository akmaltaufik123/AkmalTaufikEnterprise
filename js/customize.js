(function () {
  var sharedSb = null;

  function getSb() {
    if (sharedSb) return sharedSb;
    if (window.portal && window.portal.supabase) {
      sharedSb = window.portal.supabase;
      window.sb = sharedSb;
      return sharedSb;
    }
    try {
      if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return null;
      sharedSb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true }
      });
      window.sb = sharedSb;
    } catch (e) {
      return null;
    }
    return sharedSb;
  }
  getSb();

  function safeFont(f) {
    if (!f) return null;
    var allowed = ["Orbitron", "Chakra Petch", "Arial", "Verdana", "Georgia", "Courier New", "Impact"];
    return allowed.indexOf(f) > -1 ? f : null;
  }

  function apply() {
    var sb = getSb();
    if (!sb) return;
    var path = window.location.pathname.split("/").pop();
    if (!path) path = "index.html";
    Promise.all([
      sb.from("site_theme").select("*").limit(1),
      sb.from("site_pages").select("*").eq("path", path)
    ]).then(function (res) {
      var theme = res[0].data && res[0].data[0];
      if (theme) {
        var root = document.documentElement;
        if (theme.accent) {
          root.style.setProperty("--primary", theme.accent);
          root.style.setProperty("--accent", theme.accent);
        }
        if (theme.bg) root.style.setProperty("--bg", theme.bg);
        var fontCss = "";
        var h = safeFont(theme.font_heading);
        var b = safeFont(theme.font_body);
        if (h) fontCss += "h1,h2,h3,.brand,.logo-text,.lang-btn,.btn{font-family:" + h + " !important;}";
        if (b) fontCss += "body,input,select,textarea,button,p,td,th,label{font-family:" + b + " !important;}";
        if (fontCss) {
          var st = document.createElement("style");
          st.id = "theme-fonts";
          st.textContent = fontCss;
          document.head.appendChild(st);
        }
        if (theme.logo_url) {
          document.querySelectorAll(".logo-img").forEach(function (im) {
            im.src = theme.logo_url;
          });
        }
      }
      var page = res[1].data && res[1].data[0];
      if (page) {
        if (page.title) document.title = page.title;
        if (page.meta_desc) {
          var m = document.querySelector('meta[name="description"]');
          if (!m) {
            m = document.createElement("meta");
            m.name = "description";
            document.head.appendChild(m);
          }
          m.content = page.meta_desc;
        }
        if (page.custom_css) {
          var cs = document.createElement("style");
          cs.id = "page-custom-css";
          cs.textContent = page.custom_css;
          document.head.appendChild(cs);
        }
        if (page.custom_js) {
          try {
            new Function(page.custom_js)();
          } catch (e) {
            if (window.console) console.error("Custom JS error:", e);
          }
        }
      }
    }).catch(function () {});
  }

  function applyLayout() {
    var sb = getSb();
    if (!sb) return;
    var path = window.location.pathname.split("/").pop();
    if (!path) path = "index.html";
    sb.from("site_pages").select("layout_json").eq("path", path).maybeSingle()
      .then(function (res) {
        var page = res.data;
        if (page && page.layout_json) {
          try {
            var layout = JSON.parse(page.layout_json);
            if (layout.version === 3 && layout.boxes) {
              applyBoxes(layout.boxes);
            }
          } catch (e) {
            if (window.console) console.error("Layout apply error:", e);
          }
        }
      }).catch(function () {});
  }

  function applyBoxes(boxes) {
    var byZone = { services: document.getElementById("services-grid"), why: document.getElementById("why-steps") };
    var seen = {};
    boxes.forEach(function (b) {
      var zone = b.zone || "services";
      var container = byZone[zone];
      if (!container) return;
      var existing = container.querySelector('[data-box="' + b.id + '"]');
      if (existing) {
        if (b.title) {
          var h = existing.querySelector("h3");
          h.textContent = b.title;
          h.removeAttribute("data-i18n");
        }
        if (b.desc) {
          var pd = existing.querySelector("p");
          pd.textContent = b.desc;
          pd.removeAttribute("data-i18n");
        }
        if (b.image_url) {
          var img = existing.querySelector("img.box-img");
          if (!img) {
            img = document.createElement("img");
            img.className = "box-img";
            img.style.cssText = "width:100%;height:160px;object-fit:cover;border-radius:8px 8px 0 0;margin-bottom:12px;";
            existing.insertBefore(img, existing.firstChild);
          }
          img.src = b.image_url;
        }
        seen[b.id] = true;
      } else if (!seen[b.id]) {
        var template = container.querySelector(".card, .step");
        if (template) {
          var clone = template.cloneNode(true);
          clone.dataset.box = b.id;
          var ch = clone.querySelector("h3");
          var cp = clone.querySelector("p");
          if (ch) ch.removeAttribute("data-i18n");
          if (cp) cp.removeAttribute("data-i18n");
          if (b.title) ch.textContent = b.title;
          if (b.desc) cp.textContent = b.desc;
          if (b.image_url) {
            var img = document.createElement("img");
            img.className = "box-img";
            img.style.cssText = "width:100%;height:160px;object-fit:cover;border-radius:8px 8px 0 0;margin-bottom:12px;";
            img.src = b.image_url;
            clone.insertBefore(img, clone.firstChild);
          }
          container.appendChild(clone);
          seen[b.id] = true;
        }
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyLayout);
  } else {
    applyLayout();
  }
})();