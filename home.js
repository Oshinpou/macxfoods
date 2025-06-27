const gun = Gun();

document.addEventListener("DOMContentLoaded", () => {
  const loggedInSection = document.getElementById("loggedInSection");
  const notLoggedIn = document.getElementById("notLoggedIn");
  const userDisplay = document.getElementById("userDisplay");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginRedirectBtn = document.getElementById("loginRedirectBtn");
  const accountId = sessionStorage.getItem("macx_accountId");

  // === INDEX.html Login State ===
  if (userDisplay || loggedInSection || notLoggedIn) {
    if (accountId) {
      gun.get("macx_sessions").get(accountId).once((sessionData) => {
        if (sessionData && sessionData.loggedIn && sessionData.username) {
          if (userDisplay) userDisplay.textContent = `Welcome, ${sessionData.username} (ID: ${accountId})`;
          if (loggedInSection) loggedInSection.style.display = "block";
          if (notLoggedIn) notLoggedIn.style.display = "none";
        } else {
          showNotLoggedIn();
        }
      });
    } else {
      showNotLoggedIn();
    }

    function showNotLoggedIn() {
      if (loggedInSection) loggedInSection.style.display = "none";
      if (notLoggedIn) notLoggedIn.style.display = "block";
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        if (accountId) {
          gun.get("macx_sessions").get(accountId).put({ loggedIn: false });
          sessionStorage.removeItem("macx_accountId");
        }
        window.location.href = "index.html";
      });
    }

    if (loginRedirectBtn) {
      loginRedirectBtn.addEventListener("click", () => {
        window.location.href = "login.html";
      });
    }
  }

  // === LOGIN.html Login Form Logic ===
  const loginForm = document.getElementById("loginForm");
  const messageBox = document.getElementById("message");

  if (loginForm && messageBox) {
    const usernameInput = document.getElementById("loginUsername");
    const passwordInput = document.getElementById("loginPassword");

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = usernameInput.value.trim();
      const password = passwordInput.value;

      if (!username || !password) {
        showMessage("Please enter both username and password.", "red");
        return;
      }

      gun.get("macx_users").get(username).once(async (data) => {
        if (!data || !data.password) {
          showMessage("User not found. Please sign up.", "red");
          return;
        }

        const hashed = await Gun.SEA.work(password, null, null, { name: "SHA-256" });

        if (data.password === hashed) {
          const accountId = "macx-" + username;
          gun.get("macx_sessions").get(accountId).put({
            username,
            loggedIn: true
          });
          sessionStorage.setItem("macx_accountId", accountId);
          showMessage("Login successful! Redirecting...", "green");
          setTimeout(() => window.location.href = "index.html", 1000);
        } else {
          showMessage("Incorrect password. Try again.", "red");
        }
      });
    });

    function showMessage(msg, color = "red") {
      messageBox.textContent = msg;
      messageBox.style.color = color;
    }
  }
});

// === Secure Feature Access ===
function openFeature(url) {
  const accountId = sessionStorage.getItem("macx_accountId");
  const errorMsg = document.getElementById("featureError");

  if (!accountId) {
    showError("Login first to access this feature.");
    return;
  }

  gun.get("macx_sessions").get(accountId).once((sessionData) => {
    if (sessionData && sessionData.loggedIn) {
      window.location.href = url;
    } else {
      showError("Session expired. Please login again.");
    }
  });

  function showError(msg) {
    if (errorMsg) {
      errorMsg.textContent = msg;
      setTimeout(() => errorMsg.textContent = "", 3000);
    }
  }
}
