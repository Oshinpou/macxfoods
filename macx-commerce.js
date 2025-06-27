// macx-commerce.js (Updated and Debugged)

const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']); const username = localStorage.getItem("macx_loggedInUser");

if (!username) console.warn("User not logged in. LocalStorage missing 'macx_loggedInUser'");

// ---------- CART ---------- function addToCart(product, quantity = 1) { if (!username) return alert("Login required"); const node = gun.get("macx_cart").get(username).get(product.id); node.once(existing => { const currentQty = existing?.quantity || 0; node.put({ ...product, quantity: currentQty + quantity }); alert("Added to cart"); }); }

function loadCart(callback) { const items = []; gun.get("macx_cart").get(username).map().once(data => { if (data?.id) items.push(data); }); setTimeout(() => callback(items), 800); }

function removeFromCart(productId) { gun.get("macx_cart").get(username).get(productId).put(null); alert("Item removed"); }

function updateCartItemQty(productId, qty) { gun.get("macx_cart").get(username).get(productId).once(item => { if (!item) return; item.quantity = qty; gun.get("macx_cart").get(username).get(productId).put(item); }); }

function clearCart() { gun.get("macx_cart").get(username).map().once((val, key) => { gun.get("macx_cart").get(username).get(key).put(null); }); }

function renderGlobalCartUI(targetId = "cartTable") { const tbody = document.querySelector(#${targetId} tbody); if (!tbody) return; tbody.innerHTML = ""; let total = 0; let hasItems = false;

gun.get("macx_cart").get(username).map().on((item, key) => { if (!item) return; hasItems = true; const row = document.createElement("tr"); row.dataset.id = key; row.innerHTML =  <td>${sanitize(item.name)}</td> <td>₹${item.price}</td> <td><input class="qty-input" type="number" min="1" value="${item.quantity}" style="width:50px"></td> <td>₹${item.price * item.quantity}</td> <td><button class="delete-btn">Delete</button></td>; tbody.appendChild(row); total += item.price * item.quantity; });

setTimeout(() => { if (!hasItems) { tbody.innerHTML = <tr><td colspan="5" style="text-align:center; padding:20px;">Your bag is feeling lonely!</td></tr>; } document.getElementById("grandTotal").textContent = Grand Total: ₹${total}; togglePlaceBtn(); }, 1000); }

function sanitize(str) { return String(str).replace(/[&<>"']/g, c => ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": ''' })[c]); }

function bindCartEvents() { const tbody = document.querySelector("#cartTable tbody");

tbody.addEventListener("change", e => { if (e.target.classList.contains("qty-input")) { const tr = e.target.closest("tr[data-id]"); const id = tr.dataset.id; const qty = Math.max(1, parseInt(e.target.value)); updateCartItemQty(id, qty); } });

tbody.addEventListener("click", e => { if (e.target.classList.contains("delete-btn")) { const tr = e.target.closest("tr[data-id]"); const id = tr.dataset.id; removeFromCart(id); } }); }

function togglePlaceBtn() { const btn = document.querySelector("button[onclick='placeOrder()']"); let hasItems = false; gun.get("macx_cart").get(username).map().once(item => { if (item) hasItems = true; }); setTimeout(() => { if (btn) btn.disabled = !hasItems; }, 500); }

// ---------- ORDERS ---------- function placeOrder(paymentStatus = "Paid") { const items = []; gun.get("macx_cart").get(username).map().once(data => { if (data?.id) items.push(data); });

setTimeout(() => { if (!items.length) return alert("Cart is empty");

const orderId = `MACX-${Date.now()}`;
const orderData = {
  orderId,
  username,
  items,
  status: paymentStatus,
  date: new Date().toLocaleString()
};

gun.get("macx_orders").get(username).get(orderId).put(orderData);
gun.get("macx_admin_orders").get(orderId).put(orderData);

clearCart();
alert("Order placed successfully");
window.location.href = "myorders.html";

}, 1000); }

function loadUserOrders(callback) { const orders = []; gun.get("macx_orders").get(username).map().once(order => { if (order?.orderId) orders.push(order); }); setTimeout(() => callback(orders), 1000); }

function loadAdminOrders(callback) { const orders = []; gun.get("macx_admin_orders").map().once(order => { if (order?.orderId) orders.push(order); }); setTimeout(() => callback(orders), 1000); }

function cancelOrder(user, orderId) { if (confirm("Are you sure to cancel this order?") && confirm("Confirm cancel again?") && confirm("This will permanently mark it cancelled")) { gun.get("macx_orders").get(user).get(orderId).get("status").put("Cancelled"); gun.get("macx_admin_orders").get(orderId).get("status").put("Cancelled"); alert("Order marked as cancelled"); } }

function updateOrderStatus(user, orderId, status) { gun.get("macx_orders").get(user).get(orderId).get("status").put(status); gun.get("macx_admin_orders").get(orderId).get("status").put(status); alert("Order status updated to " + status); }

// ---------- UI HELPERS ---------- function renderCart(items, targetId = "cartContainer") { const el = document.getElementById(targetId); if (!el) return; el.innerHTML = ""; let total = 0; items.forEach(p => { total += p.price * p.quantity; el.innerHTML += <div style='margin: 10px 0; padding: 10px; border: 1px solid #333;'> <strong>${p.name}</strong><br> ₹${p.price} x ${p.quantity}<br> <button onclick="removeFromCart('${p.id}')">Remove</button> </div>; }); el.innerHTML += <h3>Total: ₹${total}</h3><button onclick="placeOrder()">Place Order</button>; }

function renderOrders(orders, targetId = "ordersContainer") { const el = document.getElementById(targetId); if (!el) return; el.innerHTML = ""; orders.forEach(order => { el.innerHTML += <div style='margin: 10px 0; padding: 10px; border: 1px solid #444;'> <h4>Order ID: ${order.orderId}</h4> <p>Status: ${order.status}</p> <p>Date: ${order.date}</p> <ul> ${order.items.map(i => <li>${i.name} - ₹${i.price} x ${i.quantity}</li>).join('')} </ul> </div>; }); }

function renderAdminOrders(orders, targetId = "adminOrdersContainer") { const el = document.getElementById(targetId); if (!el) return; el.innerHTML = ""; orders.forEach(order => { el.innerHTML += <div style='margin: 10px 0; padding: 10px; border: 1px solid #888;'> <h4>User: ${order.username}</h4> <h5>Order ID: ${order.orderId}</h5> <p>Status: ${order.status}</p> <p>Date: ${order.date}</p> <button onclick="cancelOrder('${order.username}', '${order.orderId}')">Cancel</button> <button onclick="updateOrderStatus('${order.username}', '${order.orderId}', 'Delivered')">Mark Delivered</button> <ul> ${order.items.map(i => <li>${i.name} - ₹${i.price} x ${i.quantity}</li>).join('')} </ul> </div>; }); }

// Export for console testing (optional) window.macxCommerce = { addToCart, loadCart, renderCart, placeOrder, loadUserOrders, renderOrders, loadAdminOrders, renderAdminOrders, cancelOrder, updateOrderStatus, renderGlobalCartUI, bindCartEvents, togglePlaceBtn };

