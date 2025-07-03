// cart.js

// CONFIG — use a known public peer for now to ensure connectivity
const RELAY = 'https://gun-manhattan.herokuapp.com/gun';

console.log('🛠️ cart.js loaded');

const username = localStorage.getItem('macx_loggedInUser');
console.log('🔐 username:', username);

const gun = Gun({ peers: [RELAY] });
console.log('🌐 Gun peers:', gun._.opt.peers);

// Log every “hi” handshake
Gun.on('hi', peer => console.log('🤝 hi from peer', peer.opt.url));

const cartRef     = gun.get('macx_cart').get(username);
const ordersRef   = gun.get('macx_orders').get(username);
const adminOrders = gun.get('admin_orders');
let items = [];

window.logout = () => {
  console.log('🚪 logging out');
  localStorage.removeItem('macx_loggedInUser');
  location.reload();
};

function renderLoginStatus() {
  console.log('🔄 renderLoginStatus called');
  if (!username) {
    console.warn('⚠️ no username, showing login');
    document.getElementById('notLoggedIn').style.display = 'block';
    return;
  }
  console.log('✅ username found, showing cart UI');
  document.getElementById('notLoggedIn').style.display    = 'none';
  document.getElementById('loggedInSection').style.display = 'block';
  document.getElementById('userDisplay').textContent       = `Welcome, ${username}`;
  renderCart();
}

function updateGrandTotal() {
  let total = 0;

  // Fetch fresh from GUN instead of using stale local `items`
  cartRef.map().once((item, id) => {
    if (!item || !item.price || !item.quantity) return;

    const qty = parseInt(item.quantity || 1, 10);
    const price = parseFloat(item.price || 0);

    total += qty * price;

    // Also update the individual subtotal in DOM if exists
    const subtotalElem = document.getElementById(`subtotal-${id}`);
    if (subtotalElem) {
      subtotalElem.textContent = `Subtotal: ₹${qty * price}`;
    }
  });

  // Wait briefly to ensure all `.once` have resolved before updating grand total
  setTimeout(() => {
    document.getElementById('grandTotal').textContent = `Grand Total: ₹${total}`;
    console.log('💰 Updated grand total: ₹', total);
  }, 1000);
}

// Debug-enhanced renderCart
function renderCart() {
  console.log('🛒 renderCart() subscription starting…');
  const container = document.getElementById('cartItems');
  container.innerHTML = '';
  items = [];

  cartRef.map().on((item, id) => {
    console.log('📥 cartRef.on → id:', id, 'item:', item);

    if (!item) {
      console.log('❌ item deleted:', id);
      const gone = container.querySelector(`[data-id="${id}"]`);
      if (gone) gone.remove();
      items = items.filter(x => x.id !== id);
      updateGrandTotal();
      return;
    }

    const qty = parseInt(item.quantity || 1, 10);
    const entry = { ...item, id, quantity: qty };
    const idx = items.findIndex(x => x.id === id);
    if (idx >= 0) items[idx] = entry;
    else items.push(entry);

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
          <input type="number" value="${qty}" min="1"
                 onchange="updateQuantity('${id}', this)" />
          <button onclick="changeQty('${id}', 1)">+</button>
        </div>
        <div class="item-summary" id="subtotal-${id}">
          Subtotal: ₹${item.price * qty}
        </div>
      </div>
      <button onclick="removeItem('${id}')">Remove</button>
    `;
    updateGrandTotal();
  });
}

window.updateQuantity = (id, input) => {
  const newQty = parseInt(input.value, 10);
  if (!newQty || newQty < 1) return;

  cartRef.get(id).once(data => {
    const updated = { ...data, quantity: newQty };
    cartRef.get(id).put(updated, () => {
      console.log('🔄 Quantity updated:', id, newQty);
      updateGrandTotal();
    });
  });
};

window.changeQty = (id, delta) => {
  console.log('➕/➖ changeQty', id, delta);
  cartRef.get(id).once(data => {
    const q = Math.max(1, (data.quantity || 1) + delta);
    cartRef.get(id).put({ ...data, quantity: q });
  });
};

window.removeItem = id => {
  console.log('🗑️ removeItem', id);
  cartRef.get(id).put(null);
};

// Dummy “put” button so you can manually test replication
// (opens console in Browser A, click “Test Put”, then watch Console in B)
const testBtn = document.createElement('button');
testBtn.textContent = 'Test Put';
testBtn.onclick = () => {
  console.log('🔧 doing test put to /test');
  gun.get('test').put({ hi: Date.now() });
};
document.body.prepend(testBtn);

gun.get('test').on(msg =>
  console.log('🔄 got test update:', msg)
);

document.getElementById('shippingForm')
  .addEventListener('submit', e => {
    e.preventDefault();
    console.log('📝 submitting order…', items);
    // no changes here, we just log for now
  });

renderLoginStatus();
    
