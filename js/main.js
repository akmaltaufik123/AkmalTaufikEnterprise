(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var canvas = document.getElementById("bg-canvas");
  if (canvas && !reduce) {
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, spacing = 34, amp = 16, colCount = 1, dots = [];
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var mouse = { x: -9999, y: -9999 };
    var rafId = null;

    function build() {
      dots = [];
      spacing = W < 768 ? 44 : 34;
      amp = W < 768 ? 10 : 16;
      colCount = Math.ceil(W / spacing) + 1;
      for (var y = spacing; y < H + spacing; y += spacing) {
        for (var x = spacing; x < W + spacing; x += spacing) {
          dots.push({ x: x, y: y, ox: x, oy: y, r: 1.4 + ((x + y) % 17) / 10 });
        }
      }
    }

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      build();
    }

    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      var speed = t * 0.0016;
      var i, d;
      for (i = 0; i < dots.length; i++) {
        d = dots[i];
        var wave = Math.sin(d.ox * 0.006 + speed) * amp + Math.sin(d.oy * 0.009 - speed * 1.3) * amp * 0.4;
        d.y = d.oy + wave;
        var dx = d.x - mouse.x, dy = d.y - mouse.y, dist2 = dx * dx + dy * dy;
        if (dist2 < 12000 && dist2 > 0) {
          var f = (1 - dist2 / 12000) * 18;
          d.x += (dx / Math.sqrt(dist2)) * f;
          d.y += (dy / Math.sqrt(dist2)) * f;
        }
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(239,68,68,0.5)";
        ctx.shadowColor = "rgba(220,38,38,0.9)";
        ctx.shadowBlur = 7;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(220,38,38,0.09)";
      ctx.beginPath();
      for (i = 0; i < dots.length; i++) {
        d = dots[i];
        if ((i + 1) % colCount !== 0 && i + 1 < dots.length) {
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(dots[i + 1].x, dots[i + 1].y);
        }
        if (i + colCount < dots.length) {
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(dots[i + colCount].x, dots[i + colCount].y);
        }
      }
      ctx.stroke();
      rafId = requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", function (e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });
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
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el, idx) {
      el.style.transitionDelay = (idx % 3) * 90 + "ms";
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("visible");
    });
  }
})();
