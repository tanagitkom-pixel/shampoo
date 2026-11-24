/* ==========================================================================
   shampoo — script.js (ใช้ร่วมกันทุกหน้า)
   - product.html : โหลดสินค้า + กรองตาม mood
   - order.html   : เติมฟอร์มจาก URL parameter + ส่งออเดอร์
   - admin.html   : แสดงออเดอร์จาก Google Sheet (CSV)
   ========================================================================== */

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyW_Z7Z2Mxkc4m9sSCPjBZXmxMQt93AvUaaajAjnG07gcFY2EFbJHQZzjjobqiE9_Wx/exec";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTO1erUUa_1XwKZ6x1aO4Wo0Mt2QW1DhEBfTOjFfU-di-hh8Pxt_OurkDppe020J3FcDn99MaR7zueY/pub?gid=0&single=true&output=csv";

const MOODS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "fresh", label: "Fresh" },
  { key: "sweet", label: "Sweet" },
  { key: "confident", label: "Confident" },
  { key: "romance", label: "Romance" },
];

/* ---------- Helpers ---------- */
function formatPrice(n) {
  return Number(n).toLocaleString("th-TH");
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/* ==========================================================================
   1) product.html
   ========================================================================== */
function initProductPage() {
  const filterBar = document.getElementById("filter-bar");
  const list = document.getElementById("product-list");
  if (!filterBar || !list) return;

  let products = [];
  const params = new URLSearchParams(window.location.search);
  const validKeys = MOODS.map((m) => m.key);
  let currentMood = (params.get("mood") || "all").toLowerCase();
  if (!validKeys.includes(currentMood)) currentMood = "all";

  function renderFilters() {
    filterBar.classList.add("filter");
    filterBar.innerHTML = MOODS.map(
      (m) =>
        `<button type="button" data-mood="${m.key}" class="${
          m.key === currentMood ? "active" : ""
        }">${m.label}</button>`
    ).join("");

    filterBar.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentMood = btn.dataset.mood;
        filterBar
          .querySelectorAll("button")
          .forEach((b) => b.classList.toggle("active", b === btn));
        renderProducts();
      });
    });
  }

  function renderProducts() {
    const items =
      currentMood === "all"
        ? products
        : products.filter((p) => p.mood === currentMood);

    if (items.length === 0) {
      list.innerHTML =
        '<p class="text-center" style="grid-column:1/-1">ยังไม่มีสินค้าในหมวดนี้ เร็วๆ นี้ครับ</p>';
      return;
    }

    list.innerHTML = items
      .map((p) => {
        const itemName = `${p.name} ${p.size}`;
        const orderUrl =
          "order.html?item=" +
          encodeURIComponent(itemName) +
          "&price=" +
          encodeURIComponent(p.price);

        return `
        <article class="product-card" data-mood="${escapeHtml(p.mood)}">
          <div class="product-card__image">
            <img src="${escapeHtml(p.image)}" alt="${escapeHtml(itemName)}" loading="lazy">
          </div>
          <div class="product-card__body">
            <span class="product-card__mood">
              <span class="mood-dot mood-dot--${escapeHtml(p.mood)}"></span>
              ${escapeHtml(capitalize(p.mood))}
            </span>
            <h3 class="product-card__name">${escapeHtml(p.name)}</h3>
            <p class="product-card__size">${escapeHtml(p.size)}</p>
            <div class="product-card__footer">
              <span class="price">${formatPrice(p.price)}<small>บาท</small></span>
              <a class="btn btn--accent" href="${orderUrl}">สั่งซื้อ</a>
            </div>
          </div>
        </article>`;
      })
      .join("");
  }

  renderFilters();

  fetch("products.json")
    .then((res) => {
      if (!res.ok) throw new Error("โหลด products.json ไม่สำเร็จ");
      return res.json();
    })
    .then((data) => {
      products = data;
      renderProducts();
    })
    .catch((err) => {
      console.error(err);
      list.innerHTML =
        '<p class="text-center" style="grid-column:1/-1">โหลดข้อมูลสินค้าไม่สำเร็จ กรุณารีเฟรชหน้า</p>';
    });
}

/* ==========================================================================
   2) order.html
   ========================================================================== */
function initOrderPage() {
  const form = document.getElementById("orderForm");
  if (!form) return;

  const itemsEl = document.getElementById("items");
  const totalEl = document.getElementById("total");

  // เติมชื่อสินค้า (#items) และราคา (#total) จาก URL parameter
  const params = new URLSearchParams(window.location.search);
  const item = params.get("item");
  const price = params.get("price");

  if (item && itemsEl) itemsEl.value = item;
  if (price && totalEl) totalEl.value = price;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const payload = {
      customerName: document.getElementById("customerName").value.trim(),
      contact: document.getElementById("contact").value.trim(),
      items: document.getElementById("items").value.trim(),
      total: document.getElementById("total").value.trim(),
      note: document.getElementById("note").value.trim(),
    };

    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    })
      .then(() => {
        window.location.href = "thankyou.html";
      })
      .catch((error) => {
        console.error(error);
        alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        if (submitBtn) submitBtn.disabled = false;
      });
  });
}

/* ==========================================================================
   3) admin.html
   ========================================================================== */

// parse CSV เอง: รองรับเครื่องหมายคำพูด, "" ที่ escape, และขึ้นบรรทัดใหม่ในช่อง
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }

  // แถวสุดท้ายที่ไม่มี newline ปิดท้าย
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // ตัดแถวว่าง
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function initAdminPage() {
  const tbody = document.querySelector("#ordersTable tbody");
  if (!tbody) return;

  const COLS = 6; // วันเวลา, ชื่อ, เบอร์/Line, รายการ, ยอดรวม, หมายเหตุ

  tbody.innerHTML = `<tr><td colspan="${COLS}">กำลังโหลดข้อมูล...</td></tr>`;

  // ใส่ timestamp กันแคชของ Google Sheets
  const url = SHEET_CSV_URL + "&t=" + Date.now();

  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error("โหลดข้อมูลออเดอร์ไม่สำเร็จ");
      return res.text();
    })
    .then((text) => {
      const rows = parseCSV(text);
      const dataRows = rows.slice(1).reverse(); // ข้ามหัวตาราง, ล่าสุดขึ้นก่อน

      if (dataRows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${COLS}">ยังไม่มีออเดอร์</td></tr>`;
        return;
      }

      tbody.innerHTML = dataRows
        .map((r) => {
          const cells = [];
          for (let i = 0; i < COLS; i++) {
            let v = r[i] ?? "";
            if (i === 4 && v.trim() !== "" && !isNaN(Number(v))) {
              v = formatPrice(v);
            }
            cells.push(`<td>${escapeHtml(v)}</td>`);
          }
          return `<tr>${cells.join("")}</tr>`;
        })
        .join("");
    })
    .catch((err) => {
      console.error(err);
      tbody.innerHTML = `<tr><td colspan="${COLS}">โหลดข้อมูลไม่สำเร็จ กรุณารีเฟรชหน้า</td></tr>`;
    });
}

/* ---------- Init: ทำงานเฉพาะหน้าที่มี element ที่เกี่ยวข้อง ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initProductPage();
  initOrderPage();
  initAdminPage();
});
