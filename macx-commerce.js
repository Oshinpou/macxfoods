// macx-commerce.js (Fully Functional and Complete)

const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']); const username = localStorage.getItem("macx_loggedInUser");

if (!username) console.warn("User not logged in. LocalStorage missing 'macx_loggedInUser'");

// ---------- CART FUNCTIONS ----------

function addToCart(id, name, price, image = '', quantity = 1) { if (!username) return alert("Please login first"); const itemNode = gun.get("macx_cart").get(username).get(id); itemNode.once(existing => { const currentQty = existing?.quantity || 0; itemNode.put({ id, name, price, image, quantity: currentQty + quantity }); alert("Added to cart"); }); }

function renderGlobalCartUI(targetId = "cartTable") { const tbody = document.querySelector(#${targetId} tbody); const grandTotalEl = document.getElementById("grandTotal"); if (!username || !tbody) return;

tbody.innerHTML = ""; let total = 0; let hasItems = false;

gun.get("macx_cart").get(username).map().on((item, key) => { if (!item || !item.id) return; hasItems = true; const itemTotal = item.price * item.quantity; total += itemTotal;

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
grandTotalEl.textContent = `Grand Total: ₹${total}`;

});

setTimeout(() => { if (!hasItems) { tbody.innerHTML = <tr><td colspan="5" style="text-align:center;">Cart is empty</td></tr>; grandTotalEl.textContent = Grand Total: ₹0; } }, 1000); }

function bindCartEvents(targetId = "cartTable") { const tbody = document.querySelector(#${targetId} tbody);

tbody.addEventListener("click", e => { if (e.target.matches(".delete-btn")) { const tr = e.target.closest("tr"); const itemId = tr.dataset.id; gun.get("macx_cart").get(username).get(itemId).put(null); } });

tbody.addEventListener("change", e => { if (e.target.matches(".qty-input")) { const tr = e.target.closest("tr"); const itemId = tr.dataset.id; const newQty = Math.max(1, +e.target.value); gun.get("macx_cart").get(username).get(itemId).once(item => { if (!item) return; item.quantity = newQty; gun.get("macx_cart").get(username).get(itemId).put(item); }); } }); }

function loadCartItems(callback) { const cart = []; gun.get("macx_cart").get(username).map().once(item => { if (item?.id) cart.push(item); }); setTimeout(() => callback(cart), 1000); }

// ---------- ORDER PLACEMENT ----------

function placeOrderWithForm(shipping) { if (!username) return alert("Login required"); const cart = []; gun.get("macx_cart").get(username).map().once(item => { if (item?.id) cart.push(item); });

setTimeout(() => { if (!cart.length) return alert("Cart is empty");

const orderId = `MACX-${Date.now()}`;
const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

const orderData = {
  orderId,
  username,
  items: cart,
  shipping,
  total,
  date: new Date().toLocaleString(),
  status: "Payment Done"
};

gun.get("macx_orders").get(username).get(orderId).put(orderData);
gun.get("macx_admin_orders").get(orderId).put(orderData);

// Clear cart
gun.get("macx_cart").get(username).map().once((val, key) => {
  gun.get("macx_cart").get(username).get(key).put(null);
});

alert("Order placed successfully");
window.location.href = "myorders.html";

}, 1000); }

// ---------- EXPORT (optional for debug in console) ----------

window.macxCommerce = { addToCart, renderGlobalCartUI, bindCartEvents, loadCartItems, placeOrderWithForm };

