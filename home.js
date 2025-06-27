const gun = Gun();

document.addEventListener("DOMContentLoaded", () => {
  // Check if this is login.html or index.html by DOM element presence
  const loginForm = document.getElementById("loginForm");
  const loggedInSection = document.getElementById("loggedInSection");
  const notLoggedIn = document.getElementById("notLoggedIn");
  const userDisplay = document.getElementById("userDisplay");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginRedirectBtn = document.getElementById("loginRedirectBtn");
  const messageBox = document.getElementById("message");

  const accountId = sessionStorage.getItem("macx_accountId");

  // =========================
  // INDEX.HTML: Show login status
  // =========================
  if (userDisplay || loggedInSection || notLoggedIn) {
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

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        if (accountId) {
          gun.get("macx_sessions").get(accountId).put({ loggedIn: false });
          sessionStorage.removeItem("macx_accountId");
        }
        window.location.replace("index.html");
      });
    }

    if (loginRedirectBtn) {
      loginRedirectBtn.addEventListener("click", () => {
        window.location.href = "login.html";
      });
    }

    function showNotLoggedIn() {
      if (loggedInSection) loggedInSection.style.display = "none";
      if (notLoggedIn) notLoggedIn.style.display = "block";
    }
  }

  // =========================
  // LOGIN.HTML: Handle login form
  // =========================
  if (loginForm && messageBox) {
    const usernameInput = document.getElementById("username") || document.getElementById("loginUsername");
    const passwordInput = document.getElementById("password") || document.getElementById("loginPassword");

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = usernameInput?.value.trim();
      const password = passwordInput?.value;

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
  }
});

// =========================
// Secure Feature Access (e.g., Cart, Orders)
// =========================
function openFeature(url) {
  const errorMsg = document.getElementById("featureError");
  const accountId = sessionStorage.getItem("macx_accountId");

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
      setTimeout(() => (errorMsg.textContent = ""), 3000);
    }
  }
}
