// macx-commerce.js (Updated & Fully Functional)

const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);
const username = localStorage.getItem("macx_loggedInUser");

if (!username) console.warn("User not logged in. LocalStorage missing 'macx_loggedInUser'");

// ------------------------ CART FUNCTIONS ------------------------ //

function addToCart(productId) {
  if (!username) return alert("Login required");

  // Define your product list (same as marketplace)
  const products = [
    { id: 'p1', name: 'Cosmetic Cream', price: 1200 },
    { id: 'p2', name: 'Skin Serum', price: 1800 },
    { id: 'p3', name: 'Luxury Lipstick', price: 900 }
  ];

  const product = products.find(p => p.id === productId);
  if (!product) return alert("Product not found");

  const cartRef = gun.get("macx_cart").get(username).get(productId);
  cartRef.once(existing => {
    const currentQty = existing?.quantity || 0;
    cartRef.put({ ...product, quantity: currentQty + 1 });
    alert("Added to cart");
  });
}

function renderGlobalCartUI(targetId = "cartTable") {
  const tbody = document.querySelector(`#${targetId} tbody`);
  const grandTotalEl = document.getElementById("grandTotal");
  if (!username || !tbody) return;

  tbody.innerHTML = "";
  let total = 0;
  let hasItems = false;

  gun.get("macx_cart").get(username).map().once((item, key) => {
    if (!item || !item.id) return;
    hasItems = true;
    const itemTotal = item.price * item.quantity;
    total += itemTotal;

    const row = document.createElement("tr");
    row.setAttribute("data-id", key);
    row.innerHTML = `
      <td>${item.name}</td>
      <td>₹${item.price}</td>
      <td><input class="qty-input" type="number" min="1" value="${item.quantity}" style="width:50px" /></td>
      <td>₹${itemTotal}</td>
      <td><button class="delete-btn">Delete</button></td>
    `;
    tbody.appendChild(row);
  });

  setTimeout(() => {
    grandTotalEl.textContent = `Grand Total: ₹${total}`;
    if (!hasItems) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Cart is empty</td></tr>`;
      grandTotalEl.textContent = `Grand Total: ₹0`;
    }
  }, 800);
}

function bindCartEvents(targetId = "cartTable") {
  const tbody = document.querySelector(`#${targetId} tbody`);

  tbody.addEventListener("click", e => {
    if (e.target.matches(".delete-btn")) {
      const tr = e.target.closest("tr");
      const itemId = tr.dataset.id;
      gun.get("macx_cart").get(username).get(itemId).put(null);
    }
  });

  tbody.addEventListener("change", e => {
    if (e.target.matches(".qty-input")) {
      const tr = e.target.closest("tr");
      const itemId = tr.dataset.id;
      const newQty = Math.max(1, +e.target.value);
      gun.get("macx_cart").get(username).get(itemId).once(item => {
        if (!item) return;
        item.quantity = newQty;
        gun.get("macx_cart").get(username).get(itemId).put(item);
      });
    }
  });
}

function placeOrderWithForm(shipping) {
  if (!username) return alert("Not logged in");

  const cartItems = [];
  gun.get("macx_cart").get(username).map().once(item => {
    if (item?.id) cartItems.push(item);
  });

  setTimeout(() => {
    if (!cartItems.length) return alert("Cart is empty");

    const orderId = `MACX-${Date.now()}`;
    const orderData = {
      orderId,
      username,
      items: cartItems,
      shipping,
      status: "Payment Done",
      total: cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
      date: new Date().toLocaleString()
    };

    gun.get("macx_orders").get(username).get(orderId).put(orderData);
    gun.get("macx_admin_orders").get(orderId).put(orderData);

    // Clear Cart
    gun.get("macx_cart").get(username).map().once((_, key) => {
      gun.get("macx_cart").get(username).get(key).put(null);
    });

    alert("Order placed successfully");
    window.location.href = "myorders.html";
  }, 800);
}

function initCartPage() {
  renderGlobalCartUI();
  bindCartEvents();
}

// Export for console testing and other pages
window.macxCommerce = {
  addToCart,
  renderGlobalCartUI,
  bindCartEvents,
  placeOrderWithForm,
  initCartPage
};
