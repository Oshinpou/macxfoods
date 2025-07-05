// cart.js

// 0. Initialize GunDB & References
const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);
const username = localStorage.getItem("macx_loggedInUser");
const cartRef = gun.get('macx_cart').get(username);
const ordersRef = gun.get("macx_orders").get(username);
const adminOrders = gun.get("admin_orders");

let items = {};

// 1. Logout
function logout() {
  localStorage.removeItem("macx_loggedInUser");
  location.reload();
}

// 2. Render login/cart UI
function renderLoginStatus() {
  if (!username) {
    document.getElementById("notLoggedIn").style.display = "block";
    return;
  }
  document.getElementById("loggedInSection").style.display = "block";
  document.getElementById("userDisplay").textContent = `Welcome, ${username}`;
  listenToCart();

  // Bind shipping form submit
  const form = document.getElementById("shippingForm");
  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      startPayment();
    });
  }
}

document.addEventListener("DOMContentLoaded", renderLoginStatus);

// 3. Listen & render cart items reactively
function listenToCart() {
  const container = document.getElementById("cartItems");
  items = {};
  container.innerHTML = "";

  cartRef.map().on((data, id) => {
    if (!data || !data.productName) {
      // removed item
      delete items[id];
      const existing = container.querySelector(`[data-id="${id}"]`);
      if (existing) existing.remove();
      updateGrandTotal();
      updateCartSummary();
      return;
    }

    // add/update item
    items[id] = { ...data, id };
    let node = container.querySelector(`[data-id="${id}"]`);
    if (!node) {
      node = document.createElement("div");
      node.dataset.id = id;
      container.appendChild(node);
    }

    const qty = parseInt(data.quantity) || 1;
    const price = parseInt(data.price) || 0;
    const subtotal = qty * price;

    node.innerHTML = `
      <img src="${data.image}" alt="${data.productName}" height="60">
      <div class="product-info">
        <p><strong>${data.productName}</strong><br>₹${price}</p>
        <div class="qty-controls">
          <button onclick="changeQty('${id}', -1)">-</button>
          <input type="number" min="1" class="qty-input" value="${qty}"
                 onchange="updateQty('${id}', this)">
          <button onclick="changeQty('${id}', 1)">+</button>
        </div>
        <div class="item-summary">Subtotal: ₹${subtotal}</div>
      </div>
      <button class="remove-btn" onclick="removeItem('${id}')">Remove</button>
    `;

    updateGrandTotal();
    updateCartSummary();
  });

  // if truly empty, show message after short delay
  setTimeout(() => {
    if (!container.innerHTML.trim()) {
      container.innerHTML = '<p class="empty-msg">Your cart is empty.</p>';
      document.getElementById("grandTotal").textContent = "Grand Total: ₹0";
      updateCartSummary();
    }
  }, 1500);
}

// 4. Update grand total
function updateGrandTotal() {
  let total = 0;
  Object.values(items).forEach(item => {
    const p = parseInt(item.price) || 0;
    const q = parseInt(item.quantity) || 1;
    total += p * q;
  });
  document.getElementById("grandTotal").textContent = `Grand Total: ₹${total}`;
}

// 5. Update cart summary above form
function updateCartSummary() {
  const summaryEl = document.getElementById("cartSummary");
  if (!summaryEl) return;
  const lines = Object.values(items).map(item => {
    const p = parseInt(item.price) || 0;
    const q = parseInt(item.quantity) || 1;
    const sub = p * q;
    return `${item.productName}: ₹${p} × ${q} = ₹${sub}`;
  });
  summaryEl.innerHTML = lines.length
    ? lines.join("<br>")
    : "<em>Your cart is empty.</em>";
}

// 6. Quantity controls
function updateQty(id, input) {
  const newQty = Math.max(1, parseInt(input.value) || 1);
  cartRef.get(id).once(data => {
    if (data) cartRef.get(id).put({ ...data, quantity: newQty });
  });
}

function changeQty(id, delta) {
  cartRef.get(id).once(data => {
    if (!data) return;
    const cur = parseInt(data.quantity) || 1;
    const next = Math.max(1, cur + delta);
    cartRef.get(id).put({ ...data, quantity: next });
  });
}

function removeItem(id) {
  cartRef.get(id).put(null);
}

// 7. Razorpay checkout with cart summary & shipping notes
async function startPayment() {
  // a) Validate cart
  const cartItems = Object.values(items);
  if (!cartItems.length) {
    return alert("🛒 Your cart is empty.");
  }

  // b) Validate shipping fields
  const get = id => document.getElementById(id)?.value.trim();
  const [name, phone, email, address, country, pincode] =
    ["name","phone","email","address","country","pincode"].map(get);
  if (![name, phone, email, address, country, pincode].every(Boolean)) {
    return alert("🚨 Please fill all shipping details.");
  }

  // c) Compute total & orderId
  const totalAmount = cartItems.reduce((sum, i) =>
    sum + (parseInt(i.price) || 0) * (parseInt(i.quantity) || 1), 0);
  const orderId = Date.now().toString();

  // d) Save “Pending” in GunDB
  const pending = {
    items: cartItems,
    shipping: { name, phone, email, address, country, pincode },
    total: totalAmount,
    status: "Pending",
    createdAt: Date.now()
  };
  await Promise.all([
    ordersRef.get(orderId).put(pending),
    adminOrders.get(orderId).put({ ...pending, username })
  ]);

  // e) (Optional) create server-side Razorpay order
  let razorOrder;
  try {
    const resp = await fetch("/api/createOrder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: totalAmount * 100, receipt: orderId })
    });
    razorOrder = await resp.json();
  } catch (err) {
    console.warn("Server-side order creation failed, falling back client-only");
  }

  // f) Configure & open Razorpay checkout
  const summaryText = cartItems
    .map(i => `${i.productName} (qty:${i.quantity}, price:₹${i.price})`)
    .join(" | ");

  const options = {
    key: "rzp_live_ozWo08bXwqssx3",
    amount: totalAmount * 100,
    currency: "INR",
    name: "MACX Marketplace",
    description: `Order #${orderId}`,
    order_id: razorOrder?.id,    // include only if using server order
    prefill: { name, email, contact: phone },
    notes: {
      shipping_name:    name,
      shipping_phone:   phone,
      shipping_email:   email,
      shipping_address: address,
      shipping_country: country,
      shipping_pincode: pincode,
      cart_items:       JSON.stringify(cartItems),
      cart_summary:     summaryText
    },
    theme: { color: "#00c0b5" },
    handler: async function (response) {
  const paidAt = Date.now();
  const paymentId = response.razorpay_payment_id;
  const paymentMethod = "Razorpay";

  // 1. Fetch original order to preserve items/shipping/total
  ordersRef.get(orderId).once(originalOrder => {
    if (!originalOrder) {
      alert("⚠️ Failed to find original order.");
      return;
    }

    const updatedOrder = {
      ...originalOrder,
      razorpayPaymentId: paymentId,
      paymentMethod,
      status: "Paid",
      paidAt
    };

    // 2. Save updated to user & admin orders
    ordersRef.get(orderId).put(updatedOrder);
    adminOrders.get(orderId).put({ ...updatedOrder, username });

    // 3. Clear user's cart
    cartRef.map().once((_, id) => cartRef.get(id).put(null));

    // 4. Notify & redirect
    alert("✅ Payment successful! Redirecting to My Orders…");
    window.location.href = "myorders.html";
  });
    }
      
document.addEventListener("DOMContentLoaded", renderLoginStatus);
