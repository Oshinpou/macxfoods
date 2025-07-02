// checkout.js - Razorpay Payment Handler for MACX

function payWithRazorpay(amountInINR, username, orderId, onSuccessCallback) { const options = { key: "YOUR_RAZORPAY_KEY_ID", // Replace with your Razorpay Key ID amount: amountInINR * 100, // Razorpay works in paise currency: "INR", name: "MACX Marketplace", description: Order ${orderId}, image: "https://yourdomain.com/logo.png", handler: function (response) { alert("Payment successful!"); console.log(response); onSuccessCallback(response); }, prefill: { name: username, email: "", contact: "" }, theme: { color: "#3399cc" } }; const rzp = new Razorpay(options); rzp.open(); }

// Example usage from cart.html // payWithRazorpay(3500, "macx_user", "ORD1712345678", function(response) { //   console.log("Success Response:", response); //   // Save order to Gun or redirect // });

