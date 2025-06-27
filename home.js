document.addEventListener("DOMContentLoaded", () => {
  const gun = Gun();
  const loggedInSection = document.getElementById("loggedInSection");
  const notLoggedIn = document.getElementById("notLoggedIn");
  const userDisplay = document.getElementById("userDisplay");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginRedirectBtn = document.getElementById("loginRedirectBtn");
  const featureError = document.getElementById("featureError");

  const accountId = sessionStorage.getItem("macx_accountId");

  // Check if session exists and is valid
  if (accountId) {
    gun.get("macx_sessions").get(accountId).once((sessionData) => {
      if (sessionData && sessionData.loggedIn && sessionData.username) {
        if (userDisplay) {
          userDisplay.textContent = `Welcome, ${sessionData.username} (ID: ${accountId})`;
        }
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

  // Logout button
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      const accountId = sessionStorage.getItem("macx_accountId");
      if (accountId) {
        // Clear session from GUN
        gun.get("macx_sessions").get(accountId).put({ loggedIn: false });
        // Clear local session
        sessionStorage.removeItem("macx_accountId");
        window.location.replace("index.html");
      }
    });
  }

  // Login redirect if not logged in
  if (loginRedirectBtn) {
    loginRedirectBtn.addEventListener("click", () => {
      window.location.href = "login.html";
    });
  }
});

// Feature access protection
function openFeature(url) {
  const gun = Gun();
  const accountId = sessionStorage.getItem("macx_accountId");
  const errorMsg = document.getElementById("featureError");

  if (!accountId) {
    showFeatureError("Login first to access this feature.");
    return;
  }

  gun.get("macx_sessions").get(accountId).once((sessionData) => {
    if (sessionData && sessionData.loggedIn) {
      window.location.href = url;
    } else {
      showFeatureError("Session expired. Please login again.");
    }
  });

  function showFeatureError(msg) {
    if (errorMsg) {
      errorMsg.textContent = msg;
      setTimeout(() => {
        errorMsg.textContent = "";
      }, 3000);
    }
  }
}

// ------------------ LOGIN PAGE HANDLER -------------------
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const usernameInput = document.getElementById("username") || document.getElementById("loginUsername");
  const passwordInput = document.getElementById("password") || document.getElementById("loginPassword");
  const messageBox = document.getElementById("message");

  if (!loginForm || !usernameInput || !passwordInput || !messageBox) {
    return; // We're not on login page, ignore
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      showMessage("Please enter both username and password.", "red");
      return;
    }

    const userRef = gun.get("macx_users").get(username);
    userRef.once(async (data) => {
      if (!data || !data.password) {
        showMessage("User not found. Please sign up first.", "red");
        return;
      }

      const hashedInput = await Gun.SEA.work(password, null, null, { name: "SHA-256" });

      if (data.password === hashedInput) {
        const accountId = "macx-" + username;

        // Save session globally and locally
        gun.get("macx_sessions").get(accountId).put({
          username,
          loggedIn: true
        });
        sessionStorage.setItem("macx_accountId", accountId);

        showMessage("Login successful! Redirecting...", "green");
        setTimeout(() => {
          window.location.href = "index.html";
        }, 1000);
      } else {
        showMessage("Incorrect password. Try again.", "red");
      }
    });
  });

  function showMessage(msg, color = "red") {
    messageBox.textContent = msg;
    messageBox.style.color = color;
  }
});
