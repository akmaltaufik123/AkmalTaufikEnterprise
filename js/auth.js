(function () {
  var USERS_KEY = "automatemy_users";
  var SESSION_KEY = "automatemy_session";

  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
    } catch (e) {
      return null;
    }
  }

  function setSession(email) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email: email, at: Date.now() }));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function showError(text) {
    var el = document.getElementById("form-error");
    if (!el) return;
    el.textContent = text;
    el.hidden = false;
  }

  var registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = document.getElementById("name").value.trim();
      var company = document.getElementById("company").value.trim();
      var email = document.getElementById("email").value.trim().toLowerCase();
      var password = document.getElementById("password").value;

      if (!name || !email || !password) {
        showError("Please fill in all required fields.");
        return;
      }
      if (password.length < 6) {
        showError("Password must be at least 6 characters.");
        return;
      }

      var users = getUsers();
      if (users.some(function (u) { return u.email === email; })) {
        showError("An account with this email already exists. Try logging in.");
        return;
      }

      users.push({ name: name, company: company, email: email, password: password });
      saveUsers(users);
      setSession(email);
      window.location.href = "dashboard.html";
    });
  }

  var loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = document.getElementById("email").value.trim().toLowerCase();
      var password = document.getElementById("password").value;

      var user = getUsers().find(function (u) { return u.email === email && u.password === password; });
      if (!user) {
        showError("Invalid email or password.");
        return;
      }

      setSession(email);
      window.location.href = "dashboard.html";
    });
  }

  var logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      clearSession();
      window.location.href = "login.html";
    });
  }

  var userName = document.getElementById("user-name");
  var userEmail = document.getElementById("user-email");
  if (userName || userEmail) {
    var session = getSession();
    if (!session) {
      window.location.href = "login.html";
      return;
    }
    var user = getUsers().find(function (u) { return u.email === session.email; });
    if (!user) {
      clearSession();
      window.location.href = "login.html";
      return;
    }
    if (userName) userName.textContent = user.name.split(" ")[0];
    if (userEmail) userEmail.textContent = user.email;
  }
})();
