// Initialize GUN
const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);
const username = localStorage.getItem("macx_loggedInUser");

// References
const cartRef = username ? gun.get('macx_cart').get(username) : null;
const cartContainer = document.getElementById("cartItems");
const grandTotalDisplay = document.getElementById("grandTotal");
let currentCartItems = {};

function renderCart() {
  if (!cartRef || !cartContainer) return;

  cartContainer.innerHTML = "";
  currentCartItems = {};

  cartRef.map().once((item, id) => {
    if (!item || !item.productName) return;

    currentCartItems[id] = item;

    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <img src="${item.image}" alt="${item.productName}" width="60">
      <div style="flex-grow:1;">
        <p><strong>${item.productName}</strong></p>
        <p>Price: ₹${item.price}</p>
        <div>
          Qty:
          <input type="number" value="${item.quantity}" min="1" 
                 onchange="updateQty('${id}', this.value)" style="width:50px;">
        </div>
        <p id="subtotal-${id}">Subtotal: ₹${item.price * item.quantity}</p>
      </div>
      <button onclick="removeItem('${id}')">Remove</button>
    `;
    cartContainer.appendChild(div);
  });

  setTimeout(updateGrandTotal, 1000); // Wait for all items to load
}

function updateQty(id, newQty) {
  const quantity = parseInt(newQty);
  if (quantity < 1 || !currentCartItems[id]) return;

  const item = { ...currentCartItems[id], quantity };
  cartRef.get(id).put(item);
  
  // Update UI immediately
  document.getElementById(`subtotal-${id}`).textContent = `Subtotal: ₹${item.price * quantity}`;
  updateGrandTotal();
}

function removeItem(id) {
  if (!cartRef) return;
  cartRef.get(id).put(null);
  delete currentCartItems[id];
  renderCart();
}

function updateGrandTotal() {
  let total = 0;
  for (const id in currentCartItems) {
    const item = currentCartItems[id];
    if (item && item.price && item.quantity) {
      total += item.price * item.quantity;
    }
  }
  if (grandTotalDisplay) {
    grandTotalDisplay.textContent = `Grand Total: ₹${total}`;
  }
}

// Login Status UI
function handleLoginStatusUI() {
  const notLoggedIn = document.getElementById("notLoggedIn");
  const loggedInSection = document.getElementById("loggedInSection");
  const userDisplay = document.getElementById("userDisplay");
  const loginRedirectBtn = document.getElementById("loginRedirectBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (username) {
    if (userDisplay) userDisplay.textContent = `Welcome, ${username}`;
    if (loggedInSection) loggedInSection.style.display = "block";
    if (notLoggedIn) notLoggedIn.style.display = "none";
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        localStorage.removeItem("macx_loggedInUser");
        location.reload();
      };
    }
  } else {
    if (loggedInSection) loggedInSection.style.display = "none";
    if (notLoggedIn) notLoggedIn.style.display = "block";
    if (loginRedirectBtn) {
      loginRedirectBtn.onclick = () => {
        location.href = "login.html";
      };
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  handleLoginStatusUI();
  renderCart();
});
