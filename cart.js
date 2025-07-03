<script src="https://cdn.jsdelivr.net/npm/gun/gun.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sea.js"></script>
<script>
// Initialize Gun
const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']); // You can add more peers
const username = localStorage.getItem("macx_loggedInUser");

// References
const cartRef = username ? gun.get("macx_cart").get(username) : null;
const cartContainer = document.getElementById("cartItems");
const grandTotalDisplay = document.getElementById("grandTotal");
let currentCartItems = [];

function renderCart() {
  if (!cartRef || !cartContainer) return;

  cartContainer.innerHTML = "";
  currentCartItems = [];

  cartRef.map().once((item, id) => {
    if (!item || !item.productName) return;

    currentCartItems.push({ ...item, id });

    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <img src="${item.image}" alt="Product" width="60">
      <div style="flex-grow:1;">
        <p><strong>${item.productName}</strong></p>
        <p>Price: ₹${item.price}</p>
        <div>
          Qty: 
          <input type="number" value="${item.quantity}" min="1" 
                 onchange="updateQty('${id}', this.value)" style="width:50px;">
        </div>
        <p>Subtotal: ₹${item.price * item.quantity}</p>
      </div>
      <button onclick="removeItem('${id}')">Remove</button>
    `;
    cartContainer.appendChild(div);
  });

  // Delay to wait for all items and calculate total
  setTimeout(updateGrandTotal, 1000);
}

function updateQty(id, newQty) {
  if (!cartRef) return;
  cartRef.get(id).once(data => {
    if (!data) return;
    const updated = { ...data, quantity: parseInt(newQty) || 1 };
    cartRef.get(id).put(updated);
    setTimeout(renderCart, 500);
  });
}

function removeItem(id) {
  if (!cartRef) return;
  cartRef.get(id).put(null);
  setTimeout(renderCart, 500);
}

function updateGrandTotal() {
  let total = 0;
  currentCartItems.forEach(item => {
    if (item && item.price && item.quantity) {
      total += item.price * item.quantity;
    }
  });
  if (grandTotalDisplay) {
    grandTotalDisplay.textContent = `Grand Total: ₹${total}`;
  }
}

// Call on load
document.addEventListener("DOMContentLoaded", () => {
  if (!username) {
    if (document.getElementById("notLoggedIn")) {
      document.getElementById("notLoggedIn").style.display = "block";
    }
    if (document.getElementById("loggedInSection")) {
      document.getElementById("loggedInSection").style.display = "none";
    }
    return;
  }

  if (document.getElementById("notLoggedIn")) {
    document.getElementById("notLoggedIn").style.display = "none";
  }
  if (document.getElementById("loggedInSection")) {
    document.getElementById("loggedInSection").style.display = "block";
    const userDisplay = document.getElementById("userDisplay");
    if (userDisplay) userDisplay.textContent = `Welcome, ${username}`;
  }

  renderCart();
});
</script>
