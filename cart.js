const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);
const username = localStorage.getItem("macx_loggedInUser");
const cartRef = gun.get('macx_cart').get(username);

const cartItemsContainer = document.getElementById('cartItems');
const grandTotalElement = document.getElementById('grandTotal');
let cartData = {};

// Render cart
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
        <p id="subtotal-${id}">Subtotal: ₹${subtotal}</p>
        <button onclick="removeItem('${id}')">Remove</button>
      </div>
    `;
    cartItemsContainer.appendChild(div);
  });

  setTimeout(() => {
    updateGrandTotal();
  }, 1000);
}

// Update quantity
function updateQuantity(id, newQty) {
  newQty = parseInt(newQty);
  if (isNaN(newQty) || newQty < 1 || !cartData[id]) return;

  const updatedItem = { ...cartData[id], quantity: newQty };
  cartRef.get(id).put(updatedItem, (ack) => {
    if (!ack.err) {
      cartData[id] = updatedItem;
      const newSubtotal = updatedItem.price * newQty;
      document.getElementById(`subtotal-${id}`).textContent = `Subtotal: ₹${newSubtotal}`;
      updateGrandTotal();
    } else {
      alert("Failed to update quantity.");
    }
  });
}

// Remove from cart
function removeItem(id) {
  cartRef.get(id).put(null, (ack) => {
    if (!ack.err) {
      delete cartData[id];
      renderCart();
    }
  });
}

// Grand total calculation
function updateGrandTotal() {
  let total = 0;
  Object.values(cartData).forEach(item => {
    total += item.price * item.quantity;
  });
  grandTotalElement.textContent = `Grand Total: ₹${total}`;
}

// Clear cart after order
function clearCartAfterOrder() {
  Object.keys(cartData).forEach(id => {
    cartRef.get(id).put(null);
  });
  cartData = {};
  renderCart();
}

document.addEventListener("DOMContentLoaded", renderCart);
