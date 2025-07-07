// check-login.js

(function () {
  const username = localStorage.getItem("macx_loggedInUser");

  if (!username) {
    // Not logged in: save current page and redirect to login
    localStorage.setItem("macx_returnPage", window.location.href);
    window.location.href = "login.html";
  }
})();
