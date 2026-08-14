(function () {
  var url = window.SUPABASE_URL;
  var key = window.SUPABASE_ANON_KEY;
  var configured = !!(url && key);

  function makeClient() {
    if (!configured) return null;
    return window.supabase.createClient(url, key);
  }

  var supabase = makeClient();

  function getUserName(u) {
    var n = u && u.user_metadata && u.user_metadata.full_name;
    return n ? n : (u && u.email) || "Pengguna";
  }

  function badge(status) {
    var map = { pending: "Menunggu", in_progress: "Dalam Proses", done: "Selesai", confirmed: "Disahkan", cancelled: "Dibatalkan" };
    return map[status] || status;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function sanitize(s, maxLen) {
    var out = String(s == null ? "" : s);
    out = out.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
    if (maxLen && out.length > maxLen) out = out.slice(0, maxLen);
    return out.trim();
  }

  function isValidEmail(e) {
    return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(e);
  }

  function safeUrl(u) {
    var s = String(u == null ? "" : u).trim();
    if (!s) return "";
    return /^https?:\/\//i.test(s) || /^data:image\/(png|jpe?g|gif|webp);/i.test(s) ? s : "";
  }

  window.portal = {
    configured: configured,
    supabase: supabase,
    getUserName: getUserName,
    badge: badge,
    esc: esc,
    sanitize: sanitize,
    isValidEmail: isValidEmail,
    safeUrl: safeUrl
  };

  async function requireAuth() {
    if (!supabase) {
      window.location.href = "login.html?noconfig=1";
      return null;
    }
    var s = await supabase.auth.getSession();
    if (!s.data.session) {
      window.location.href = "login.html";
      return null;
    }
    return s.data.session;
  }
  window.portal.requireAuth = requireAuth;

  var signOutBtn = document.getElementById("signout-btn");
  if (signOutBtn) {
    signOutBtn.addEventListener("click", async function () {
      if (supabase) await supabase.auth.signOut();
      window.location.href = "login.html";
    });
  }

  var adminLink = document.getElementById("admin-link");
  if (adminLink && supabase) {
    supabase.auth.getSession().then(function (s) {
      var u = s.data.session && s.data.session.user;
      if (u && u.app_metadata && u.app_metadata.is_admin) {
        adminLink.hidden = false;
      }
    });
  }

  setTimeout(function () {
    if (document.getElementById("cat-grid") || document.getElementById("tx-list")) return;
    var boxes = document.querySelectorAll("#recent-list, #requests-list, #bookings-list, #enrolled-list, #courses-grid");
    boxes.forEach(function (el) {
      var t = (el.textContent || "").trim();
      if (t.indexOf("Memuatkan") > -1) el.innerHTML = '<p class="muted">Tiada data.</p>';
    });
  }, 6000);
})();
