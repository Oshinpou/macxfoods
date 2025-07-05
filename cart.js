const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']); const username = localStorage.getItem("macx_loggedInUser"); const cartRef = gun.get('macx_cart').get(username); const ordersRef = gun.get("macx_orders").get(username); const adminOrders = gun.get("admin_orders");

let items = {}; let currentOrderId = "";

function logout() { localStorage.removeItem("macx_loggedInUser"); location.reload(); }

function renderLoginStatus() { if (!username) { document.getElementById("notLoggedIn").style.display = "block"; return; } document.getElementById("loggedInSection").style.display = "block"; document.getElementById("userDisplay").textContent = Welcome, ${username}; listenToCart(); }

function listenToCart() { const container = document.getElementById("cartItems"); items = {}; container.innerHTML = "";

cartRef.map().on((data, id) => { if (!data || !data.productName) { delete items[id]; const existing = container.querySelector([data-id="${id}"]); if (existing) existing.remove(); updateGrandTotal(); return; }

items[id] = { ...data, id };

let itemNode = container.querySelector(`[data-id="${id}"]`);
if (!itemNode) {
  itemNode = document.createElement("div");
  itemNode.dataset.id = id;
  container.appendChild(itemNode);
}

const quantity = parseInt(data.quantity) || 1;
const subtotal = quantity * parseInt(data.price);

itemNode.innerHTML = `
  <img src="${data.image}" alt="${data.productName}" height="60">
  <div class="product-info">
    <p><strong>${data.productName}</strong><br>₹${data.price}</p>
    <div class="qty-controls">
      <button onclick="changeQty('${id}', -1)">-</button>
      <input type="number" min="1" class="qty-input" value="${quantity}" onchange="updateQty('${id}', this)">
      <button onclick="changeQty('${id}', 1)">+</button>
    </div>
    <div class="item-summary" id="subtotal-${id}">Subtotal: ₹${subtotal}</div>
  </div>
  <button class="remove-btn" onclick="removeItem('${id}')">Remove</button>
`;

updateGrandTotal();
updateCartSummary();

});

setTimeout(() => { if (container.innerHTML.trim() === '') { container.innerHTML = '<p class="empty-msg">Your cart is empty.</p>'; document.getElementById("grandTotal").textContent = "Grand Total: ₹0"; } }, 1500); }

function updateGrandTotal() { let total = 0; Object.values(items).forEach(item => { const price = parseInt(item.price) || 0; const qty = parseInt(item.quantity) || 1; total += price * qty; }); document.getElementById("grandTotal").textContent = Grand Total: ₹${total}; }

function updateQty(id, input) { const newQty = Math.max(1, parseInt(input.value) || 1); cartRef.get(id).once(data => { if (!data) return; cartRef.get(id).put({ ...data, quantity: newQty }); }); }

function changeQty(id, delta) { cartRef.get(id).once(data => { if (!data) return; const currentQty = parseInt(data.quantity) || 1; const newQty = Math.max(1, currentQty + delta); cartRef.get(id).put({ ...data, quantity: newQty }); }); }

function removeItem(id) { cartRef.get(id).put(null); }

function updateCartSummary() { const summaryEl = document.getElementById("cartSummary"); const lines = Object.values(items).map(item => { const sub = item.quantity * item.price; return ${item.productName}: ₹${item.price} × ${item.quantity} = ₹${sub}; }); summaryEl.innerHTML = lines.length ? lines.join("<br>") : "<em>Your cart is empty.</em>"; }

document.addEventListener("DOMContentLoaded", () => { renderLoginStatus(); const btn = document.getElementById("createPayBtn"); if (btn) btn.addEventListener("click", createOrderAndPay); });

async function createOrderAndPay() { const cartItems = Object.values(items || {}); if (!cartItems.length) return alert("🛒 Your cart is empty.");

const get = id => document.getElementById(id)?.value.trim(); const [name, phone, email, address, country, pincode] = ["name", "phone", "email", "address", "country", "pincode"].map(get);

if (![name, phone, email, address, country, pincode].every(Boolean)) { return alert("🚨 Please fill all shipping details."); }

const totalAmount = cartItems.reduce((sum, i) => sum + (parseInt(i.price) || 0) * (parseInt(i.quantity) || 1), 0);

currentOrderId = Date.now().toString(); const orderData = { items: cartItems, shipping: { name, phone, email, address, country, pincode }, total: totalAmount, status: "Pending", createdAt: Date.now() };

await Promise.all([ ordersRef.get(currentOrderId).put(orderData), adminOrders.get(currentOrderId).put({ ...orderData, username }) ]);

const msg = document.createElement("div"); msg.textContent = "✅ Order created! Redirecting to payment..."; msg.style.color = "green"; msg.style.marginTop = "10px"; document.getElementById("createPayBtn").after(msg);

setTimeout(() => { msg.remove(); startRazorpayPayment(totalAmount, name, phone, email, address, country, pincode, cartItems); }, 2000); }

function startRazorpayPayment(total, name, phone, email, address, country, pincode, cartItems) { const summaryText = cartItems.map(i => ${i.productName} (₹${i.price} × ${i.quantity})).join(" | "); const options = { key: "rzp_live_ozWo08bXwqssx3", amount: total * 100, currency: "INR", name: "MACX Marketplace", description: Order #${currentOrderId}, prefill: { name, email, contact: phone }, notes: { shipping_name: name, shipping_phone: phone, shipping_email: email, shipping_address: address, shipping_country: country, shipping_pincode: pincode, cart_summary: summaryText }, theme: { color: "#00c0b5" }, handler: function (response) { const paidAt = Date.now(); const update = { razorpayPaymentId: response.razorpay_payment_id, status: "Paid", paidAt }; ordersRef.get(currentOrderId).put(update); adminOrders.get(currentOrderId).put({ ...update, username });

cartRef.map().once((_, id) => cartRef.get(id).put(null));
  window.location.href = "myorders.html";
}

}; new Razorpay(options).open(); }

document.addEventListener("DOMContentLoaded", renderLoginStatus);

