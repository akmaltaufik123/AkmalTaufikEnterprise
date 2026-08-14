(function () {
  var canvas = document.getElementById("rack-3d");
  if (!canvas || !window.THREE) return;

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var renderer = null, scene = null, camera = null, clock = null, rafId = 0, running = false;
  var rack = null;

  function buildRack() {
    var g = new THREE.Group();

    var bodyMat = new THREE.MeshPhongMaterial({ color: 0x1a1a22, specular: 0x333344, shininess: 60 });
    var body = new THREE.Mesh(new THREE.BoxGeometry(120, 210, 76), bodyMat);
    g.add(body);

    var edgeMat = new THREE.LineBasicMaterial({ color: 0xff2b2b, transparent: true, opacity: 0.85 });
    var edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(120, 210, 76)), edgeMat);
    g.add(edge);

    var rows = 9;
    for (var i = 0; i < rows; i++) {
      var y = -88 + i * 19;
      var slotMat = new THREE.MeshBasicMaterial({
        color: 0xff2b2b,
        transparent: true,
        opacity: 0.25 + Math.random() * 0.65
      });
      var slot = new THREE.Mesh(new THREE.BoxGeometry(102, 10, 4), slotMat);
      slot.position.set(0, y, 39.5);
      g.add(slot);
    }

    var ventMat = new THREE.MeshBasicMaterial({ color: 0x2a2a33, transparent: true, opacity: 0.7 });
    for (var v = 0; v < 4; v++) {
      var vent = new THREE.Mesh(new THREE.BoxGeometry(70, 3, 6), ventMat);
      vent.position.set(0, -96 + v * 8, -39.5);
      g.add(vent);
    }

    var ledMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
    for (var l = 0; l < 3; l++) {
      var led = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 2.5), ledMat);
      led.position.set(-52 + l * 12, -88, 40.5);
      g.add(led);
    }

    g.rotation.x = 0.35;
    return g;
  }

  function init() {
    var wrap = canvas.parentNode;
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.shadowMap.enabled = false;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, 1, 1, 1500);
    camera.position.set(0, 30, 320);

    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    var key = new THREE.DirectionalLight(0xffaaaa, 0.9);
    key.position.set(180, 220, 240);
    scene.add(key);
    var rim = new THREE.PointLight(0xff2b2b, 1.4, 600);
    rim.position.set(-140, -80, 140);
    scene.add(rim);
    var rim2 = new THREE.PointLight(0xff5555, 0.7, 600);
    rim2.position.set(150, 120, -120);
    scene.add(rim2);

    rack = buildRack();
    scene.add(rack);

    clock = new THREE.Clock();
    resize();
    renderer.render(scene, camera);

    window.addEventListener("resize", resize);
    if (reduceMotion) return;
    start();
  }

  function resize() {
    var wrap = canvas.parentNode;
    var w = wrap ? wrap.clientWidth : window.innerWidth;
    var h = canvas.clientHeight || 400;
    if (w < 60) w = window.innerWidth;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w < 480 ? 300 : 320;
    camera.updateProjectionMatrix();
  }

  function animate() {
    if (!running) return;
    rafId = requestAnimationFrame(animate);
    var t = clock.getElapsedTime();
    rack.rotation.y = t * 0.5;
    rack.children.forEach(function (child, i) {
      if (child.geometry && child.geometry.type === "BoxGeometry" && i > 2) {
        child.material.opacity = Math.min(1, child.material.opacity + (Math.random() - 0.5) * 0.06);
        if (child.material.opacity < 0.15) child.material.opacity = 0.15;
      }
    });
    renderer.render(scene, camera);
  }

  function start() {
    if (running) return;
    running = true;
    animate();
  }

  function stop() {
    running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }

  function setupVisibility() {
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) start(); else stop();
        });
      }, { threshold: 0.05 });
      io.observe(canvas);
    } else {
      start();
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else start();
    });
  }

  try {
    init();
    setupVisibility();
  } catch (err) {
    canvas.style.display = "none";
  }
})();
