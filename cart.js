// cart.js — MACX Fully Functional Cart Logic
console.log("🚀 cart.js loaded");

// GUN setup
const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);
const username = localStorage.getItem('macx_loggedInUser');

const cartRef = gun.get('macx_cart').get(username);
const ordersRef = gun.get('macx_orders').get(username);
const adminOrders = gun.get('admin_orders');

let items = [];

function logout() {
  localStorage.removeItem('macx_loggedInUser');
  location.reload();
}

function renderLoginStatus() {
  if (!username) {
    document.getElementById('notLoggedIn').style.display = 'block';
    return;
  }

  document.getElementById('notLoggedIn').style.display = 'none';
  document.getElementById('loggedInSection').style.display = 'block';
  document.getElementById('userDisplay').textContent = `Welcome, ${username}`;

  renderCart();
}

function updateGrandTotal() {
  let total = 0;

  cartRef.map().once((item, id) => {
    if (!item || !item.price || !item.quantity) return;

    const qty = parseInt(item.quantity || 1, 10);
    const price = parseFloat(item.price || 0);

    total += qty * price;

    const subtotalElem = document.getElementById(`subtotal-${id}`);
    if (subtotalElem) {
      subtotalElem.textContent = `Subtotal: ₹${qty * price}`;
    }
  });

  setTimeout(() => {
    document.getElementById('grandTotal').textContent = `Grand Total: ₹${total}`;
  }, 1000);
}

function renderCart() {
  const container = document.getElementById('cartItems');
  container.innerHTML = '';
  items = [];

  cartRef.map().on((item, id) => {
    if (!item || !item.productName) {
      const gone = container.querySelector(`[data-id="${id}"]`);
      if (gone) gone.remove();
      items = items.filter(x => x.id !== id);
      updateGrandTotal();
      return;
    }

    const qty = parseInt(item.quantity || 1, 10);
    const product = { ...item, id, quantity: qty };
    const existingIndex = items.findIndex(x => x.id === id);

    if (existingIndex >= 0) items[existingIndex] = product;
    else items.push(product);

    let div = container.querySelector(`[data-id="${id}"]`);
    if (!div) {
      div = document.createElement('div');
      div.setAttribute('data-id', id);
      container.appendChild(div);
    }

    div.innerHTML = `
      <img src="${item.image}" alt="${item.productName}" style="height:60px;margin-right:10px;">
      <div class="product-info">
        <p><strong>${item.productName}</strong><br>₹${item.price}</p>
        <div class="qty-controls">
          <button onclick="changeQty('${id}', -1)">-</button>
          <input class="qty-input" type="number" min="1" value="${qty}" onchange="updateQuantity('${id}', this)">
          <button onclick="changeQty('${id}', 1)">+</button>
        </div>
        <div class="item-summary" id="subtotal-${id}">Subtotal: ₹${item.price * qty}</div>
      </div>
      <button class="remove-btn" onclick="removeItem('${id}')">Remove</button>
    `;

    updateGrandTotal();
  });

  setTimeout(() => {
    if (container.innerHTML.trim() === "") {
      container.innerHTML = '<p class="empty-msg">Your cart is empty.</p>';
      document.getElementById('grandTotal').textContent = "Grand Total: ₹0";
    }
  }, 1200);
}

window.updateQuantity = function (id, input) {
  const newQty = parseInt(input.value, 10);
  if (!newQty || newQty < 1) return;

  cartRef.get(id).once(item => {
    if (!item) return;
    cartRef.get(id).put({ ...item, quantity: newQty }, () => {
      document.getElementById(`subtotal-${id}`).textContent = `Subtotal: ₹${item.price * newQty}`;
      updateGrandTotal();
    });
  });
};

window.changeQty = function (id, delta) {
  cartRef.get(id).once(item => {
    if (!item) return;
    const newQty = Math.max(1, (item.quantity || 1) + delta);
    cartRef.get(id).put({ ...item, quantity: newQty });
  });
};

window.removeItem = function (id) {
  cartRef.get(id).put(null);
};

// Payment and Order Submission
document.getElementById('shippingForm').addEventListener('submit', function (e) {
  e.preventDefault();
  if (items.length === 0) return alert('Cart is empty');

  const total = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);

  const shipping = {
    name: document.getElementById('name').value,
    phone: document.getElementById('phone').value,
    email: document.getElementById('email').value,
    address: document.getElementById('address').value,
    country: document.getElementById('country').value,
    pincode: document.getElementById('pincode').value
  };

  const orderId = Date.now().toString();

  const options = {
    key: 'YOUR_RAZORPAY_KEY_ID', // replace with your Razorpay key
    amount: total * 100,
    currency: 'INR',
    name: 'MACX Marketplace',
    description: 'Order Payment',
    handler: function (response) {
      const order = {
        shipping,
        items,
        total,
        status: 'Paid',
        razorpayPaymentId: response.razorpay_payment_id,
        timestamp: Date.now()
      };

      ordersRef.get(orderId).put(order);
      adminOrders.get(orderId).put({ ...order, username });

      // Clear cart
      cartRef.map().once((data, id) => {
        cartRef.get(id).put(null);
      });

      alert("Order placed successfully!");
      window.location.href = "myorders.html";
    },
    prefill: {
      name: shipping.name,
      email: shipping.email,
      contact: shipping.phone
    },
    theme: { color: '#00c0b5' }
  };

  const rzp = new Razorpay(options);
  rzp.open();
});

renderLoginStatus();
