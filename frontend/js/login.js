const form = document.getElementById("loginForm");
const messageBox = document.getElementById("responseMsg");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Collect form data
  const userData = {
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value.trim(),
  };

  try {
    const res = await fetch("http://localhost:8080/api/shatova/v2/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const data = await res.json();

    // Always show backend-provided message
    if (!res.ok) {
      messageBox.textContent = data.error || "Login failed. Please try again.";
      messageBox.className = "message error";
      return;
    }

    // Success case
    messageBox.textContent = data.message || "Login successful!";
    messageBox.className = "message success";

    // Save token + redirect
    if (data.token) {
      localStorage.setItem("shatova_token", data.token);
      setTimeout(() => {
        window.location.href = "/dashboard.html";
      }, 1000);
    }

  } catch (error) {
    console.error("Login request failed:", error);
    messageBox.textContent = "⚠️ Unable to connect to server.";
    messageBox.className = "message error";
  }
});

// ========================= PASSWORD TOGGLE =========================
function togglePassword() {
  const passwordField = document.getElementById("password");
  const button = event.target;

  const isHidden = passwordField.type === "password";
  passwordField.type = isHidden ? "text" : "password";
  button.textContent = isHidden ? "🙈" : "👁";
}
