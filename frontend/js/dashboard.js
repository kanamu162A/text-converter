// ================= TOKEN & API =================
const token = localStorage.getItem("shatova_token");
if (!token) window.location.href = "/login.html";

const headers = {
  "Authorization": `Bearer ${token}`,
  "Content-Type": "application/json"
};

async function api(url, options = {}) {
  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "API Error");
    return data;
  } catch (err) {
    console.error(`API failed: ${url}`, err.message);
    throw err;
  }
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
    document.getElementById("profileCreated").textContent = new Date(created_at).toLocaleString();
    document.getElementById("role").textContent = role;

    if (role !== "admin") document.querySelectorAll(".admin-only").forEach(el => el.style.display = "none");
    if (role !== "ceo") document.querySelectorAll(".ceo-only").forEach(el => el.style.display = "none");
  } catch (err) {
    console.error("Profile load failed:", err.message);
  }
}

// ================= CONVERSIONS =================
document.getElementById("encodeBtn").addEventListener("click", async () => {
  const text = document.getElementById("encodeInput").value.trim();
  if (!text) return alert("Please enter text to encrypt.");

  const resultBox = document.getElementById("encodeResultBox");
  const binaryEl = document.getElementById("binaryOutput");
  const pinEl = document.getElementById("pinOutput");

  resultBox.classList.remove("hidden");
  binaryEl.textContent = "⏳ Encoding...";
  pinEl.textContent = "⏳";

  try {
    const data = await api("/api/shatova/v2/conversions/encode", {
      method: "POST",
      body: JSON.stringify({ text })
    });
    binaryEl.textContent = data.binary_output;
    pinEl.textContent = data.pin;
  } catch {
    binaryEl.textContent = "❌ Error";
    pinEl.textContent = "❌";
  }
});

document.getElementById("decodeBtn").addEventListener("click", async () => {
  const binary = document.getElementById("decodeBinary").value.trim();
  const pin = document.getElementById("decodePin").value.trim();
  const langs = document.getElementById("decodeLangs").value.split(",").map(l => l.trim()).filter(Boolean);

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
  } catch {
    resultEl.textContent = "❌ Error decoding!";
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
  const el = document.getElementById(e.target.dataset.target);
  if (!el) return;

  navigator.clipboard.writeText(el.innerText || el.textContent).then(() => {
    const original = e.target.textContent;
    e.target.textContent = "✅ Copied!";
    setTimeout(() => (e.target.textContent = original), 1500);
  });
});

// ================= PAGINATION HELPERS =================
function createPager(limit) {
  return { page: 1, limit, cache: {} };
}

function renderTable(tbodySelector, data, page, limit, columns) {
  const tbody = document.querySelector(tbodySelector);
  tbody.innerHTML = "";
  data.forEach((row, i) => {
    tbody.innerHTML += "<tr>" +
      columns.map(col => `<td>${col(row, (page - 1) * limit + i + 1)}</td>`).join("") +
      "</tr>";
  });
}

// ================= HISTORY =================
const historyPager = createPager(10);

async function loadHistory(page = 1) {
  historyPager.page = page;
  if (historyPager.cache[page]) {
    renderHistory(historyPager.cache[page]);
    return;
  }
  try {
    const data = await api(`/api/shatova/v2/admin/history?page=${page}&limit=${historyPager.limit}`);
    historyPager.cache[page] = data;
    renderHistory(data);
    preloadHistory(page + 1, data.total);
  } catch (err) {
    console.error("History load failed:", err.message);
  }
}

function renderHistory(data) {
  renderTable("#historyTable tbody", data.conversions, historyPager.page, historyPager.limit, [
    (_, idx) => idx,
    h => h.text,
    h => h.binary,
    h => h.pin,
    h => new Date(h.date).toLocaleString()
  ]);

  const totalPages = Math.ceil(data.total / historyPager.limit);
  document.getElementById("historyCurrentPage").textContent = historyPager.page;
  document.getElementById("historyPrev").disabled = historyPager.page <= 1;
  document.getElementById("historyNext").disabled = historyPager.page >= totalPages;
}

function preloadHistory(page, total) {
  const totalPages = Math.ceil(total / historyPager.limit);
  if (page <= totalPages && !historyPager.cache[page]) {
    api(`/api/shatova/v2/admin/history?page=${page}&limit=${historyPager.limit}`).then(d => (historyPager.cache[page] = d)).catch(() => {});
  }
}

document.getElementById("historyPrev").addEventListener("click", () => loadHistory(historyPager.page - 1));
document.getElementById("historyNext").addEventListener("click", () => loadHistory(historyPager.page + 1));

// ================= ADMIN =================
const adminPager = createPager(10);

async function loadAdmin(page = 1) {
  adminPager.page = page;
  if (adminPager.cache[page]) {
    renderAdmin(adminPager.cache[page]);
    return;
  }
  try {
    const [users, convs, logs] = await Promise.all([
      api(`/api/shatova/v2/admin/users?page=${page}&limit=${adminPager.limit}`),
      api(`/api/shatova/v2/admin/conversions?page=${page}&limit=${adminPager.limit}`),
      api(`/api/shatova/v2/admin/audit-logs?page=${page}&limit=${adminPager.limit}`)
    ]);
    const data = { users, convs, logs };
    adminPager.cache[page] = data;
    renderAdmin(data);
  } catch (err) {
    console.error("Admin load failed:", err.message);
  }
}

function renderAdmin({ users, convs, logs }) {
  renderTable("#usersTable tbody", users.users, adminPager.page, adminPager.limit, [
    (_, idx) => idx,
    u => u.username,
    u => u.email,
    u => u.role,
    u => new Date(u.created_at).toLocaleString()
  ]);

  renderTable("#adminConversions tbody", convs.conversions, adminPager.page, adminPager.limit, [
    c => c.id,
    c => c.username,
    c => c.binary_output,
    c => new Date(c.created_at).toLocaleString()
  ]);

  renderTable("#auditLogs tbody", logs.logs, adminPager.page, adminPager.limit, [
    l => l.id,
    l => l.action,
    l => l.user_id,
    l => new Date(l.created_at).toLocaleString()
  ]);
}

// ================= CEO =================
const ceoPager = createPager(10);

async function loadCEO(page = 1) {
  ceoPager.page = page;
  if (ceoPager.cache[page]) {
    renderCEO(ceoPager.cache[page]);
    return;
  }
  try {
    const data = await api(`/api/shatova/v2/admin/all/history?page=${page}&limit=${ceoPager.limit}`);
    ceoPager.cache[page] = data;
    renderCEO(data);
    preloadCEO(page + 1, data.total);
  } catch (err) {
    console.error("CEO load failed:", err.message);
  }
}

function renderCEO(data) {
  renderTable("#ceoHistory tbody", data.conversions, ceoPager.page, ceoPager.limit, [
    (_, idx) => idx,
    h => h.user || h.username || h.email || "N/A",
    h => h.text || h.original_text || "N/A",
    h => h.binary || h.binary_output || "N/A",
    h => h.pin || h.pin_hash || "N/A",
    h => new Date(h.date || h.created_at).toLocaleString()
  ]);

  const totalPages = Math.ceil(data.total / ceoPager.limit);
  document.getElementById("ceoCurrentPage").textContent = ceoPager.page;
  document.getElementById("ceoPrev").disabled = ceoPager.page <= 1;
  document.getElementById("ceoNext").disabled = ceoPager.page >= totalPages;
}

function preloadCEO(page, total) {
  const totalPages = Math.ceil(total / ceoPager.limit);
  if (page <= totalPages && !ceoPager.cache[page]) {
    api(`/api/shatova/v2/admin/all/history?page=${page}&limit=${ceoPager.limit}`).then(d => (ceoPager.cache[page] = d)).catch(() => {});
  }
}

document.getElementById("ceoPrev").addEventListener("click", () => loadCEO(ceoPager.page - 1));
document.getElementById("ceoNext").addEventListener("click", () => loadCEO(ceoPager.page + 1));

// ================= MASTER KEY =================
document.getElementById("generateKeyBtn").addEventListener("click", async () => {
  try {
    const data = await api("/api/shatova/v2/master-key", { method: "POST" });
    document.getElementById("masterKeyDisplay").textContent = `Key: ${data.master_key} (expires ${new Date(data.expires_at).toLocaleString()})`;
  } catch (err) {
    console.error("Failed to generate master key:", err.message);
  }
});

// ================= TABS =================
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

// ================== SEARCH (USER SIDE) ==================
document.getElementById("userSearchBtn").addEventListener("click", async () => {
  const token = document.getElementById("userSearchInput").value.trim();

  if (!token) {
    alert("❌ Token is required");
    return;
  }

  try {
    const res = await fetch("/api/shatova/v2/conversions/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("shatova_token")}`,
      },
      body: JSON.stringify({ token }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "❌ No results found");
      return;
    }

    const tbody = document.querySelector("#historyTable tbody");
    tbody.innerHTML = "";

    data.conversions.forEach((conv, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${conv.original_text}</td>
        <td>${conv.binary_output}</td>
        <td>${conv.pin_hash}</td>
        <td>${new Date(conv.created_at).toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("User search error:", err);
    alert("⚠ Error searching conversions");
  }
});


// ================== SEARCH (CEO SIDE) ==================
document.getElementById("ceoSearchBtn").addEventListener("click", async () => {
  const token = document.getElementById("ceoSearchInput").value.trim();

  if (!token) {
    alert("❌ Token is required");
    return;
  }

  try {
    const res = await fetch("/api/shatova/V2/conversions/admin/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("shatova_token")}`,
      },
      body: JSON.stringify({ token }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "❌ No results found");
      return;
    }

    const tbody = document.querySelector("#ceoHistory tbody");
    tbody.innerHTML = "";

    data.conversions.forEach((conv, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${conv.id}</td>
        <td>${conv.email}</td>
        <td>${conv.original_text}</td>
        <td>${conv.binary_output}</td>
        <td>${conv.pin_hash}</td>
        <td>${new Date(conv.created_at).toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("CEO search error:", err);
    alert("⚠ Error searching conversions");
  }
});

// ================= INIT =================
(async () => {
  await loadProfile();
  await loadHistory();
  await loadAdmin();
  await loadCEO();
})();