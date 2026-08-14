(function () {
  var SLOTS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function to12(t) {
    var h = parseInt(t.slice(0, 2), 10);
    var ap = h >= 12 ? "PM" : "AM";
    var hh = h % 12 || 12;
    return hh + t.slice(2) + " " + ap;
  }

  function init(form, opts) {
    var fmt = "12";
    var h24 = 9;
    var mi = 0;
    var taken = new Set();

    var dateInput = form.querySelector("[data-role=date]");
    var hourSel = form.querySelector("[data-role=hour]");
    var minuteSel = form.querySelector("[data-role=minute]");
    var apSel = form.querySelector("[data-role=ap]");
    var fmtRow = form.querySelector(".time-format");
    var slotsBox = form.querySelector(".time-slots");
    var imgInput = form.querySelector("[data-role=image]");
    var vidInput = form.querySelector("[data-role=video]");
    var msg = form.querySelector("[data-role=booking-msg]");
    var errorBox = form.querySelector(".form-error");
    var submitBtn = form.querySelector("[type=submit]");

    function isEn() {
      return (document.documentElement.lang || "ms").toLowerCase().indexOf("en") === 0;
    }
    function t(ms, en) {
      return isEn() ? en : ms;
    }
    function showError(m) {
      errorBox.textContent = m;
      errorBox.style.display = "block";
    }
    function hideError() {
      errorBox.style.display = "none";
    }

    dateInput.min = new Date().toISOString().slice(0, 10);

    function loadTaken() {
      var d = dateInput.value;
      if (!d) {
        slotsBox.querySelectorAll(".time-slot").forEach(function (b) { b.classList.remove("taken"); });
        return;
      }
      sb.from("bookings")
        .select("booking_time, status")
        .eq("booking_date", d)
        .not("status", "eq", "cancelled")
        .then(function (res) {
          taken = new Set((res.data || []).map(function (b) { return b.booking_time; }));
          renderSlots();
        });
    }

    function renderSelects() {
      apSel.innerHTML = '<option value="AM">AM</option><option value="PM">PM</option>';
      apSel.style.display = fmt === "12" ? "" : "none";
      var hours = [];
      if (fmt === "12") {
        for (var i = 1; i <= 12; i++) hours.push(i);
      } else {
        for (var i = 0; i <= 23; i++) hours.push(i);
      }
      hourSel.innerHTML = hours.map(function (h) {
        var val = fmt === "12" ? h : pad(h);
        var sel = fmt === "12" ? (h24 % 12 || 12) === h : h24 === h;
        return '<option value="' + val + '"' + (sel ? " selected" : "") + ">" + val + "</option>";
      }).join("");
      var mins = [];
      for (var i = 0; i <= 59; i++) mins.push(pad(i));
      minuteSel.innerHTML = mins.map(function (m) {
        return '<option value="' + m + '"' + (mi === parseInt(m, 10) ? " selected" : "") + ">" + m + "</option>";
      }).join("");
      apSel.value = h24 >= 12 ? "PM" : "AM";
    }

    function renderSlots() {
      var list = SLOTS.slice();
      if (fmt === "12") {
        list = list.filter(function (s) {
          var h = parseInt(s.slice(0, 2), 10);
          return h >= 9 && h <= 17;
        });
      }
      slotsBox.innerHTML = "";
      list.forEach(function (s) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "time-slot";
        btn.textContent = fmt === "12" ? to12(s) : s;
        if (taken.has(s)) btn.classList.add("taken");
        btn.addEventListener("click", function () {
          if (btn.classList.contains("taken")) return;
          h24 = parseInt(s.slice(0, 2), 10);
          mi = parseInt(s.slice(3, 5), 10);
          renderSelects();
          hideError();
        });
        slotsBox.appendChild(btn);
      });
    }

    function syncFromHour() {
      var v = parseInt(hourSel.value, 10);
      if (fmt === "12") {
        var h12 = v === 12 ? 12 : v % 12;
        h24 = apSel.value === "PM" ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12);
      } else {
        h24 = v;
      }
    }

    hourSel.addEventListener("change", function () {
      syncFromHour();
      hideError();
    });

    minuteSel.addEventListener("change", function () {
      mi = parseInt(minuteSel.value, 10);
      hideError();
    });

    apSel.addEventListener("change", function () {
      syncFromHour();
      hideError();
    });

    if (fmtRow) {
      fmtRow.querySelectorAll(".time-fmt").forEach(function (b) {
        b.addEventListener("click", function () {
          fmt = b.getAttribute("data-fmt");
          fmtRow.querySelectorAll(".time-fmt").forEach(function (x) { x.classList.remove("active"); });
          b.classList.add("active");
          renderSelects();
          renderSlots();
        });
      });
    }

    dateInput.addEventListener("change", loadTaken);

    async function uploadFile(file, kind) {
      var type = (file.type || "").toLowerCase();
      var ext = (file.name.split(".").pop() || "").toLowerCase();
      var allowImg = ["image/gif", "image/png", "image/jpeg", "image/webp"];
      var allowVid = ["video/mp4", "video/webm", "video/quicktime"];
      var allow = kind === "image" ? allowImg : allowVid;
      var extMap = { image: ["gif", "png", "jpg", "jpeg", "webp"], video: ["mp4", "webm", "mov"] };
      if (allow.indexOf(type) === -1 && extMap[kind].indexOf(ext) === -1) {
        showError(t("Jenis fail tidak dibenarkan (" + (kind === "image" ? "gambar" : "video") + " sahaja).",
                    "File type not allowed (" + (kind === "image" ? "image" : "video") + " only)."));
        return null;
      }
      var safeExt = extMap[kind].indexOf(ext) > -1 ? ext : (kind === "image" ? "png" : "mp4");
      var path = "booking-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + safeExt;
      var { error } = await sb.storage.from("booking-files").upload(path, file, { upsert: false });
      if (error) {
        showError(t("Gagal muat naik " + (kind === "image" ? "gambar" : "video") + ": ", "Failed to upload " + (kind === "image" ? "image" : "video") + ": ") + error.message);
        return null;
      }
      var { data } = sb.storage.from("booking-files").getPublicUrl(path);
      return data.publicUrl;
    }

    var lastSubmit = 0;
    var hp = form.querySelector("[data-role=hp]");

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      hideError();
      if (hp && hp.value) {
        msg.style.display = "block";
        form.reset();
        return;
      }
      if (Date.now() - lastSubmit < 2500) {
        showError(t("Sila tunggu sebentar sebelum menghantar semula.", "Please wait a moment before submitting again."));
        return;
      }
      var service = form.querySelector("[data-role=service]").value;
      var date = dateInput.value;
      syncFromHour();
      var time24 = pad(h24) + ":" + pad(mi);
      var name = form.querySelector("[data-role=name]").value.trim();
      var phone = form.querySelector("[data-role=phone]").value.trim();
      var email = form.querySelector("[data-role=email]").value.trim();
      var location = form.querySelector("[data-role=location]").value.trim();
      var notes = form.querySelector("[data-role=notes]").value.trim();

      if (!service || !date) {
        showError(t("Sila pilih perkhidmatan dan tarikh.", "Please pick a service and a date."));
        return;
      }
      if (!name || !phone || !email) {
        showError(t("Sila isi nama penuh, telefon dan e-mel.", "Please fill in full name, phone and email."));
        return;
      }
      if (name.length < 2 || name.length > 100 || !/^[A-Za-zÀ-ÖØ-öø-ÿ' .-]+$/.test(name)) {
        showError(t("Nama tidak sah (2-100 aksara, huruf sahaja).", "Invalid name (2-100 characters, letters only)."));
        return;
      }
      if (!/^(\+?6?0)?1[0-9]{8,9}$/.test(phone)) {
        showError(t("Nombor telefon tidak sah. Sila gunakan nombor Malaysia (cth: 0189451570 atau +60189451570).", "Invalid phone number. Please use a Malaysian number (e.g. 0189451570 or +60189451570)."));
        return;
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        showError(t("E-mel tidak sah.", "Invalid email."));
        return;
      }
      if (!location) {
        showError(t("Sila nyatakan lokasi servis.", "Please provide the service location."));
        return;
      }
      if (taken.has(time24)) {
        showError(t("Masa itu telah diambil. Sila pilih masa lain.", "That time is already taken. Please choose another time."));
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = t("Menghantar...", "Sending...");
      var imageUrl = null;
      var videoUrl = null;
      if (imgInput && imgInput.files && imgInput.files[0]) imageUrl = await uploadFile(imgInput.files[0], "image");
      if (vidInput && vidInput.files && vidInput.files[0]) videoUrl = await uploadFile(vidInput.files[0], "video");
      if (imgInput && imgInput.files && imgInput.files[0] && !imageUrl) {
        submitBtn.disabled = false;
        submitBtn.textContent = t("Tempah Sekarang", "Book Now");
        return;
      }
      if (vidInput && vidInput.files && vidInput.files[0] && !videoUrl) {
        submitBtn.disabled = false;
        submitBtn.textContent = t("Tempah Sekarang", "Book Now");
        return;
      }
      var payload = {
        service: service,
        booking_date: date,
        booking_time: time24,
        location: location,
        notes: notes || null,
        customer_name: name,
        phone: phone,
        email: email,
        image_url: imageUrl,
        video_url: videoUrl,
        user_id: opts && opts.session ? opts.session.user.id : null
      };
      var { error } = await sb.from("bookings").insert(payload);
      submitBtn.disabled = false;
      submitBtn.textContent = t("Tempah Sekarang", "Book Now");
      if (error) {
        showError(t("Ralat: ", "Error: ") + error.message);
        return;
      }
      lastSubmit = Date.now();
      msg.style.display = "block";
      form.querySelectorAll("input, select, textarea").forEach(function (el) { el.value = ""; });
      if (imgInput) imgInput.value = "";
      if (vidInput) vidInput.value = "";
      h24 = 9;
      mi = 0;
      renderSelects();
      if (slotsBox) renderSlots();
    });

    renderSelects();
    renderSlots();
    loadTaken();
  }

  window.bookingForm = { init: init };
})();