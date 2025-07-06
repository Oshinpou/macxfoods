const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);
const users = gun.get('macx_users');

// Elements
const signupForm = document.getElementById('signupForm');
const loginForm = document.getElementById('loginForm');
const recoverForm = document.getElementById('recoverForm');
const deleteForm = document.getElementById('deleteForm');
const msgBox = document.getElementById('message');

// Utility: Show Message
function showMessage(msg, success = false) {
  if (!msgBox) return alert(msg);
  msgBox.textContent = msg;
  msgBox.style.color = success ? 'green' : 'red';
  setTimeout(() => msgBox.textContent = '', 4000);
}

// SIGNUP
signupForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('signupUsername').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value.trim();
  if (!username || !email || !password) return showMessage("All signup fields required");

  users.get(username).once((userData) => {
    if (userData) return showMessage("Username already exists");

    let emailTaken = false;

    users.map().once((u) => {
      if (u && u.email === email) emailTaken = true;
    });

    setTimeout(() => {
      if (emailTaken) return showMessage("Email already in use");

      users.get(username).put({ username, email, password }, (ack) => {
        if (ack.err) return showMessage("Signup failed. Try again.");
        showMessage("Signup successful!", true);
      });
    }, 1000); // Wait for .map().once() to finish
  });
});

// LOGIN
loginForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  if (!username || !password) return showMessage("Login fields required");

  users.get(username).once((data) => {
  if (!data) return showMessage("Account does not exist");
  if (data.password !== password) return showMessage("Incorrect password");

  localStorage.setItem('macx_loggedInUser', username);
  showMessage("Login successful!", true);

  // ✅ Redirect to last opened page or fallback to index.html
  // ✅ Auto-redirect to last opened page after successful login
setTimeout(() => {
  const returnPage = localStorage.getItem("macx_returnPage");

  if (returnPage && returnPage !== "login.html") {
    localStorage.removeItem("macx_returnPage");
    window.location.href = returnPage;
  } else {
    window.location.href = "index.html"; // fallback
  }
}, 1000);
});

// RECOVER
recoverForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('recoverUsername').value.trim();
  const email = document.getElementById('recoverEmail').value.trim();
  if (!username || !email) return showMessage("All recovery fields required");

  users.get(username).once((data) => {
    if (!data) return showMessage("Username not found");
    if (data.email !== email) return showMessage("Email mismatch");
    showMessage(`Recovered Password: ${data.password}`, true);
  });
});

// DELETE
deleteForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('deleteUsername').value.trim();
  const email = document.getElementById('deleteEmail').value.trim();
  const password = document.getElementById('deletePassword').value.trim();
  const c1 = document.getElementById('confirmDelete1')?.checked;
  const c2 = document.getElementById('confirmDelete2')?.checked;
  const c3 = document.getElementById('confirmDelete3')?.checked;

  if (!username || !email || !password || !c1 || !c2 || !c3) {
    return showMessage("All fields and confirmations required");
  }

  users.get(username).once((data) => {
    if (!data) return showMessage("Account not found");
    if (data.email !== email || data.password !== password) {
      return showMessage("Credentials do not match");
    }

    users.get(username).put(null); // Delete
    showMessage("Account deleted permanently", true);
    localStorage.removeItem('macx_loggedInUser');
  });
});

// CHANGE PASSWORD
const changeForm = document.getElementById('changeForm');

changeForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('changeUsername').value.trim();
  const email = document.getElementById('changeEmail').value.trim();
  const oldPassword = document.getElementById('changeOldPassword').value.trim();
  const newPassword = document.getElementById('changeNewPassword').value.trim();

  if (!username || !email || !oldPassword || !newPassword) {
    return showMessage("All change password fields are required");
  }

  users.get(username).once((userData) => {
    if (!userData) return showMessage("User not found");
    if (userData.email !== email) return showMessage("Email does not match");
    if (userData.password !== oldPassword) return showMessage("Old password incorrect");

    // Update the password globally in Gun DB
    users.get(username).put({ password: newPassword }, (ack) => {
      if (ack.err) return showMessage("Failed to update password");
      showMessage("Password updated successfully", true);
    });
  });
});
