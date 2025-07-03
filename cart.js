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

// Razorpay Order Submit
document.getElementById("shippingForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const cartItems = Object.values(items);
  if (cartItems.length === 0) return alert("Your cart is empty.");

  const totalAmount = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const shipping = {
    name: document.getElementById("name").value,
    phone: document.getElementById("phone").value,
    email: document.getElementById("email").value,
    address: document.getElementById("address").value,
    country: document.getElementById("country").value,
    pincode: document.getElementById("pincode").value
  };

  const orderId = Date.now().toString();

  const razorpayOptions = {
    key: "YOUR_RAZORPAY_KEY_ID", // Replace with your key
    amount: totalAmount * 100,
    currency: "INR",
    name: "MACX Marketplace",
    description: "Cart Purchase",
    handler: function (response) {
      const orderData = {
        items: cartItems,
        total: totalAmount,
        shipping,
        razorpayPaymentId: response.razorpay_payment_id,
        status: "Paid",
        timestamp: Date.now()
      };

      ordersRef.get(orderId).put(orderData);
      adminOrders.get(orderId).put({ ...orderData, username });

      // Clear cart
      cartRef.map().once((_, id) => cartRef.get(id).put(null));

      alert("Payment successful & order placed!");
      window.location.href = "myorders.html";
    },
    prefill: {
      name: shipping.name,
      email: shipping.email,
      contact: shipping.phone
    },
    theme: {
      color: "#00c0b5"
    }
  };

  const rzp = new Razorpay(razorpayOptions);
  rzp.open();
});

// INIT
renderLoginStatus();
