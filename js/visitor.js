(function () {
  function detectDevice() {
    var ua = navigator.userAgent || "";
    var uaData = navigator.userAgentData;
    var isMobile = /Android|iPhone|iPod|Mobile|Opera Mini/i.test(ua);
    var isTablet = /iPad|Tablet/i.test(ua) || (uaData && uaData.mobile === false && /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    var type = isTablet ? "Tablet" : isMobile ? "Phone" : "Laptop/Desktop";
    var os = "Unknown OS";
    if (/Windows/i.test(ua)) os = "Windows";
    else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
    else if (/Android/i.test(ua)) os = "Android";
    else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
    else if (/Linux/i.test(ua)) os = "Linux";
    var browser = "Browser";
    if (/Edg\//i.test(ua)) browser = "Edge";
    else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
    else if (/Chrome\//i.test(ua)) browser = "Chrome";
    else if (/Firefox\//i.test(ua)) browser = "Firefox";
    else if (/Safari\//i.test(ua)) browser = "Safari";
    return { type: type, os: os, browser: browser };
  }

  function render(el, info) {
    if (!el) return;
    var parts = [];
    if (info.flag) parts.push('<span class="vi-item"><span class="vi-flag">' + info.flag + '</span> ' + info.country + '</span>');
    if (info.city) parts.push('<span class="vi-item">' + info.city + '</span>');
    parts.push('<span class="vi-item">' + info.device + "</span>");
    if (info.browser) parts.push('<span class="vi-item">' + info.browser + "</span>");
    if (info.os) parts.push('<span class="vi-item">' + info.os + "</span>");
    el.innerHTML = parts.join('<span class="vi-dot"></span>');
    el.hidden = false;
  }

  function apply() {
    var el = document.getElementById("visitor-info");
    if (!el) return;
    var dev = detectDevice();
    var info = { device: dev.type, os: dev.os, browser: dev.browser };
    render(el, info);
    var done = false;
    var timeout = setTimeout(function () { if (!done) { done = true; } }, 8000);
    function finish(data) {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      if (data) {
        info.flag = data.flag;
        info.country = data.country;
        info.city = data.city;
        render(el, info);
      }
    }
    try {
      fetch("https://ipwho.is/?fields=country,country_flag,city", { mode: "cors" })
        .then(function (r) { return r.json(); })
        .then(function (d) { finish(d && d.success ? { flag: d.country_flag, country: d.country, city: d.city } : null); })
        .catch(function () { finish(null); });
    } catch (e) {
      finish(null);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
})();