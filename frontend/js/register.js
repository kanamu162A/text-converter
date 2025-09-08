const registerForm = document.getElementById("registerForm");
const messageBox = document.getElementById("responseMsg");

// ✅ Use deployed API in production, local in dev
const API_BASE_URL = window.location.hostname === "localhost"
  ? "http://localhost:8080"
  : "https://text-converter-se00.onrender.com"; // change to your Render URL

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userData = {
    username: document.getElementById("username").value.trim(),
    email: document.getElementById("registerEmail").value.trim(),
    password: document.getElementById("registerPassword").value.trim(),
  };

  try {
    const res = await fetch(`${API_BASE_URL}/api/shatova/v2/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const data = await res.json();

    if (!res.ok) {
      // Show backend error first
      messageBox.textContent = data.error || "⚠️ Registration failed. Try again.";
      messageBox.className = "message error";
      return;
    }

    // ✅ Success case
    messageBox.textContent = data.message || "✅ Registration successful! Please login.";
    messageBox.className = "message success";

    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);

  } catch (error) {
    console.error("Register request failed:", error);
    messageBox.textContent = "🚨 Unable to register. Check your internet connection.";
    messageBox.className = "message error";
  }
});

// ========================= PASSWORD TOGGLE =========================
function togglePassword(fieldId, btn) {
  const field = document.getElementById(fieldId);
  const isHidden = field.type === "password";

  field.type = isHidden ? "text" : "password";
  btn.textContent = isHidden ? "🙈 Hide" : "👁 Show";
}
