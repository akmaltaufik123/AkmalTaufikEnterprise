(function () {
  var SLOTS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

  function to12(t) {
    var h = parseInt(t.slice(0, 2), 10);
    var ap = h >= 12 ? "PM" : "AM";
    var hh = h % 12 || 12;
    return hh + t.slice(2) + " " + ap;
  }

  function parseTime(v) {
    var s = v.trim().toUpperCase();
    var m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
    if (!m) return null;
    var h = parseInt(m[1], 10);
    var mi = parseInt(m[2], 10);
    if (mi > 59) return null;
    var ap = m[3];
    if (ap) {
      if (h < 1 || h > 12) return null;
      if (ap === "PM" && h !== 12) h += 12;
      if (ap === "AM" && h === 12) h = 0;
    } else {
      if (h > 23) return null;
    }
    return String(h).padStart(2, "0") + ":" + String(mi).padStart(2, "0");
  }

  function init(form, opts) {
    var fmt = "12";
    var taken = new Set();

    var dateInput = form.querySelector("[data-role=date]");
    var timeInput = form.querySelector("[data-role=time-custom]");
    var fmtRow = form.querySelector(".time-format");
    var slotsBox = form.querySelector(".time-slots");
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
          timeInput.value = fmt === "12" ? to12(s) : s;
          hideError();
        });
        slotsBox.appendChild(btn);
      });
    }

    if (fmtRow) {
      fmtRow.querySelectorAll(".time-fmt").forEach(function (b) {
        b.addEventListener("click", function () {
          fmt = b.getAttribute("data-fmt");
          fmtRow.querySelectorAll(".time-fmt").forEach(function (x) { x.classList.remove("active"); });
          b.classList.add("active");
          renderSlots();
          if (timeInput.value) {
            var p = parseTime(timeInput.value);
            if (p) timeInput.value = fmt === "12" ? to12(p) : p;
          }
        });
      });
    }

    dateInput.addEventListener("change", loadTaken);

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      hideError();
      var service = form.querySelector("[data-role=service]").value;
      var date = dateInput.value;
      var time24 = parseTime(timeInput.value);
      var name = form.querySelector("[data-role=name]").value.trim();
      var phone = form.querySelector("[data-role=phone]").value.trim();
      var email = form.querySelector("[data-role=email]").value.trim();
      var location = form.querySelector("[data-role=location]").value.trim();
      var notes = form.querySelector("[data-role=notes]").value.trim();

      if (!service || !date || !time24) {
        showError(t("Sila pilih perkhidmatan, tarikh dan masukkan masa.", "Please pick a service, a date and enter a time."));
        return;
      }
      if (!name || !phone || !email) {
        showError(t("Sila isi nama penuh, telefon dan e-mel.", "Please fill in full name, phone and email."));
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
      var payload = {
        service: service,
        booking_date: date,
        booking_time: time24,
        location: location,
        notes: notes || null,
        customer_name: name,
        phone: phone,
        email: email,
        user_id: opts && opts.session ? opts.session.user.id : null
      };
      var { error } = await sb.from("bookings").insert(payload);
      submitBtn.disabled = false;
      submitBtn.textContent = t("Tempah Sekarang", "Book Now");
      if (error) {
        showError(t("Ralat: ", "Error: ") + error.message);
        return;
      }
      msg.style.display = "block";
      form.querySelectorAll("input, select, textarea").forEach(function (el) { el.value = ""; });
      renderSlots();
    });

    renderSlots();
    loadTaken();
  }

  window.bookingForm = { init: init };
})();
