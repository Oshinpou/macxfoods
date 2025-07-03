// cart.js

// ─── Configuration ────────────────────────────────────────────────────────────
// Replace with the URL of your Gun relay server
const GUN_PEERS = [
  'https://your-relay-server.com/gun'
];

// ─── Initialization ───────────────────────────────────────────────────────────
const username  = localStorage.getItem('macx_loggedInUser');
const gun       = Gun({ peers: GUN_PEERS });
const cartRef   = gun.get('macx_cart').get(username);
const ordersRef = gun.get('macx_orders').get(username);
const adminOrders = gun.get('admin_orders');
let items       = [];

// ─── Authentication & UI ──────────────────────────────────────────────────────
function logout() {
  localStorage.removeItem('macx_loggedInUser');
  location.reload();
}

function renderLoginStatus() {
  if (!username) {
    document.getElementById('notLoggedIn').style.display    = 'block';
    document.getElementById('loggedInSection').style.display = 'none';
    return;
  }
  document.getElementById('notLoggedIn').style.display    = 'none';
  document.getElementById('loggedInSection').style.display = 'block';
  document.getElementById('userDisplay').textContent       = `Welcome, ${username}`;
  renderCart();
}

// ─── Cart Rendering & Totals ─────────────────────────────────────────────────
function updateGrandTotal() {
  const total = items.reduce((sum, it) => sum + (it.price * it.quantity), 0);
  document.getElementById('grandTotal').textContent = `Grand Total: ₹${total}`;
}

function renderCart() {
  const container = document.getElementById('cartItems');
  container.innerHTML = '';
  items = [];

  // subscribe to every change in this user’s cart
  cartRef.map().on((item, id) => {
    // handle deletions
    if (!item) {
      const gone = container.querySelector(`[data-id="${id}"]`);
      if (gone) gone.remove();
      items = items.filter(i => i.id !== id);
      updateGrandTotal();
      return;
    }

    // push or replace in items[]
    const existingIndex = items.findIndex(i => i.id === id);
    const entry = { ...item, id };
    if (existingIndex > -1) {
      items[existingIndex] = entry;
    } else {
      items.push(entry);
    }

    // build or update the DOM node
    let node = container.querySelector(`[data-id="${id}"]`);
    if (!node) {
      node = document.createElement('div');
      node.setAttribute('data-id', id);
      container.appendChild(node);
    }

    node.innerHTML = `
      <img src="${item.image}" alt="Product" style="height:60px;margin-right:10px;">
      <div class="product-info">
        <p><strong>${item.productName}</strong><br>₹${item.price}</p>
        <div class="qty-controls">
          <button onclick="changeQty('${id}', -1)">-</button>
          <input class="qty-input" type="number" value="${item.quantity}" min="1"
                 onchange="updateQuantity('${id}', this)">
          <button onclick="changeQty('${id}', 1)">+</button>
        </div>
        <div class="item-summary">Subtotal: ₹${item.price * item.quantity}</div>
      </div>
      <button class="remove-btn" onclick="removeItem('${id}')">Remove</button>
    `;

    updateGrandTotal();
  });
}

// ─── Quantity Management ─────────────────────────────────────────────────────
function updateQuantity(id, input) {
  const newQty = parseInt(input.value);
  if (isNaN(newQty) || newQty < 1) return;
  cartRef.get(id).once(data => {
    if (!data) return;
    cartRef.get(id).put({ ...data, quantity: newQty });
  });
}

function changeQty(id, delta) {
  cartRef.get(id).once(data => {
    if (!data) return;
    const qty = Math.max(1, (data.quantity || 1) + delta);
    cartRef.get(id).put({ ...data, quantity: qty });
  });
}

// ─── Remove Item ──────────────────────────────────────────────────────────────
function removeItem(id) {
  cartRef.get(id).put(null);
}

// ─── Place Order ──────────────────────────────────────────────────────────────
document.getElementById('shippingForm').addEventListener('submit', e => {
  e.preventDefault();
  if (items.length === 0) return alert('Cart is empty');

  // calculate total
  const total = items.reduce((sum, it) => sum + (it.price * it.quantity), 0);

  // collect shipping info
  const shipping = ['name','phone','email','address','country','pincode']
    .reduce((obj, key) => {
      obj[key] = document.getElementById(key).value;
      return obj;
    }, {});

  const orderId = Date.now().toString();
  const options = {
    key: 'YOUR_RAZORPAY_KEY_ID',
    amount: total * 100,
    currency: 'INR',
    name: 'MACX Cosmetics',
    description: 'Order Payment',
    handler(response) {
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

      // clear cart
      cartRef.map().once((_, id) => cartRef.get(id).put(null));
      alert('Order placed successfully!');
      window.location.href = 'myorders.html';
    },
    prefill: {
      name: shipping.name,
      email: shipping.email,
      contact: shipping.phone
    },
    theme: { color: '#00c0b5' }
  };

  new Razorpay(options).open();
});

// ─── Kickoff ─────────────────────────────────────────────────────────────────
renderLoginStatus();
```
