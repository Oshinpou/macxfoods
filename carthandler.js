// carthandler.js

const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']); const username = localStorage.getItem("macx_loggedInUser"); const cartRef = gun.get('macx_cart').get(username); const ordersRef = gun.get("macx_orders").get(username); const adminOrders = gun.get("admin_orders");

let items = {};

function startCartHandler() { if (!username) return alert("⚠️ Please login to proceed with checkout.");

// Collect form data const get = id => document.getElementById(id)?.value.trim(); const [name, phone, email, address, country, pincode] = ["name","phone","email","address","country","pincode"].map(get);

if (![name, phone, email, address, country, pincode].every(Boolean)) { return alert("🚨 Please fill all shipping details."); }

// Prepare cart data const cartItems = Object.values(items); if (!cartItems.length) { return alert("🛒 Your cart is empty."); }

const totalAmount = cartItems.reduce((sum, i) => sum + (parseInt(i.price) || 0) * (parseInt(i.quantity) || 1), 0);

const orderId = Date.now().toString();

const newOrder = { items: cartItems, shipping: { name, phone, email, address, country, pincode }, total: totalAmount, status: "Pending", createdAt: Date.now() };

// Save to GunDB Promise.all([ ordersRef.get(orderId).put(newOrder), adminOrders.get(orderId).put({ ...newOrder, username }) ]).then(() => { // Message and delay before payment const btn = document.querySelector("button[onclick^='startCartHandler']"); const msg = document.createElement("div"); msg.style.marginTop = "10px"; msg.style.color = "green"; msg.textContent = "✅ Order Created. Redirecting to Razorpay Checkout..."; btn.insertAdjacentElement("afterend", msg);

setTimeout(() => beginPayment(orderId, totalAmount, name, phone, email, address, country, pincode, cartItems), 1500);

}).catch(err => { alert("❌ Failed to create order."); console.error(err); }); }

function beginPayment(orderId, totalAmount, name, phone, email, address, country, pincode, cartItems) { const summaryText = cartItems.map(i => ${i.productName} (qty:${i.quantity}, price:₹${i.price})).join(" | ");

const options = { key: "rzp_live_ozWo08bXwqssx3", amount: totalAmount * 100, currency: "INR", name: "MACX Marketplace", description: Order #${orderId}, prefill: { name, email, contact: phone }, notes: { shipping_name: name, shipping_phone: phone, shipping_email: email, shipping_address: address, shipping_country: country, shipping_pincode: pincode, cart_items: JSON.stringify(cartItems), cart_summary: summaryText }, theme: { color: "#00c0b5" }, handler: function (response) { const paidAt = Date.now(); const paymentId = response.razorpay_payment_id;

ordersRef.get(orderId).once(existing => {
    if (!existing) return alert("⚠️ Order not found.");

    const updated = {
      ...existing,
      status: "Paid",
      paidAt,
      razorpayPaymentId: paymentId
    };

    ordersRef.get(orderId).put(updated);
    adminOrders.get(orderId).put({ ...updated, username });

    cartRef.map().once((_, id) => cartRef.get(id).put(null));

    alert("✅ Payment Successful! Redirecting to My Orders...");
    window.location.href = "myorders.html";
  });
}

};

new Razorpay(options).open(); }

// Export for use in cart.html window.startCartHandler = startCartHandler; window.setCartItems = function(newItems) { items = newItems; };

