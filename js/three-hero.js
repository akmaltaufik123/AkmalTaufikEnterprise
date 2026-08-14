(function () {
  var canvas = document.getElementById("hero-3d");
  if (!canvas || !window.THREE) return;

  var isMobile = window.innerWidth < 768;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var renderer = null, scene = null, camera = null, clock = null, rafId = 0, running = false;
  var holo = null, brandMesh = null, particles = null, pLines = null, rings = [];
  var mouse = { x: 0, y: 0 };
  var cam = { x: 0, y: 0, z: 330 };

  function makeBrandTexture(text) {
    var c = document.createElement("canvas");
    c.width = 1024;
    c.height = 140;
    var g = c.getContext("2d");
    var grad = g.createLinearGradient(0, 0, 1024, 0);
    grad.addColorStop(0, "#ff4d4d");
    grad.addColorStop(0.5, "#dc2626");
    grad.addColorStop(1, "#ff6b6b");
    g.font = "900 78px Orbitron, 'Arial Black', sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.shadowColor = "rgba(220,38,38,0.9)";
    g.shadowBlur = 30;
    g.fillStyle = grad;
    g.fillText(text, 512, 72);
    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  function buildParticles(count) {
    var pos = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      var r = 190 + Math.random() * 60;
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    var mat = new THREE.PointsMaterial({
      color: 0xff3b3b,
      size: 2.4,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    var pts = new THREE.Points(geo, mat);

    var pairs = [];
    for (var a = 0; a < count; a++) {
      for (var b = a + 1; b < count; b++) {
        var dx = pos[a * 3] - pos[b * 3];
        var dy = pos[a * 3 + 1] - pos[b * 3 + 1];
        var dz = pos[a * 3 + 2] - pos[b * 3 + 2];
        if (dx * dx + dy * dy + dz * dz < 700) pairs.push(a, b);
      }
    }
    var lpos = new Float32Array(pairs.length * 3);
    for (var j = 0; j < pairs.length; j += 2) {
      var s = pairs[j], e = pairs[j + 1];
      lpos[j * 3] = pos[s * 3];
      lpos[j * 3 + 1] = pos[s * 3 + 1];
      lpos[j * 3 + 2] = pos[s * 3 + 2];
      lpos[j * 3 + 3] = pos[e * 3];
      lpos[j * 3 + 4] = pos[e * 3 + 1];
      lpos[j * 3 + 5] = pos[e * 3 + 2];
    }
    var lgeo = new THREE.BufferGeometry();
    lgeo.setAttribute("position", new THREE.BufferAttribute(lpos, 3));
    var lmat = new THREE.LineBasicMaterial({
      color: 0xff2b2b,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    pLines = new THREE.LineSegments(lgeo, lmat);

    var shell = new THREE.Group();
    shell.add(pts);
    shell.add(pLines);
    return shell;
  }

  function init() {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, 1, 1, 2000);
    clock = new THREE.Clock();

    var edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(88, 88, 88));
    var cube = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xff2b2b, transparent: true, opacity: 0.95 }));
    var inner = new THREE.EdgesGeometry(new THREE.BoxGeometry(60, 60, 60));
    var cubeInner = new THREE.LineSegments(inner, new THREE.LineBasicMaterial({ color: 0xdc2626, transparent: true, opacity: 0.4 }));
    holo = new THREE.Group();
    holo.add(cube);
    holo.add(cubeInner);
    holo.position.y = 35;
    scene.add(holo);

    var defs = [
      { r: 152, t: 2.4, color: 0xff4444, op: 0.5, rx: 1.25, rz: 0.35, speed: 0.18 },
      { r: 196, t: 1.4, color: 0xdc2626, op: 0.28, rx: 0.65, rz: 0.85, speed: -0.13 },
      { r: 116, t: 2, color: 0xff6b6b, op: 0.55, rx: 0.95, rz: 1.25, speed: 0.24 }
    ];
    for (var i = 0; i < defs.length; i++) {
      var d = defs[i];
      var ring = new THREE.Mesh(
        new THREE.TorusGeometry(d.r, d.t, 12, 64),
        new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: d.op, wireframe: true })
      );
      ring.rotation.x = d.rx;
      ring.rotation.z = d.rz;
      ring.userData = d;
      rings.push(ring);
      scene.add(ring);
    }

    var tex = makeBrandTexture("Akmal Taufik Enterprise");
    brandMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(480, 66),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
    );
    brandMesh.position.y = -165;
    scene.add(brandMesh);

    particles = buildParticles(isMobile ? 340 : 620);
    scene.add(particles);

    resize();
    renderOne();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouse);
    if (reduceMotion) return;
    start();
  }

  function resize() {
    var w = canvas.clientWidth || window.innerWidth;
    var h = canvas.clientHeight || 500;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    var short = Math.min(w, h);
    cam.z = short < 500 ? 300 : (short < 760 ? 330 : 360);
    camera.position.z = cam.z;
    camera.updateProjectionMatrix();
  }

  function onMouse(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
  }

  function animate() {
    if (!running) return;
    rafId = requestAnimationFrame(animate);
    var t = clock.getElapsedTime();
    holo.rotation.x = t * 0.25;
    holo.rotation.y = t * 0.42;
    for (var i = 0; i < rings.length; i++) {
      rings[i].rotation.y = t * rings[i].userData.speed;
    }
    brandMesh.position.y = -165 + Math.sin(t * 1.1) * 9;
    brandMesh.rotation.y = Math.sin(t * 0.35) * 0.07;
    particles.rotation.y = t * 0.05;
    particles.rotation.x = t * 0.028;
    cam.x += (mouse.x * 42 - cam.x) * 0.04;
    cam.y += (mouse.y * 30 - cam.y) * 0.04;
    camera.position.x = cam.x;
    camera.position.y = cam.y;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  function renderOne() {
    holo.rotation.x = 0.6;
    holo.rotation.y = 0.8;
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
