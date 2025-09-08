const registerForm = document.getElementById("registerForm");
const messageBox = document.getElementById("responseMsg");

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userData = {
    username: document.getElementById("username").value.trim(),
    email: document.getElementById("registerEmail").value.trim(),
    password: document.getElementById("registerPassword").value.trim()
  };

  try {
    const res = await fetch("http://localhost:8080/api/shatova/v2/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData)
    });

    const data = await res.json();
    const isSuccess = res.ok && data.success;

    messageBox.textContent = data.message || (isSuccess ? "Registration successful! Please login." : "Registration failed.");
    messageBox.className = `message ${isSuccess ? "success" : "error"}`;

    if (isSuccess) {
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);
    }
  } catch (error) {
    messageBox.textContent = "Unable to register. Check your internet connection.";
    messageBox.className = "message error";
  }
});

function togglePassword(fieldId, btn) {
  const field = document.getElementById(fieldId);
  field.type = field.type === "password" ? "text" : "password";
  btn.textContent = field.type === "password" ? "👁" : "🙈";
}
