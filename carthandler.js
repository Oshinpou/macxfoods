const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);
const username = localStorage.getItem("macx_loggedInUser");

if (!username) {
  document.body.innerHTML = `<div style="text-align:center;padding:20px;">
    <h2>Please Login First</h2>
    <button onclick="location.href='login.html'">Go to Login</button>
  </div>`;
  throw new Error("Not logged in");
}

const cartRef = gun.get('macx_cart').get(username);
const ordersRef = gun.get('macx_orders').get(username);
const adminOrders = gun.get('admin_orders');
let items = {};

document.addEventListener("DOMContentLoaded", () => {
  renderCart();
  const form = document.getElementById("shippingForm");
  form?.addEventListener("submit", e => {
    e.preventDefault();
    startCartHandler();
  });
});

function renderCart() {
  const container = document.getElementById("cartItems");
  if (!container) return;

  cartRef.map().once((item, id) => {
    if (!item || !item.productName) return;

    items[id] = item;
    const price = parseInt(item.price) || 0;
    const qty = parseInt(item.quantity) || 1;
    const sub = price * qty;

    const div = document.createElement("div");
    div.innerHTML = `
      <div style="border:1px solid #ccc; padding:10px; margin:10px;">
        <img src="${item.image}" height="60" />
        <p>${item.productName} - ₹${price} × ${qty} = ₹${sub}</p>
      </div>
    `;
    container.appendChild(div);
  });

  setTimeout(() => {
    const total = Object.values(items).reduce((sum, i) => sum + (i.price * i.quantity), 0);
    document.getElementById("grandTotal").textContent = `Grand Total: ₹${total}`;
  }, 1000);
}

async function startCartHandler() {
  const cartItems = Object.values(items || {});
  if (!cartItems.length) return alert("Your cart is empty.");

  const get = id => document.getElementById(id)?.value.trim();
  const [name, phone, email, address, country, pincode] =
    ["name","phone","email","address","country","pincode"].map(get);

  if (![name, phone, email, address, country, pincode].every(Boolean)) {
    return alert("Please fill all shipping details.");
  }

  const totalAmount = cartItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const orderId = Date.now().toString();

  const orderData = {
    items: cartItems,
    shipping: { name, phone, email, address, country, pincode },
    total: totalAmount,
    status: "Pending",
    createdAt: Date.now()
  };

  await ordersRef.get(orderId).put(orderData);
  await adminOrders.get(orderId).put({ ...orderData, username });

  alert("✅ Order Created. Redirecting to Payment...");
  setTimeout(() => {
    openRazorpay(orderId, orderData, totalAmount, name, phone, email);
  }, 1000);
}

function openRazorpay(orderId, orderData, total, name, phone, email) {
  const options = {
    key: "rzp_live_ozWo08bXwqssx3",
    amount: total * 100,
    currency: "INR",
    name: "MACX Marketplace",
    description: `Order #${orderId}`,
    prefill: { name, email, contact: phone },
    notes: orderData.shipping,
    handler: function (response) {
      const paidAt = Date.now();
      const paidData = {
        ...orderData,
        status: "Paid",
        razorpay_payment_id: response.razorpay_payment_id,
        paidAt
      };
      ordersRef.get(orderId).put(paidData);
      adminOrders.get(orderId).put({ ...paidData, username });

      // Clear cart
      cartRef.map().once((_, id) => cartRef.get(id).put(null));
      alert("✅ Payment successful!");
      window.location.href = "myorders.html";
    }
  };

  new Razorpay(options).open();
        }
