// Connect to GUN
const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);
const users = gun.get('macx_users');

// DOM elements
const userTableBody = document.getElementById('userTableBody');
const searchInput = document.getElementById('searchInput');

// Render user accounts
function renderUsers(filter = "") {
  userTableBody.innerHTML = "";

  users.map().once((data, key) => {
    if (!data || data.deleted || !data.username) return;

    if (filter && !key.toLowerCase().includes(filter.toLowerCase())) return;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${data.username}</td>
      <td>${data.email}</td>
      <td>${data.password}</td>
      <td><button onclick="confirmDelete('${key}')">Delete</button></td>
    `;
    userTableBody.appendChild(tr);
  });
}

// Search
searchInput.addEventListener('input', (e) => {
  renderUsers(e.target.value.trim());
});

// Confirm + Delete logic
window.confirmDelete = function (username) {
  const sure = confirm(`Are you sure to delete "${username}" account?`);
  if (!sure) return;

  const sure2 = confirm(`Do you want to permanently delete "${username}" from all devices?`);
  if (!sure2) return;

  const sure3 = confirm(`Final confirmation to delete "${username}". This cannot be undone.`);
  if (!sure3) return;

  // Mark as deleted globally
  users.get(username).put({ deleted: true, username: null, email: null, password: null }, (ack) => {
    if (ack.err) {
      alert("Error deleting user. Try again.");
    } else {
      alert("User deleted permanently.");
      renderUsers(searchInput.value.trim());
    }
  });
};

// Initial render
renderUsers();
