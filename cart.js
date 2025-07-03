// cart.js
document.addEventListener('DOMContentLoaded', () => {
  // ——— CONFIG: replace with your Gun relay server URL ———
  const RELAY = 'https://YOUR_RELAY_URL/gun';

  // ——— Init Gun with shared peer ———
  const username    = localStorage.getItem('macx_loggedInUser');
  const gun         = Gun({ peers: [RELAY] });
  const cartRef     = gun.get('macx_cart').get(username);
  const ordersRef   = gun.get('macx_orders').get(username);
  const adminOrders = gun.get('admin_orders');
  let items = [];

  // ——— UI Helpers ———
  window.logout = () => {
    localStorage.removeItem('macx_loggedInUser');
    location.reload();
  };

  function renderLoginStatus() {
    if (!username) {
      document.getElementById('notLoggedIn').style.display = 'block';
      return;
    }
    document.getElementById('notLoggedIn').style.display    = 'none';
    document.getElementById('loggedInSection').style.display = 'block';
    document.getElementById('userDisplay').textContent       = `Welcome, ${username}`;
    renderCart();
  }

  function updateGrandTotal() {
    const total = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    document.getElementById('grandTotal').textContent = `Grand Total: ₹${total}`;
  }

  // ——— Render + Sync Cart ———
  function renderCart() {
    const container = document.getElementById('cartItems');
    container.innerHTML = '';
    items = [];

    cartRef.map().on((item, id) => {
      // If item deleted
      if (!item) {
        const gone = container.querySelector(`[data-id="${id}"]`);
        if (gone) gone.remove();
        items = items.filter(x => x.id !== id);
        updateGrandTotal();
        return;
      }

      // Normalize + store locally
      const qty = parseInt(item.quantity || 1, 10);
      const entry = { ...item, id, quantity: qty };
      const idx   = items.findIndex(x => x.id === id);
      if (idx >= 0) items[idx] = entry;
      else items.push(entry);

      // Build/update DOM node
      let node = container.querySelector(`[data-id="${id}"]`);
      if (!node) {
        node = document.createElement('div');
        node.setAttribute('data-id', id);
        container.appendChild(node);
      }

      node.innerHTML = `
        <img src="${item.image}" alt="${item.productName}">
        <div class="product-info">
          <p><strong>${item.productName}</strong><br>₹${item.price}</p>
          <div class="qty-controls">
            <button onclick="changeQty('${id}', -1)">-</button>
            <input class="qty-input" type="number" value="${qty}" min="1"
                   onchange="updateQuantity('${id}', this)" />
            <button onclick="changeQty('${id}', 1)">+</button>
          </div>
          <div class="item-summary" id="subtotal-${id}">
            Subtotal: ₹${item.price * qty}
          </div>
        </div>
        <button class="remove-btn" onclick="removeItem('${id}')">Remove</button>
      `;
      updateGrandTotal();
    });
  }

  // ——— Quantity Controls ———
  window.updateQuantity = (id, input) => {
    const q = parseInt(input.value, 10);
    if (!q || q < 1) return;
    cartRef.get(id).once(data => {
      if (!data) return;
      cartRef.get(id).put({ ...data, quantity: q });
      document.getElementById(`subtotal-${id}`)
              .textContent = `Subtotal: ₹${data.price * q}`;
      updateGrandTotal();
    });
  };

  window.changeQty = (id, delta) => {
    cartRef.get(id).once(data => {
      if (!data) return;
      const q = Math.max(1, (data.quantity || 1) + delta);
      cartRef.get(id).put({ ...data, quantity: q });
    });
  };

  // ——— Remove Item ———
  window.removeItem = id => cartRef.get(id).put(null);

  // ——— Place Order ———
  document.getElementById('shippingForm').addEventListener('submit', e => {
    e.preventDefault();
    if (items.length === 0) return alert('Cart is empty');

    const total = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const shipping = ['name','phone','email','address','country','pincode']
      .reduce((o, k) => (o[k] = document.getElementById(k).value, o), {});

    const orderId = Date.now().toString();
    new Razorpay({
      key: 'YOUR_RAZORPAY_KEY_ID',
      amount: total * 100,
      currency: 'INR',
      name: 'MACX Cosmetics',
      description: 'Order Payment',
      handler(res) {
        const order = {
          shipping, items, total,
          status: 'Paid',
          razorpayPaymentId: res.razorpay_payment_id,
          timestamp: Date.now()
        };
        ordersRef.get(orderId).put(order);
        adminOrders.get(orderId).put({ ...order, username });

        // clear cart
        cartRef.map().once((_, id) => cartRef.get(id).put(null));
        alert('Order placed successfully!');
        window.location.href = 'myorders.html';
      },
      prefill: { name: shipping.name, email: shipping.email, contact: shipping.phone },
      theme: { color: '#00c0b5' }
    }).open();
  });

  renderLoginStatus();
});
                     
