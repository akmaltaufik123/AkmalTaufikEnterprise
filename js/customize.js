(function () {
  function getSb() {
    try {
      if (!window.supabase) return null;
      if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return null;
      return window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    } catch (e) {
      return null;
    }
  }

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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
})();