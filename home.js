document.addEventListener("DOMContentLoaded", () => {
  const username = localStorage.getItem("macx_loggedInUser");
  const userDisplay = document.getElementById("userDisplay");
  const loggedInSection = document.getElementById("loggedInSection");
  const notLoggedIn = document.getElementById("notLoggedIn");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginRedirectBtn = document.getElementById("loginRedirectBtn");

  if (username) {
    // User is logged in
    if (userDisplay) userDisplay.textContent = `Welcome, ${username}`;
    if (loggedInSection) loggedInSection.style.display = "block";
    if (notLoggedIn) notLoggedIn.style.display = "none";

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("macx_loggedInUser");
        window.location.replace("login.html");
      });
    }
  } else {
    // User is not logged in
    if (loggedInSection) loggedInSection.style.display = "none";
    if (notLoggedIn) notLoggedIn.style.display = "block";

    if (loginRedirectBtn) {
  loginRedirectBtn.addEventListener("click", () => {
    localStorage.setItem("macx_returnPage", window.location.href);
    window.location.href = "login.html";
  });
    }
      });
    }
  }
});

function openFeature(url) {
  const username = localStorage.getItem("macx_loggedInUser");
  const errorMsg = document.getElementById("featureError");

  if (username) {
    window.location.href = url;
  } else {
    if (errorMsg) {
      errorMsg.textContent = "Login First to access this feature.";
      setTimeout(() => errorMsg.textContent = "", 3000);
    }
  }
}
