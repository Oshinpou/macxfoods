// check-login.js

(function () {
  const protectedPages = [
    "marketplace.html",
    "cart.html",
    "accounts.html",
    "myorders.html",
    "index.html",
    "product1.html",
    "product2.html"
    // Add more protected pages as needed
  ];

  const currentPath = window.location.pathname;
  const currentPage = currentPath.substring(currentPath.lastIndexOf("/") + 1).toLowerCase();

  // Step 1: If user visits a protected page and is not logged in
  if (protectedPages.includes(currentPage)) {
    const username = localStorage.getItem("macx_loggedInUser");
    if (!username) {
      localStorage.setItem("macx_returnPage", window.location.href);
      window.location.href = "login.html";
    }
  }

  // Step 2: If logged in and a returnPage exists, show a "Go Back" button
  document.addEventListener("DOMContentLoaded", () => {
    const returnPage = localStorage.getItem("macx_returnPage");
    const username = localStorage.getItem("macx_loggedInUser");

    if (returnPage && username) {
      // Create a button
      const goBackBtn = document.createElement("button");
      goBackBtn.textContent = "Go Back to Last Page";
      goBackBtn.style.position = "fixed";
      goBackBtn.style.bottom = "20px";
      goBackBtn.style.right = "20px";
      goBackBtn.style.padding = "10px 20px";
      goBackBtn.style.fontSize = "16px";
      goBackBtn.style.background = "gold";
      goBackBtn.style.color = "black";
      goBackBtn.style.border = "none";
      goBackBtn.style.borderRadius = "8px";
      goBackBtn.style.boxShadow = "0 0 10px gold";
      goBackBtn.style.cursor = "pointer";
      goBackBtn.style.zIndex = "9999";

      goBackBtn.onclick = () => {
        localStorage.removeItem("macx_returnPage");
        window.location.href = returnPage;
      };

      document.body.appendChild(goBackBtn);
    }
  });
})();
