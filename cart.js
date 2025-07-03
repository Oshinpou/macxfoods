// cart.js - Fully functional, cross-device synced cart using Gun.js

// Initialize GUN with a public peer const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);

// Get the logged in user from localStorage let username = localStorage.getItem("macx_loggedInUser");

// Fallback to globally stored username if not locally present gun.get("macx_active_user").once(name => { if (!username && name) { username = name; localStorage.setItem("macx_loggedInUser", name); renderLoginStatus(); } });

if (username) { gun.get("macx_active_user").put(username); // Sync globally }

// Cart and Orders references const cartRef = gun.get("macx_cart").get(username); const ordersRef = gun.get("macx_orders").get(username); const adminOrders = gun.get("admin_orders"); let items = [];

function logout() { localStorage.removeItem("macx_loggedInUser"); location.reload(); }

function renderLoginStatus() { if (username) { document.getElementById("loggedInSection").style.display = "block"; document.getElementById("notLoggedIn").style.display = "none"; document.getElementById("userDisplay").textContent = Welcome, ${username}; renderCart(); } else { document.getElementById("notLoggedIn").style.display = "block"; document.getElementById("loggedInSection").style.display = "none"; } }

function updateGrandTotal() { let total = 0; items.forEach(item => { if (item && item.quantity && item.price) { total += item.price * item.quantity; } }); document.getElementById("grandTotal").textContent = Grand Total: ₹${total}; }

function updateQuantity(id, inputElement) { const newQty = parseInt(inputElement.value); if (isNaN(newQty) || newQty < 1) return; cartRef.get(id).once(data => { if (!data) return; const updatedItem = { ...data, quantity: newQty }; cartRef.get(id).put(updatedItem); renderCart(); }); }

function renderCart() { const container = document.getElementById("cartItems"); container.innerHTML = ""; items = [];

cartRef.map().once((item, id) => { if (!item || !item.productName) return;

items.push(item);

const div = document.createElement("div");
div.innerHTML = `
  <img src="${item.image}" alt="Product">
  <div class="product-info">
    <p><strong>${item.productName}</strong><br/>₹${item.price}</p>
    <div class="qty-controls">
      <button onclick="changeQty('${id}', -1)">-</button>
      <input class="qty-input" type="number" value="${item.quantity}" min="1" onchange="updateQuantity('${id}', this)">
      <button onclick="changeQty('${id}', 1)">+</button>
    </div>
    <div class="item-summary">Subtotal: ₹${item.price * item.quantity}</div>
  </div>
  <button class="remove-btn" onclick="removeItem('${id}')">Remove</button>
`;
container.appendChild(div);

});

setTimeout(() => { if (container.innerHTML.trim() === "") { container.innerHTML = '<p class="empty-msg">Your cart is empty.</p>'; document.getElementById("grandTotal").textContent = "Grand Total: ₹0"; } updateGrandTotal(); }, 1000); }

function changeQty(id, delta) { cartRef.get(id).once(data => { if (!data) return; const newQty = Math.max(1, (data.quantity || 1) + delta); const updatedItem = { ...data, quantity: newQty }; cartRef.get(id).put(updatedItem, () => { renderCart(); }); }); }

function removeItem(id) { cartRef.get(id).put(null); setTimeout(renderCart, 300); }

// Payment and Order Submission const form = document.getElementById("shippingForm"); if (form) { form.addEventListener("submit", (e) => { e.preventDefault();

if (items.length === 0) return alert("Cart is empty");

let total = 0;
items.forEach(item => {
  if (item && item.quantity && item.price) {
    total += item.price * item.quantity;
  }
});

const shipping = {
  name: document.getElementById("name").value,
  phone: document.getElementById("phone").value,
  email: document.getElementById("email").value,
  address: document.getElementById("address").value,
  country: document.getElementById("country").value,
  pincode: document.getElementById("pincode").value,
};

const orderId = Date.now().toString();

const options = {
  key: "YOUR_RAZORPAY_KEY_ID",
  amount: total * 100,
  currency: "INR",
  name: "MACX Cosmetics",
  description: "Order Payment",
  handler: function (response) {
    const order = {
      shipping,
      items,
      total,
      status: "Paid",
      razorpayPaymentId: response.razorpay_payment_id,
      timestamp: Date.now()
    };
    ordersRef.get(orderId).put(order);
    adminOrders.get(orderId).put({ ...order, username });
    cartRef.map().once((data, id) => cartRef.get(id).put(null));
    alert("Order placed successfully!");
    window.location.href = "myorders.html";
  },
  prefill: {
    name: shipping.name,
    email: shipping.email,
    contact: shipping.phone
  },
  theme: { color: "#00c0b5" }
};

const rzp = new Razorpay(options);
rzp.open();

}); }

renderLoginStatus();

  
