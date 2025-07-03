// CDN dependencies (make sure to include these in cart.html head or here dynamically)
const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);
const username = localStorage.getItem("macx_loggedInUser");
const cartRef = gun.get('macx_cart').get(username);

const cartItemsContainer = document.getElementById('cartItems');
const grandTotalElement = document.getElementById('grandTotal');

let cartData = {};

// Render cart items
function renderCart() {
  if (!username) {
    cartItemsContainer.innerHTML = "<p>Please login to view your cart.</p>";
    grandTotalElement.textContent = "";
    return;
  }

  cartItemsContainer.innerHTML = "";
  cartData = {};
  let total = 0;

  cartRef.map().once((item, id) => {
    if (!item || !item.productName) return;

    cartData[id] = item;
    const subtotal = item.price * item.quantity;
    total += subtotal;

    const div = document.createElement('div');
    div.classList.add('cart-item');
    div.innerHTML = `
      <div style="border:1px solid #ccc; padding:10px; margin-bottom:10px;">
        <img src="${item.image}" alt="${item.productName}" width="60">
        <h4>${item.productName}</h4>
        <p>Price: ₹${item.price}</p>
        <label>
          Quantity:
          <input type="number" min="1" value="${item.quantity}" onchange="updateQuantity('${id}', this.value)">
        </label>
        <p>Subtotal: ₹${subtotal}</p>
        <button onclick="removeItem('${id}')">Remove</button>
      </div>
    `;
    cartItemsContainer.appendChild(div);
  });

  setTimeout(() => {
    grandTotalElement.textContent = `Grand Total: ₹${total}`;
  }, 1000);
}

// Update quantity and save in Gun
function updateQuantity(id, newQty) {
  newQty = parseInt(newQty);
  if (isNaN(newQty) || newQty < 1 || !cartData[id]) return;

  const updatedItem = { ...cartData[id], quantity: newQty };
  cartRef.get(id).put(updatedItem, (ack) => {
    if (!ack.err) {
      cartData[id] = updatedItem;
      renderCart();
    } else {
      alert("Failed to update quantity.");
    }
  });
}

// Remove item from cart
function removeItem(id) {
  cartRef.get(id).put(null, (ack) => {
    if (!ack.err) {
      delete cartData[id];
      renderCart();
    }
  });
}

// Optional: Call this after payment success to clear the cart
function clearCartAfterOrder() {
  Object.keys(cartData).forEach(id => {
    cartRef.get(id).put(null);
  });
  cartData = {};
  renderCart();
}

// Render cart on page load
document.addEventListener("DOMContentLoaded", renderCart);
