// GUN SETUP
const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);
const cartDB = gun.get('macx_cart');
const ordersDB = gun.get('macx_orders');
const adminOrdersDB = gun.get('macx_admin_orders');

// ADD TO CART
function addToCart(id, productList) {
  const username = localStorage.getItem("macx_loggedInUser");
  if (!username) return alert("Please log in first");

  cartDB.get(username).once(cart => {
    cart = cart ? JSON.parse(cart) : [];
    let item = cart.find(p => p.id === id);
    if (item) {
      item.quantity += 1;
    } else {
      const prod = productList.find(p => p.id === id);
      if (prod) cart.push({ ...prod, quantity: 1 });
    }
    cartDB.get(username).put(JSON.stringify(cart));
    alert("Added to cart");
  });
}

// LOAD CART
function loadCart(renderCallback) {
  const username = localStorage.getItem("macx_loggedInUser");
  if (!username) return renderCallback([]);

  cartDB.get(username).once(cart => {
    cart = cart ? JSON.parse(cart) : [];
    renderCallback(cart);
  });
}

// REMOVE FROM CART
function removeFromCart(id) {
  const username = localStorage.getItem("macx_loggedInUser");
  if (!username) return;

  cartDB.get(username).once(cart => {
    cart = cart ? JSON.parse(cart) : [];
    cart = cart.filter(p => p.id !== id);
    cartDB.get(username).put(JSON.stringify(cart));
    loadCart(renderCart); // Re-render if you have a renderCart function
  });
}

// PLACE ORDER
function placeOrder(paymentStatus = "Pending") {
  const username = localStorage.getItem("macx_loggedInUser");
  if (!username) return alert("Please log in");

  cartDB.get(username).once(cart => {
    cart = cart ? JSON.parse(cart) : [];
    if (cart.length === 0) return alert("Cart is empty");

    const orderId = `MACX-${Date.now()}`;
    const newOrder = {
      orderId,
      items: cart,
      status: paymentStatus,
      date: new Date().toLocaleString()
    };

    // Save in user orders
    ordersDB.get(username).once(userOrders => {
      userOrders = userOrders ? JSON.parse(userOrders) : [];
      userOrders.push(newOrder);
      ordersDB.get(username).put(JSON.stringify(userOrders));
    });

    // Save in admin orders
    adminOrdersDB.once(adminOrders => {
      adminOrders = adminOrders ? JSON.parse(adminOrders) : [];
      adminOrders.push({ username, ...newOrder });
      adminOrdersDB.put(JSON.stringify(adminOrders));
    });

    // Clear cart
    cartDB.get(username).put(JSON.stringify([]));
    alert("Order placed successfully!");
    window.location.href = "myorders.html";
  });
}

// LOAD USER ORDERS
function loadUserOrders(renderCallback) {
  const username = localStorage.getItem("macx_loggedInUser");
  if (!username) return renderCallback([]);

  ordersDB.get(username).once(userOrders => {
    userOrders = userOrders ? JSON.parse(userOrders) : [];
    renderCallback(userOrders);
  });
}

// LOAD ADMIN ORDERS
function loadAdminOrders(renderCallback) {
  adminOrdersDB.once(adminOrders => {
    adminOrders = adminOrders ? JSON.parse(adminOrders) : [];
    renderCallback(adminOrders);
  });
}

// CANCEL ORDER (admin with 5 confirmations)
function cancelOrder(username, orderId) {
  if (
    confirm("Confirm cancel #1") &&
    confirm("Confirm cancel #2") &&
    confirm("Confirm cancel #3") &&
    confirm("Confirm cancel #4") &&
    confirm("Confirm cancel #5")
  ) {
    ordersDB.get(username).once(userOrders => {
      userOrders = userOrders ? JSON.parse(userOrders) : [];
      userOrders = userOrders.map(o => {
        if (o.orderId === orderId) o.status = "Cancelled by Admin";
        return o;
      });
      ordersDB.get(username).put(JSON.stringify(userOrders));
    });

    adminOrdersDB.once(adminOrders => {
      adminOrders = adminOrders ? JSON.parse(adminOrders) : [];
      adminOrders = adminOrders.map(o => {
        if (o.orderId === orderId && o.username === username) {
          o.status = "Cancelled by Admin";
        }
        return o;
      });
      adminOrdersDB.put(JSON.stringify(adminOrders));
    });

    alert("Order cancelled");
  }
}

// UPDATE ORDER STATUS (admin)
function updateOrderStatus(username, orderId, newStatus) {
  ordersDB.get(username).once(userOrders => {
    userOrders = userOrders ? JSON.parse(userOrders) : [];
    userOrders = userOrders.map(o => {
      if (o.orderId === orderId) o.status = newStatus;
      return o;
    });
    ordersDB.get(username).put(JSON.stringify(userOrders));
  });

  adminOrdersDB.once(adminOrders => {
    adminOrders = adminOrders ? JSON.parse(adminOrders) : [];
    adminOrders = adminOrders.map(o => {
      if (o.orderId === orderId && o.username === username) {
        o.status = newStatus;
      }
      return o;
    });
    adminOrdersDB.put(JSON.stringify(adminOrders));
  });

  alert("Order status updated");
}

// Example Razorpay redirect simulation
function simulatePaymentAndPlaceOrder() {
  // Integrate Razorpay API here and on success call placeOrder("Payment Done")
  placeOrder("Payment Done");
}
