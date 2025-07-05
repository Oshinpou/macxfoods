const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);
const username = localStorage.getItem("macx_loggedInUser");
const cartRef = gun.get('macx_cart').get(username);
const ordersRef = gun.get("macx_orders").get(username);
const adminOrders = gun.get("admin_orders");

let items = {};

function logout() {
  localStorage.removeItem("macx_loggedInUser");
  location.reload();
}

function renderLoginStatus() {
  if (!username) {
    document.getElementById("notLoggedIn").style.display = "block";
    return;
  }
  document.getElementById("loggedInSection").style.display = "block";
  document.getElementById("userDisplay").textContent = `Welcome, ${username}`;
  listenToCart();
}

function listenToCart() {
  const container = document.getElementById("cartItems");
  items = {};
  container.innerHTML = "";

  cartRef.map().on((data, id) => {
    if (!data || !data.productName) {
      delete items[id];
      const existing = container.querySelector(`[data-id="${id}"]`);
      if (existing) existing.remove();
      updateGrandTotal();
      updateCartSummary();
      return;
    }

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

  setTimeout(() => {
    if (container.innerHTML.trim() === '') {
      container.innerHTML = '<p class="empty-msg">Your cart is empty.</p>';
      document.getElementById("grandTotal").textContent = "Grand Total: ₹0";
      updateCartSummary();
    }
  }, 1500);
}

function updateGrandTotal() {
  let total = 0;
  Object.values(items).forEach(item => {
    const price = parseInt(item.price) || 0;
    const qty = parseInt(item.quantity) || 1;
    total += price * qty;
  });
  document.getElementById("grandTotal").textContent = `Grand Total: ₹${total}`;
}

function updateCartSummary() {
  const summaryEl = document.getElementById("cartSummary");
  const lines = Object.values(items).map(item => {
    const sub = item.quantity * item.price;
    return `${item.productName}: ₹${item.price} × ${item.quantity} = ₹${sub}`;
  });
  summaryEl.innerHTML = lines.length
    ? lines.join("<br>")
    : "<em>Your cart is empty.</em>";
}

function updateQty(id, input) {
  const newQty = Math.max(1, parseInt(input.value) || 1);
  cartRef.get(id).once(data => {
    if (!data) return;
    cartRef.get(id).put({ ...data, quantity: newQty });
  });
}

function changeQty(id, delta) {
  cartRef.get(id).once(data => {
    if (!data) return;
    const currentQty = parseInt(data.quantity) || 1;
    const newQty = Math.max(1, currentQty + delta);
    cartRef.get(id).put({ ...data, quantity: newQty });
  });
}

function removeItem(id) {
  cartRef.get(id).put(null);
}

// 1) Razorpay checkout logic only
async function startPayment() {
  const cartArray = Object.values(items || {});
  if (!cartArray.length) return alert("🛒 Your cart is empty.");

  const get = id => document.getElementById(id)?.value.trim();
  const [name, phone, email, address, country, pincode] =
    ["name", "phone", "email", "address", "country", "pincode"].map(get);
  if (![name, phone, email, address, country, pincode].every(Boolean)) {
    return alert("🚨 Please fill all shipping details.");
  }

  const totalAmount = cartArray.reduce((sum, i) =>
    sum + (parseInt(i.price) || 0) * (parseInt(i.quantity) || 1), 0);
  const orderId = Date.now().toString();

  const pending = {
    items: cartArray,
    shipping: { name, phone, email, address, country, pincode },
    total: totalAmount,
    status: "Pending",
    createdAt: Date.now()
  };

  await Promise.all([
    ordersRef.get(orderId).put(pending),
    adminOrders.get(orderId).put({ ...pending, username })
  ]);

  let razorOrder;
  try {
    const resp = await fetch("/api/createOrder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: totalAmount * 100, receipt: orderId })
    });
    razorOrder = await resp.json();
  } catch (err) {
    console.warn("Server-side order failed, falling back to client-only");
  }

  const summaryText = cartArray
    .map(i => `${i.productName} (qty:${i.quantity}, price:₹${i.price})`)
    .join(" | ");

  const options = {
    key: "rzp_live_ozWo08bXwqssx3",
    amount: totalAmount * 100,
    currency: "INR",
    name: "MACX Marketplace",
    description: `Order #${orderId}`,
    order_id: razorOrder?.id,
    prefill: { name, email, contact: phone },
    notes: {
      shipping_name: name,
      shipping_phone: phone,
      shipping_email: email,
      shipping_address: address,
      shipping_country: country,
      shipping_pincode: pincode,
      cart_items: JSON.stringify(cartArray),
      cart_summary: summaryText
    },
    theme: { color: "#00c0b5" },
    handler(response) {
      const paidAt = Date.now();
      ordersRef.get(orderId).put({
        razorpayPaymentId: response.razorpay_payment_id,
        status: "Paid",
        paidAt
      });
      adminOrders.get(orderId).put({
        razorpayPaymentId: response.razorpay_payment_id,
        status: "Paid",
        paidAt
      });
      cartRef.map().once((_, id) => cartRef.get(id).put(null));
      alert("✅ Payment successful! Redirecting…");
      window.location.href = "myorders.html";
    }
  };

  new Razorpay(options).open();
}

// 2) Attach submit listener only after DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  renderLoginStatus();
  const form = document.getElementById("shippingForm");
  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      startPayment();
    });
  }
});
