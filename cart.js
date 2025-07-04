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
  });

  setTimeout(() => {
    if (container.innerHTML.trim() === '') {
      container.innerHTML = '<p class="empty-msg">Your cart is empty.</p>';
      document.getElementById("grandTotal").textContent = "Grand Total: ₹0";
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


// Razorpay Checkout with Full Shipping + “Pending” → “Paid” Flow
window.startPayment = async function () {
  const cartItems = Object.values(items);
  if (cartItems.length === 0) {
    alert("🛒 Your cart is empty.");
    return;
  }

  // 1. Collect & validate shipping info
  const name = document.getElementById("name")?.value.trim();
  const phone = document.getElementById("phone")?.value.trim();
  const email = document.getElementById("email")?.value.trim();
  const address = document.getElementById("address")?.value.trim();
  const country = document.getElementById("country")?.value.trim();
  const pincode = document.getElementById("pincode")?.value.trim();

  if (!name || !phone || !email || !address || !country || !pincode) {
    alert("🚨 Please fill all shipping details before payment.");
    return;
  }

  const shipping = { name, phone, email, address, country, pincode };
  const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const orderId = Date.now().toString();

  // 2. Save “Pending” order to user & admin nodes
  const pendingOrder = {
    items: cartItems,
    shipping,
    total: totalAmount,
    status: "Pending",
    createdAt: Date.now()
  };
  ordersRef.get(orderId).put(pendingOrder);
  adminOrders.get(orderId).put({ ...pendingOrder, username });

  // 3. (Optional) Create a Razorpay Order server-side for better security
  //    You need an endpoint /api/createOrder that returns { id: razorpay_order_id, ... }
  let razorOrder;
  try {
    const resp = await fetch("/api/createOrder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: totalAmount * 100, receipt: orderId })
    });
    razorOrder = await resp.json();
  } catch (e) {
    console.warn("Could not create server-side order, falling back to client-only");
  }

  // 4. Configure & open Razorpay Checkout
  const options = {
    key: "rzp_live_ozWo08bXwqssx3",    // your test/live key
    amount: totalAmount * 100,         // in paise
    currency: "INR",
    name: "MACX Marketplace",
    description: "Cart Checkout Payment",
    order_id: razorOrder?.id,          // only if server-generated
    prefill: {
      name: shipping.name,
      email: shipping.email,
      contact: shipping.phone.startsWith("+")
        ? shipping.phone
        : `+91${shipping.phone}`
    },
    notes: {
      items: JSON.stringify(cartItems),
      address: `${shipping.address}, ${shipping.pincode}, ${shipping.country}`
    },
    theme: { color: "#00c0b5" },
    handler(response) {
      // 5. Update “Pending” → “Paid”
      ordersRef.get(orderId).put({
        razorpayPaymentId: response.razorpay_payment_id,
        status: "Paid",
        paidAt: Date.now()
      });
      adminOrders.get(orderId).get(username).put({
        razorpayPaymentId: response.razorpay_payment_id,
        status: "Paid",
        paidAt: Date.now()
      });

      // 6. Clear the cart
      cartRef.map().once((_, id) => cartRef.get(id).put(null));

      alert("✅ Payment successful! Redirecting to My Orders…");
      window.location.href = "myorders.html";
    }
  };

  const rzp = new Razorpay(options);
  rzp.open();
};

// Render login status, wire up form on page load
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
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      startPayment();
    });
  } else {
    console.warn("Shipping form not found in DOM.");
  }
}

document.addEventListener("DOMContentLoaded", renderLoginStatus);


  
  
      
    
