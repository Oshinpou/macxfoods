function initializeLoginStatusUI() {
  const username = localStorage.getItem("macx_loggedInUser");
  const userDisplay = document.getElementById("userDisplay");
  const loggedInSection = document.getElementById("loggedInSection");
  const notLoggedIn = document.getElementById("notLoggedIn");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginRedirectBtn = document.getElementById("loginRedirectBtn");

  if (username) {
    if (userDisplay) userDisplay.textContent = `Welcome, ${username}`;
    if (loggedInSection) loggedInSection.style.display = "block";
    if (notLoggedIn) notLoggedIn.style.display = "none";

    if (logoutBtn) {
      logoutBtn.onclick = () => {
        localStorage.removeItem("macx_loggedInUser");
        window.location.reload();
      };
    }
  } else {
    if (loggedInSection) loggedInSection.style.display = "none";
    if (notLoggedIn) notLoggedIn.style.display = "block";

    if (loginRedirectBtn) {
      loginRedirectBtn.onclick = () => {
        // Simulate login with prompt — replace with real login page if needed
        const enteredUsername = prompt("Enter your username:");
        if (enteredUsername) {
          localStorage.setItem("macx_loggedInUser", enteredUsername);
          window.location.reload();
        }
      };
    }
  }
}
