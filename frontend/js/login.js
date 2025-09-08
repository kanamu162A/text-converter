const form = document.getElementById("loginForm");
const messageBox = document.getElementById("responseMsg");

// ✅ Use your deployed API when in production
const API_BASE_URL = window.location.hostname === "localhost"
  ? "http://localhost:8080"
  : "https://text-converter-se00.onrender.com"; // change to your Render URL

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Collect form data
  const userData = {
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value.trim(),
  };

  try {
    const res = await fetch(`${API_BASE_URL}/api/shatova/v2/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const data = await res.json();

    // Handle error response from backend
    if (!res.ok) {
      messageBox.textContent = data.error || "⚠️ Login failed. Please try again.";
      messageBox.className = "message error";
      return;
    }

    // ✅ Success case
    messageBox.textContent = data.message || "✅ Login successful!";
    messageBox.className = "message success";

    // Save token & redirect
    if (data.token) {
      localStorage.setItem("shatova_token", data.token);
      setTimeout(() => {
        window.location.href = "/dashboard.html";
      }, 1200);
    }

  } catch (error) {
    console.error("Login request failed:", error);
    messageBox.textContent = "🚨 Unable to connect to server.";
    messageBox.className = "message error";
  }
});

// ========================= PASSWORD TOGGLE =========================
function togglePassword(event) {
  const passwordField = document.getElementById("password");
  const button = event.target;

  const isHidden = passwordField.type === "password";
  passwordField.type = isHidden ? "text" : "password";
  button.textContent = isHidden ? "🙈 Hide" : "👁 Show";
}
