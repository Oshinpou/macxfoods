document.addEventListener("DOMContentLoaded", () => {
  const username = localStorage.getItem("macx_loggedInUser");
  const accountUsername = document.getElementById("accountUsername");
  const loggedInSection = document.getElementById("loggedInSection");
  const notLoggedIn = document.getElementById("notLoggedIn");

  if (username) {
    if (accountUsername) accountUsername.textContent = username;
    if (loggedInSection) loggedInSection.style.display = "block";
    if (notLoggedIn) notLoggedIn.style.display = "none";
  } else {
    if (loggedInSection) loggedInSection.style.display = "none";
    if (notLoggedIn) notLoggedIn.style.display = "block";
  }
});
