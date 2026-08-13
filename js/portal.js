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
    var map = { pending: "Menunggu", in_progress: "Dalam Proses", done: "Selesai" };
    return map[status] || status;
  }

  window.portal = {
    configured: configured,
    supabase: supabase,
    getUserName: getUserName,
    badge: badge
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
})();
