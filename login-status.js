function initializeLoginStatusUI() {
  const username = localStorage.getItem("macx_loggedInUser");
  const notLoggedIn = document.getElementById("notLoggedIn");
  const loggedInSection = document.getElementById("loggedInSection");
  const userDisplay = document.getElementById("userDisplay");
  const loginRedirectBtn = document.getElementById("loginRedirectBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (username) {
    if (notLoggedIn) notLoggedIn.style.display = "none";
    if (loggedInSection) loggedInSection.style.display = "block";
    if (userDisplay) userDisplay.textContent = `Welcome, ${username}`;
    
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        localStorage.removeItem("macx_loggedInUser");
        window.location.reload();
      };
    }
  } else {
    if (notLoggedIn) notLoggedIn.style.display = "block";
    if (loggedInSection) loggedInSection.style.display = "none";

    if (loginRedirectBtn) {
      loginRedirectBtn.onclick = () => {
        window.location.href = "login.html";
      };
    }
  }
}
