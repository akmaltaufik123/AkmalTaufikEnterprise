(function () {
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
