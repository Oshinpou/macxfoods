// check-login.js

(function () {
  // List of page filenames that require login
  const protectedPages = [
    "marketplace.html",
    "cart.html",
    "accounts.html",
    "myorders.html",
    "index.html",
    "marketplace.html",
    "product1.html"
    "product2.html"
    
    // You can add more page filenames here
  ];

  // Extract the current page name from the URL
  const currentPage = window.location.pathname.split("/").pop();

  // Check if current page is a protected page
  if (protectedPages.includes(currentPage)) {
    const username = localStorage.getItem("macx_loggedInUser");

    // If not logged in, redirect to login after saving current page
    if (!username) {
      localStorage.setItem("macx_returnPage", window.location.href);
      window.location.href = "login.html";
    }
  }
})();
