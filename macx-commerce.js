// GUN SETUP
const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);

// --- CART FUNCTIONS ---

function addToCart(product, quantity = 1) {
  const username = localStorage.getItem("macx_loggedInUser");
  if (!username) return alert("Please login to add items to cart");

  const cartNode = gun.get("macx_cart").get(username).get(product.id);
  cartNode.once(existing => {
    if (existing) {
      cartNode.put({
        ...existing,
        quantity: (existing.quantity || 1) + quantity
      });
    } else {
      cartNode.put({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: quantity
      });
    }
    alert("Product added to cart!");
  });
}

function loadCart(callback) {
  const username = localStorage.getItem("macx_loggedInUser");
  if (!username) return callback([]);

  let cartItems = [];
  gun.get("macx_cart").get(username).map().once(data => {
    if (data && data.id) {
      cartItems.push(data);
    }
  });

  setTimeout(() => callback(cartItems), 800);
}

function removeFromCart(productId) {
  const username = localStorage.getItem("macx_loggedInUser");
  if (!username) return;
  gun.get("macx_cart").get(username).get(productId).put(null);
  alert("Item removed");
}

function clearCart(username) {
  gun.get("macx_cart").get(username).map().once((item, key) => {
    gun.get("macx_cart").get(username).get(key).put(null);
  });
}

// --- ORDER FUNCTIONS ---

function placeOrder(paymentStatus = "Payment Done") {
  const username = localStorage.getItem("macx_loggedInUser");
  if (!username) return alert("Login required");

  let cartItems = [];
  gun.get("macx_cart").get(username).map().once(data => {
    if (data && data.id) cartItems.push(data);
  });

  setTimeout(() => {
    if (!cartItems.length) return alert("Cart is empty!");

    const orderId = `MACX-${Date.now()}`;
    const orderData = {
      orderId,
      username,
      items: cartItems,
      status: paymentStatus,
      date: new Date().toLocaleString()
    };

    gun.get("macx_orders").get(username).get(orderId).put(orderData);
    gun.get("macx_admin_orders").get(orderId).put(orderData);
    clearCart(username);

    alert(`Order placed successfully! ID: ${orderId}`);
    window.location.href = "myorders.html";
  }, 800);
}

function loadUserOrders(callback) {
  const username = localStorage.getItem("macx_loggedInUser");
  if (!username) return callback([]);

  let orders = [];
  gun.get("macx_orders").get(username).map().once(order => {
    if (order && order.orderId) orders.push(order);
  });

  setTimeout(() => callback(orders), 800);
}

function loadAdminOrders(callback) {
  let orders = [];
  gun.get("macx_admin_orders").map().once(order => {
    if (order && order.orderId) orders.push(order);
  });

  setTimeout(() => callback(orders), 800);
}

function cancelOrder(username, orderId) {
  if (
    confirm("Cancel this order? #1") &&
    confirm("Really cancel? #2") &&
    confirm("Still sure? #3") &&
    confirm("Please confirm again #4") &&
    confirm("Final confirmation #5")
  ) {
    gun.get("macx_orders").get(username).get(orderId).get("status").put("Cancelled by Admin");
    gun.get("macx_admin_orders").get(orderId).get("status").put("Cancelled by Admin");
    alert("Order cancelled");
  }
}

function updateOrderStatus(username, orderId, status) {
  gun.get("macx_orders").get(username).get(orderId).get("status").put(status);
  gun.get("macx_admin_orders").get(orderId).get("status").put(status);
  alert("Order status updated");
}

// --- RENDER EXAMPLES ---

function renderCart(cartItems) {
  const cartDiv = document.getElementById("cartContainer");
  cartDiv.innerHTML = "";
  let total = 0;
  cartItems.forEach(item => {
    total += item.price * item.quantity;
    cartDiv.innerHTML += `
      <div>
        <h4>${item.name}</h4>
        <p>₹${item.price} x ${item.quantity}</p>
        <button onclick="removeFromCart('${item.id}')">Remove</button>
      </div>
    `;
  });
  cartDiv.innerHTML += `<h3>Total: ₹${total}</h3><button onclick="simulateRazorpaySuccess()">Place Order</button>`;
}

function renderUserOrders(orders) {
  const ordersDiv = document.getElementById("ordersContainer");
  ordersDiv.innerHTML = "";
  orders.forEach(order => {
    ordersDiv.innerHTML += `
      <div style="border:1px solid #333; margin:10px; padding:10px;">
        <h3>Order ID: ${order.orderId}</h3>
        <p>Status: ${order.status}</p>
        <p>Date: ${order.date}</p>
        <ul>
          ${order.items.map(i => `<li>${i.name} - ₹${i.price} x ${i.quantity}</li>`).join("")}
        </ul>
      </div>
    `;
  });
}

function renderAdminOrders(orders) {
  const adminDiv = document.getElementById("adminOrdersContainer");
  adminDiv.innerHTML = "";
  orders.forEach(order => {
    adminDiv.innerHTML += `
      <div style="border:2px solid #666; margin:10px; padding:10px;">
        <h3>${order.username} - Order ID: ${order.orderId}</h3>
        <p>Status: ${order.status}</p>
        <ul>
          ${order.items.map(i => `<li>${i.name} - ₹${i.price} x ${i.quantity}</li>`).join("")}
        </ul>
        <button onclick="cancelOrder('${order.username}', '${order.orderId}')">Cancel Order</button>
        <button onclick="updateOrderStatus('${order.username}', '${order.orderId}', 'Delivered')">Mark Delivered</button>
      </div>
    `;
  });
}

// --- SIMULATED PAYMENT (Replace with Razorpay integration) ---

function simulateRazorpaySuccess() {
  placeOrder("Payment Done");
      }
