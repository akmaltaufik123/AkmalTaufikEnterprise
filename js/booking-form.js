(function () {
  var SLOTS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

  function to12(t) {
    var h = parseInt(t.slice(0, 2), 10);
    var ap = h >= 12 ? "PM" : "AM";
    var hh = h % 12 || 12;
    return hh + t.slice(2) + " " + ap;
  }

  function init(form, opts) {
    var fmt = "12";
    var ap = "AM";
    var selected = null;
    var taken = new Set();

    var dateInput = form.querySelector("[data-role=date]");
    var fmtRow = form.querySelector(".time-format");
    var ampmRow = form.querySelector(".ampm-row");
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
          return ap === "AM" ? h < 12 : h >= 12;
        });
      }
      slotsBox.innerHTML = "";
      list.forEach(function (s) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "time-slot";
        btn.textContent = fmt === "12" ? to12(s) : s;
        if (selected === s) btn.classList.add("active");
        if (taken.has(s)) btn.classList.add("taken");
        btn.addEventListener("click", function () {
          if (btn.classList.contains("taken")) return;
          selected = s;
          slotsBox.querySelectorAll(".time-slot").forEach(function (b) { b.classList.remove("active"); });
          btn.classList.add("active");
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
          if (fmt === "24") {
            ampmRow.classList.remove("visible");
          } else {
            ampmRow.classList.add("visible");
            if (!SLOTS.some(function (s) { return slotAp(s) === ap; })) ap = "AM";
          }
          renderSlots();
        });
      });
    }

    function slotAp(s) {
      return parseInt(s.slice(0, 2), 10) < 12 ? "AM" : "PM";
    }

    if (ampmRow) {
      ampmRow.querySelectorAll(".time-slot").forEach(function (b) {
        b.addEventListener("click", function () {
          ap = b.getAttribute("data-ap");
          ampmRow.querySelectorAll(".time-slot").forEach(function (x) { x.classList.remove("active"); });
          b.classList.add("active");
          renderSlots();
        });
      });
    }

    dateInput.addEventListener("change", function () {
      selected = null;
      loadTaken();
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      hideError();
      var service = form.querySelector("[data-role=service]").value;
      var date = dateInput.value;
      var name = form.querySelector("[data-role=name]").value.trim();
      var phone = form.querySelector("[data-role=phone]").value.trim();
      var email = form.querySelector("[data-role=email]").value.trim();
      var location = form.querySelector("[data-role=location]").value.trim();
      var notes = form.querySelector("[data-role=notes]").value.trim();

      if (!service || !date || !selected) {
        showError(t("Sila pilih perkhidmatan, tarikh dan masa.", "Please pick a service, date and time."));
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
      if (taken.has(selected)) {
        showError(t("Masa itu telah diambil.", "That slot is already taken."));
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = t("Menghantar...", "Sending...");
      var payload = {
        service: service,
        booking_date: date,
        booking_time: selected,
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
      selected = null;
      renderSlots();
    });

    renderSlots();
    loadTaken();
  }

  window.bookingForm = { init: init };
})();
