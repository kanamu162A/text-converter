// ================= TOKEN & API =================
const token = localStorage.getItem("shatova_token");
if (!token) window.location.href = "/login.html";

const headers = {
  "Authorization": `Bearer ${token}`,
  "Content-Type": "application/json"
};

async function api(url, options = {}) {
  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "API Error");
  return data;
}

// ================= PROFILE =================
async function loadProfile() {
  try {
    const data = await api("/api/shatova/v2/dashboard/profile");
    const { username, role, email, created_at } = data.user;

    document.getElementById("username").textContent = username;
    document.getElementById("profileUsername").textContent = username;
    document.getElementById("profileRole").textContent = role;
    document.getElementById("profileEmail").textContent = email;
    document.getElementById("profileCreated").textContent =
      new Date(created_at).toLocaleString();
    document.getElementById("role").textContent = role;

    if (role !== "admin")
      document.querySelectorAll(".admin-only").forEach(el => el.style.display = "none");
    if (role !== "ceo")
      document.querySelectorAll(".ceo-only").forEach(el => el.style.display = "none");
  } catch (err) {
    console.error("Profile load failed:", err);
  }
}

// ================= CONVERSIONS =================
document.getElementById("encodeBtn").addEventListener("click", async () => {
  const text = document.getElementById("encodeInput").value.trim();
  if (!text) return alert("Please enter text to encrypt.");

  document.getElementById("encodeResultBox").classList.remove("hidden");
  document.getElementById("binaryOutput").textContent = "⏳ Encoding...";
  document.getElementById("pinOutput").textContent = "⏳";

  try {
    const data = await api("/api/shatova/v2/conversions/encode", {
      method: "POST",
      body: JSON.stringify({ text })
    });
    document.getElementById("binaryOutput").textContent = data.binary_output;
    document.getElementById("pinOutput").textContent = data.pin;
  } catch (err) {
    document.getElementById("binaryOutput").textContent = "❌ Error";
    document.getElementById("pinOutput").textContent = "❌";
    console.error(err);
  }
});

document.getElementById("decodeBtn").addEventListener("click", async () => {
  const binary = document.getElementById("decodeBinary").value.trim();
  const pin = document.getElementById("decodePin").value.trim();
  const langs = document.getElementById("decodeLangs").value
    .split(",").map(l => l.trim()).filter(Boolean);

  if (!binary || !pin) return alert("Binary and PIN are required!");

  const resultBox = document.getElementById("decodeResultBox");
  const resultEl = document.getElementById("decodeResult");
  resultBox.classList.remove("hidden");
  resultEl.textContent = "⏳ Decoding...";

  try {
    const data = await api("/api/shatova/v2/conversions/decode", {
      method: "POST",
      body: JSON.stringify({ binary_output: binary, pin, languages: langs })
    });
    resultEl.textContent = data.original_text || "❌ Failed to decrypt";
  } catch (err) {
    resultEl.textContent = "❌ Error decoding!";
    console.error(err);
  }
});

// ================= SWITCH ENCODE/DECODE =================
document.getElementById("switchToDecode").addEventListener("click", () => {
  document.getElementById("encodeSection").classList.add("hidden");
  document.getElementById("decodeSection").classList.remove("hidden");
});
document.getElementById("switchToEncode").addEventListener("click", () => {
  document.getElementById("decodeSection").classList.add("hidden");
  document.getElementById("encodeSection").classList.remove("hidden");
});

// ================= COPY BUTTON =================
document.addEventListener("click", e => {
  if (!e.target.classList.contains("copy-btn")) return;
  const targetId = e.target.dataset.target;
  const el = document.getElementById(targetId);
  if (!el) return;
  navigator.clipboard.writeText(el.innerText || el.textContent).then(() => {
    const original = e.target.textContent;
    e.target.textContent = "✅ Copied!";
    setTimeout(() => e.target.textContent = original, 1500);
  });
});

// ================= HISTORY PAGINATION =================
let historyPage = 1, historyLimit = 10;
async function loadHistory(page = 1) {
  if (page < 1) page = 1;
  historyPage = page;

  const data = await api(`/api/shatova/v2/admin/history?page=${page}&limit=${historyLimit}`);
  const tbody = document.querySelector("#historyTable tbody");
  tbody.innerHTML = "";
  const totalPages = Math.ceil(data.total / historyLimit);

  data.conversions.forEach((h, i) => {
    tbody.innerHTML += `<tr>
      <td>${(historyPage - 1) * historyLimit + i + 1}</td>
      <td>${h.text}</td>
      <td>${h.binary}</td>
      <td>${h.pin}</td>
      <td>${new Date(h.date).toLocaleString()}</td>
    </tr>`;
  });

  document.getElementById("historyCurrentPage").textContent = historyPage;
  document.getElementById("historyPrev").disabled = historyPage <= 1;
  document.getElementById("historyNext").disabled = historyPage >= totalPages;
}
document.getElementById("historyPrev").addEventListener("click", () => {
  if (historyPage > 1) loadHistory(historyPage - 1);
});
document.getElementById("historyNext").addEventListener("click", () => {
  loadHistory(historyPage + 1);
});

// ================= ADMIN PAGINATION =================
let adminPage = 1, adminLimit = 10;
async function loadAdmin(page = 1) {
  if (page < 1) page = 1;
  adminPage = page;

  try {
    const [users, convs, logs] = await Promise.all([
      api(`/api/shatova/v2/admin/users?page=${page}&limit=${adminLimit}`),
      api(`/api/shatova/v2/admin/conversions?page=${page}&limit=${adminLimit}`),
      api(`/api/shatova/v2/admin/audit-logs?page=${page}&limit=${adminLimit}`)
    ]);

    const userBody = document.querySelector("#usersTable tbody");
    userBody.innerHTML = "";
    users.users.forEach((u, i) => {
      userBody.innerHTML += `<tr>
        <td>${(adminPage - 1) * adminLimit + i + 1}</td>
        <td>${u.username}</td>
        <td>${u.email}</td>
        <td>${u.role}</td>
        <td>${new Date(u.created_at).toLocaleString()}</td>
      </tr>`;
    });

    const convBody = document.querySelector("#adminConversions tbody");
    convBody.innerHTML = "";
    convs.conversions.forEach(c => {
      convBody.innerHTML += `<tr>
        <td>${c.id}</td>
        <td>${c.username}</td>
        <td>${c.binary_output}</td>
        <td>${new Date(c.created_at).toLocaleString()}</td>
      </tr>`;
    });

    const logBody = document.querySelector("#auditLogs tbody");
    logBody.innerHTML = "";
    logs.logs.forEach(l => {
      logBody.innerHTML += `<tr>
        <td>${l.id}</td>
        <td>${l.action}</td>
        <td>${l.user_id}</td>
        <td>${new Date(l.created_at).toLocaleString()}</td>
      </tr>`;
    });

  } catch (err) {
    console.warn("Admin load failed:", err.message);
  }
}

// ================= CEO PAGINATION =================
let ceoPage = 1, ceoLimit = 10;
async function loadCEO(page = 1) {
  if (page < 1) page = 1;
  ceoPage = page;

  const data = await api(`/api/shatova/v2/admin/all/history?page=${page}&limit=${ceoLimit}`);
  const tbody = document.querySelector("#ceoHistory tbody");
  tbody.innerHTML = "";
  data.conversions.forEach((h, i) => {
    tbody.innerHTML += `<tr>
      <td>${(ceoPage - 1) * ceoLimit + i + 1}</td>
      <td>${h.user}</td>
      <td>${h.text}</td>
      <td>${h.binary}</td>
      <td>${h.pin}</td>
      <td>${new Date(h.date).toLocaleString()}</td>
    </tr>`;
  });
}

// ================= CEO MASTER KEY =================
document.getElementById("generateKeyBtn").addEventListener("click", async () => {
  const data = await api("/api/shatova/v2/master-key", { method: "POST" });
  document.getElementById("masterKeyDisplay").textContent =
    `Key: ${data.master_key} (expires ${new Date(data.expires_at).toLocaleString()})`;
});

// ================= TAB SWITCHING =================
document.querySelectorAll(".tabs button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

// ================= LOGOUT =================
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("shatova_token");
  window.location.href = "/login.html";
});

// ================= INIT =================
(async () => {
  await loadProfile();
  await loadHistory();
  await loadAdmin();
  await loadCEO();
})();
