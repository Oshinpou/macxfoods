// cart.js

const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);
const username = localStorage.getItem("macx_loggedInUser");
const cartRef = gun.get("macx_cart").get(username);
const ordersRef = gun.get("macx_orders").get(username);
const adminOrders = gun.get("admin_orders");

let items = {};

// 1. Login status rendering
function renderLoginStatus() {
  if (!username) {
    document.getElementById("notLoggedIn").style.display = "block";
    return;
  }
  document.getElementById("loggedInSection").style.display = "block";
  document.getElementById("userDisplay").textContent = `Welcome, ${username}`;
  listenToCart();

  const form = document.getElementById("shippingForm");
  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      startPayment();
    });
  }
}

// 2. Load cart items from GunDB
function listenToCart() {
  const container = document.getElementById("cartItems");
  items = {};
  container.innerHTML = "";

  cartRef.map().on((data, id) => {
    if (!data || !data.productName) {
      delete items[id];
      const old = container.querySelector(`[data-id="${id}"]`);
      if (old) old.remove();
      updateGrandTotal();
      updateCartSummary();
      return;
    }

    items[id] = { ...data, id };

    let el = container.querySelector(`[data-id="${id}"]`);
    if (!el) {
      el = document.createElement("div");
      el.dataset.id = id;
      container.appendChild(el);
    }

    const qty = parseInt(data.quantity) || 1;
    const subtotal = qty * parseInt(data.price || 0);

    el.innerHTML = `
      <img src="${data.image}" alt="${data.productName}" height="60">
      <div class="product-info">
        <p><strong>${data.productName}</strong><br>₹${data.price}</p>
        <div class="qty-controls">
          <button onclick="changeQty('${id}', -1)">-</button>
          <input type="number" min="1" class="qty-input" value="${qty}" onchange="updateQty('${id}', this)">
          <button onclick="changeQty('${id}', 1)">+</button>
        </div>
        <div class="item-summary">Subtotal: ₹${subtotal}</div>
      </div>
      <button class="remove-btn" onclick="removeItem('${id}')">Remove</button>
    `;

    updateGrandTotal();
    updateCartSummary();
  });

  setTimeout(() => {
    if (!container.innerHTML.trim()) {
      container.innerHTML = '<p class="empty-msg">Your cart is empty.</p>';
      document.getElementById("grandTotal").textContent = "Grand Total: ₹0";
      updateCartSummary();
    }
  }, 1500);
}

// 3. Quantity control
function updateQty(id, input) {
  const q = Math.max(1, parseInt(input.value) || 1);
  cartRef.get(id).once(data => {
    if (data) cartRef.get(id).put({ ...data, quantity: q });
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

// 4. Update cart summary
function updateGrandTotal() {
  let total = 0;
  Object.values(items).forEach(i => {
    const price = parseInt(i.price) || 0;
    const qty = parseInt(i.quantity) || 1;
    total += price * qty;
  });
  document.getElementById("grandTotal").textContent = `Grand Total: ₹${total}`;
}

function updateCartSummary() {
  const summary = document.getElementById("cartSummary");
  const lines = Object.values(items).map(i => {
    const sub = i.quantity * i.price;
    return `${i.productName}: ₹${i.price} × ${i.quantity} = ₹${sub}`;
  });
  summary.innerHTML = lines.length ? lines.join("<br>") : "<em>Your cart is empty.</em>";
}

// 5. Razorpay Checkout
async function startPayment() {
  const cartItems = Object.values(items || {});
  if (!cartItems.length) return alert("🛒 Your cart is empty.");

  const get = id => document.getElementById(id)?.value.trim();
  const [name, phone, email, address, country, pincode] =
    ["name", "phone", "email", "address", "country", "pincode"].map(get);
  if (![name, phone, email, address, country, pincode].every(Boolean))
    return alert("🚨 Please fill all shipping details.");

  const totalAmount = cartItems.reduce((sum, i) =>
    sum + (parseInt(i.price) || 0) * (parseInt(i.quantity) || 1), 0);
  const orderId = Date.now().toString();

  const order = {
    items: cartItems,
    shipping: { name, phone, email, address, country, pincode },
    total: totalAmount,
    status: "Pending",
    createdAt: Date.now()
  };

  await Promise.all([
    ordersRef.get(orderId).put(order),
    adminOrders.get(orderId).put({ ...order, username })
  ]);

  const summaryText = cartItems
    .map(i => `${i.productName} (qty:${i.quantity}, ₹${i.price})`)
    .join(" | ");

  const options = {
    key: "rzp_live_ozWo08bXwqssx3",
    amount: totalAmount * 100,
    currency: "INR",
    name: "MACX Marketplace",
    description: `Order #${orderId}`,
    prefill: { name, email, contact: phone },
    notes: {
      shipping_name: name,
      shipping_phone: phone,
      shipping_email: email,
      shipping_address: address,
      shipping_country: country,
      shipping_pincode: pincode,
      cart_items: JSON.stringify(cartItems),
      cart_summary: summaryText
    },
    theme: { color: "#00c0b5" },
    handler(response) {
      const paidAt = Date.now();
      const paid = {
        razorpayPaymentId: response.razorpay_payment_id,
        status: "Paid",
        paidAt
      };
      ordersRef.get(orderId).put(paid);
      adminOrders.get(orderId).put({ ...paid, username });
      cartRef.map().once((_, id) => cartRef.get(id).put(null));
      alert("✅ Payment successful! Redirecting to My Orders…");
      window.location.href = "myorders.html";
    }
  };

  new Razorpay(options).open();
}

// 6. Init
document.addEventListener("DOMContentLoaded", renderLoginStatus);
