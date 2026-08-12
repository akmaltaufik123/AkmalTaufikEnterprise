(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var canvas = document.getElementById("bg-canvas");
  if (canvas && !reduce) {
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, fontSize = 15, cols = 0, drops = [];
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var chars = "01";
    var rafId = null;

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      fontSize = W < 768 ? 18 : 15;
      cols = Math.floor(W / fontSize);
      drops = [];
      for (var i = 0; i < cols; i++) {
        drops[i] = Math.floor(Math.random() * -150);
      }
      ctx.fillStyle = "#07070a";
      ctx.fillRect(0, 0, W, H);
    }

    function draw() {
      ctx.fillStyle = "rgba(7, 7, 10, 0.16)";
      ctx.fillRect(0, 0, W, H);
      ctx.font = fontSize + "px monospace";
      for (var i = 0; i < cols; i++) {
        var x = i * fontSize;
        var y = drops[i] * fontSize;
        var ch = chars[Math.floor(Math.random() * chars.length)];
        var ch2 = chars[Math.floor(Math.random() * chars.length)];
        var ch3 = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillStyle = "rgba(220, 38, 38, 0.35)";
        ctx.fillText(ch3, x, y - fontSize * 2);
        ctx.fillStyle = "rgba(220, 38, 38, 0.6)";
        ctx.fillText(ch2, x, y - fontSize);
        ctx.fillStyle = "rgba(248, 113, 113, 0.95)";
        ctx.fillText(ch, x, y);
        if (y > H && Math.random() > 0.972) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      rafId = requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
      } else {
        rafId = requestAnimationFrame(draw);
      }
    });
    resize();
    rafId = requestAnimationFrame(draw);
  }

  var ham = document.getElementById("hamburger");
  var links = document.querySelector(".nav-links");
  if (ham && links) {
    ham.addEventListener("click", function () {
      links.classList.toggle("open");
      ham.classList.toggle("open");
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        links.classList.remove("open");
        ham.classList.remove("open");
      }
    });
  }

  var revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("visible");
          en.target.classList.remove("reveal-pending");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el, idx) {
      el.classList.add("reveal-pending");
      el.style.transitionDelay = (idx % 3) * 90 + "ms";
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("visible");
    });
  }
})();
