const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);
const username = localStorage.getItem("macx_loggedInUser");
const cartRef = gun.get("macx_cart").get(username);
const ordersRef = gun.get("macx_orders").get(username);
const adminOrders = gun.get("admin_orders");

let items = {};

// 1. Start Handler
async function startCartHandler() {
  const cartItems = Object.values(items);
  if (!cartItems.length) return alert("🛒 Cart is empty.");

  const get = id => document.getElementById(id)?.value.trim();
  const [name, phone, email, address, country, pincode] =
    ["name", "phone", "email", "address", "country", "pincode"].map(get);

  if (![name, phone, email, address, country, pincode].every(Boolean)) {
    return alert("🚨 Fill all shipping details.");
  }

  const totalAmount = cartItems.reduce((sum, i) =>
    sum + (parseInt(i.price) || 0) * (parseInt(i.quantity) || 1), 0);
  const orderId = Date.now().toString();

  const order = {
    orderId,
    items: cartItems,
    shipping: { name, phone, email, address, country, pincode },
    total: totalAmount,
    status: "Pending",
    createdAt: Date.now()
  };

  await Promise.all([
    ordersRef.get(orderId).put(order),
    adminOrders.get(orderId).put({ ...order, username })
  ]);

  // Show "Order Created" message
  const btn = document.getElementById("createOrderBtn");
  const msg = document.createElement("div");
  msg.textContent = "✅ Order Created. Redirecting to payment...";
  msg.style.color = "green";
  btn.parentNode.insertBefore(msg, btn.nextSibling);

  setTimeout(() => {
    msg.remove();
    openRazorpayCheckout(orderId, totalAmount, { name, phone, email, address, country, pincode }, cartItems);
  }, 1500);
}

// 2. Razorpay Integration
function openRazorpayCheckout(orderId, totalAmount, shipping, cartItems) {
  const summaryText = cartItems
    .map(i => `${i.productName} x${i.quantity} (₹${i.price})`)
    .join(" | ");

  const options = {
    key: "rzp_live_ozWo08bXwqssx3", // replace with your key
    amount: totalAmount * 100,
    currency: "INR",
    name: "MACX Marketplace",
    description: `Order #${orderId}`,
    prefill: {
      name: shipping.name,
      email: shipping.email,
      contact: shipping.phone
    },
    notes: {
      ...shipping,
      cart_summary: summaryText
    },
    theme: { color: "#00c0b5" },
    handler: function (response) {
      const paidAt = Date.now();
      const update = {
        status: "Paid",
        razorpayPaymentId: response.razorpay_payment_id,
        paidAt
      };

      ordersRef.get(orderId).get("status").put("Paid");
      ordersRef.get(orderId).get("razorpayPaymentId").put(response.razorpay_payment_id);
      ordersRef.get(orderId).get("paidAt").put(paidAt);

      adminOrders.get(orderId).get("status").put("Paid");
      adminOrders.get(orderId).get("razorpayPaymentId").put(response.razorpay_payment_id);
      adminOrders.get(orderId).get("paidAt").put(paidAt);

      cartRef.map().once((_, id) => cartRef.get(id).put(null));

      alert("✅ Payment Success! Redirecting to My Orders...");
      window.location.href = "myorders.html";
    }
  };

  new Razorpay(options).open();
}

// 3. Initialize from cart
function listenToCart() {
  const container = document.getElementById("cartItems");
  items = {};
  container.innerHTML = "";

  cartRef.map().on((data, id) => {
    if (!data || !data.productName) return;

    items[id] = { ...data, id };
    const node = document.createElement("div");
    node.innerHTML = `<p>${data.productName} - ₹${data.price} × ${data.quantity}</p>`;
    container.appendChild(node);
  });
}

// 4. Trigger on page load
document.addEventListener("DOMContentLoaded", () => {
  if (username) {
    listenToCart();
  }
});
