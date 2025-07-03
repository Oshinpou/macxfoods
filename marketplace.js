const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);
const cartDB = gun.get('macx_cart');
const username = localStorage.getItem('macx_loggedInUser');

const loggedInSection = document.getElementById('loggedInSection');
const notLoggedIn = document.getElementById('notLoggedIn');
const userDisplay = document.getElementById('userDisplay');
const productsDiv = document.getElementById('products');
const logoutBtn = document.getElementById('logoutBtn');
const loginRedirectBtn = document.getElementById('loginRedirectBtn');

// Always show products
loadProducts();

// Handle login status
if (username) {
  loggedInSection.style.display = 'block';
  notLoggedIn.style.display = 'none';
  if (userDisplay) userDisplay.textContent = `Welcome, ${username}`;
} else {
  loggedInSection.style.display = 'none';
  notLoggedIn.style.display = 'block';
}

// Logout
logoutBtn?.addEventListener('click', () => {
  localStorage.removeItem('macx_loggedInUser');
  window.location.reload();
});

// Login redirect
loginRedirectBtn?.addEventListener('click', () => {
  window.location.href = "login.html";
});

// Sample products
const sampleProducts = [
  {
    sku: "MACX001",
    name: "MACX Glow Cream",
    price: 2000,
    image: "https://via.placeholder.com/200x150?text=Glow+Cream"
  },
  {
    sku: "MACX002",
    name: "MACX Sculpt Serum",
    price: 1800,
    image: "https://via.placeholder.com/200x150?text=Sculpt+Serum"
  },
  {
    sku: "MACX003",
    name: "MACX Muscle Mist",
    price: 2500,
    image: "https://via.placeholder.com/200x150?text=Muscle+Mist"
  }
];

// Render product cards
function loadProducts() {
  if (!productsDiv) return;
  productsDiv.innerHTML = "";

  sampleProducts.forEach((product) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${product.image}" alt="${product.name}" style="width:100%; max-height:150px; object-fit:cover; border-radius:5px;" />
      <h3>${product.name}</h3>
      <p>Price: ₹${product.price}</p>
      <button onclick="viewProduct('${product.name}')">View Product</button>
      <button onclick="addToCart('${product.sku}', '${product.name}', ${product.price})">Add to Cart</button>
    `;
    productsDiv.appendChild(card);
  });
}

// View product page
window.viewProduct = function (name) {
  const filename = name.replace(/\s+/g, '') + '.html';
  window.location.href = filename;
};

// Add to cart (if logged in)
window.addToCart = function (sku, name, price) {
  const currentUser = localStorage.getItem("macx_loggedInUser");
  if (!currentUser) {
    alert("Please log in to add items to your cart.");
    return;
  }

  const userCart = cartDB.get(currentUser);
  const item = userCart.get(sku);

  item.once((data) => {
    const quantity = data?.quantity || 0;
    item.put({
      sku,
      name,
      price,
      quantity: quantity + 1
    }, () => {
      alert(`${name} added to cart`);
    });
  });
};
