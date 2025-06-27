document.addEventListener("DOMContentLoaded", () => {
  const gun = Gun(); // Initialize GUN
  const loggedInSection = document.getElementById("loggedInSection");
  const notLoggedIn = document.getElementById("notLoggedIn");
  const userDisplay = document.getElementById("userDisplay");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginRedirectBtn = document.getElementById("loginRedirectBtn");

  // Get current account ID from session storage
  const accountId = sessionStorage.getItem("macx_accountId");

  if (accountId) {
    // Fetch session info from GUN for this account
    gun.get("macx_sessions").get(accountId).once((sessionData) => {
      if (sessionData && sessionData.loggedIn && sessionData.username) {
        // Display user info
        userDisplay.textContent = `Welcome, ${sessionData.username} (ID: ${accountId})`;
        loggedInSection.style.display = "block";
        notLoggedIn.style.display = "none";
      } else {
        // No valid session
        showNotLoggedIn();
      }
    });
  } else {
    // No account ID stored
    showNotLoggedIn();
  }

  // Handle logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      const accountId = sessionStorage.getItem("macx_accountId");
      if (accountId) {
        gun.get("macx_sessions").get(accountId).put({ loggedIn: false });
        sessionStorage.removeItem("macx_accountId");
        window.location.replace("index.html");
      }
    });
  }

  // Handle login redirection
  if (loginRedirectBtn) {
    loginRedirectBtn.addEventListener("click", () => {
      window.location.href = "login.html";
    });
  }

  // Show not logged in section
  function showNotLoggedIn() {
    loggedInSection.style.display = "none";
    notLoggedIn.style.display = "block";
  }
});

// Securely handle feature navigation
function openFeature(url) {
  const accountId = sessionStorage.getItem("macx_accountId");
  const gun = Gun();
  const errorMsg = document.getElementById("featureError");

  if (!accountId) {
    showFeatureError("Login First to access this feature.");
    return;
  }

  gun.get("macx_sessions").get(accountId).once((sessionData) => {
    if (sessionData && sessionData.loggedIn) {
      window.location.href = url;
    } else {
      showFeatureError("Session expired or invalid. Please login again.");
    }
  });

  function showFeatureError(msg) {
    if (errorMsg) {
      errorMsg.textContent = msg;
      setTimeout(() => (errorMsg.textContent = ""), 3000);
    }
  }
}
