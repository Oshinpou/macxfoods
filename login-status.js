function initializeLoginStatus() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const username = localStorage.getItem('username') || 'User';

  const notLoggedIn = document.getElementById('notLoggedIn');
  const loggedInSection = document.getElementById('loggedInSection');
  const userDisplay = document.getElementById('userDisplay');

  if (isLoggedIn) {
    notLoggedIn.style.display = 'none';
    loggedInSection.style.display = 'block';
    userDisplay.textContent = `Welcome, ${username}`;
  } else {
    notLoggedIn.style.display = 'block';
    loggedInSection.style.display = 'none';
  }

  document.getElementById('loginRedirectBtn').onclick = function() {
    window.location.href = 'login.html'; // or your login page
  };

  document.getElementById('logoutBtn').onclick = function() {
    localStorage.setItem('isLoggedIn', 'false');
    localStorage.removeItem('username');
    location.reload();
  };
}

// Optionally export if using module system
// export { initializeLoginStatus };
