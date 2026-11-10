const API_URL = "https://script.google.com/macros/s/AKfycbzvinmjn1g255-aZiOSIpHzHoQd-cVRkHs9W8q92BXzZKE1LeF8L9GuTo98xQSzRjSQXw/exec";

let products = [];
let employees = [];
let stockInLogs = [];
let stockOutLogs = [];

// ดึงข้อมูลจาก Google Sheets ทันทีที่เปิดเว็บ
async function loadDataFromSheets() {
  document.getElementById("productTable").innerHTML = `<tr><td colspan="7">⏳ กำลังโหลดข้อมูลจาก Google Sheets...</td></tr>`;
  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    products = (data.products || []).map(p => ({
      id: String(p.ProductID),
      name: String(p.ProductName),
      category: String(p.Category),
      price: Number(p.Price),
      qty: Number(p.StockQty)
    }));

    employees = (data.employees || []).map(e => ({
      id: String(e.EmpID),
      name: String(e.EmpName),
      position: String(e.Position),
      phone: String(e.Phone)
    }));

    stockInLogs = (data.stockIn || []).map(l => ({
      id: String(l.InID),
      date: String(l.InDate),
      product: String(l.Product),
      qty: Number(l.InQty),
      emp: String(l.EmpName)
    }));

    stockOutLogs = (data.stockOut || []).map(l => ({
      id: String(l.OutID),
      date: String(l.OutDate),
      product: String(l.Product),
      qty: Number(l.OutQty),
      remark: String(l.Remark),
      emp: String(l.EmpName)
    }));

    // หากในชีทยังว่างเปล่า ให้ใส่ข้อมูลเริ่มต้นให้อัตโนมัติ 1 ครั้ง
    if (products.length === 0) {
      products = [
        { id: "P001", name: "แปรงสีฟัน", category: "ของใช้", price: 25, qty: 15 },
        { id: "P002", name: "น้ำดื่ม", category: "เครื่องดื่ม", price: 10, qty: 48 },
        { id: "P003", name: "มาม่ารสต้มโคล้ง", category: "อาหาร", price: 7, qty: 3 }
      ];
      employees = [
        { id: "E001", name: "นายปริพล อินทร์พรหม", position: "เจ้าของร้าน", phone: "081-234-5678" },
        { id: "E002", name: "นางสาวอิ่มใจ รักบริการ", position: "พนักงานขาย", phone: "089-876-5432" }
      ];
      await syncToSheets();
    }

    renderProducts();
    renderLogs();
    renderEmployees();
  } catch (err) {
    alert("ไม่สามารถเชื่อมต่อ Google Sheets ได้ กรุณาตรวจสอบว่ากดบันทึก (Save) ใน Apps Script แล้วหรือยังค่ะ");
  }
}

// บันทึกข้อมูลทั้งหมดกลับลง Google Sheets
async function syncToSheets() {
  const payload = {
    action: "saveAll",
    products: products.map(p => ({ ProductID: p.id, ProductName: p.name, Category: p.category, Price: p.price, StockQty: p.qty })),
    stockIn: stockInLogs.map(l => ({ InID: l.id, InDate: l.date, Product: l.product, InQty: l.qty, EmpName: l.emp })),
    stockOut: stockOutLogs.map(l => ({ OutID: l.id, OutDate: l.date, Product: l.product, OutQty: l.qty, Remark: l.remark, EmpName: l.emp })),
    employees: employees.map(e => ({ EmpID: e.id, EmpName: e.name, Position: e.position, Phone: e.phone }))
  };

  await fetch(API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

function switchTab(pageId, btn) {
  document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  if (btn) btn.classList.add('active');
}

function updateDropdowns() {
  const pOptions = products.map(p => `<option value="${p.id}">${p.id} - ${p.name} (เหลือ ${p.qty})</option>`).join('');
  document.getElementById("inProductSelect").innerHTML = pOptions;
  document.getElementById("outProductSelect").innerHTML = pOptions;

  const eOptions = employees.map(e => `<option value="${e.name}">${e.id} - ${e.name}</option>`).join('');
  document.getElementById("inEmpSelect").innerHTML = eOptions;
  document.getElementById("outEmpSelect").innerHTML = eOptions;
}

function renderProducts() {
  const keyword = document.getElementById("searchInput").value.toLowerCase();
  const tbody = document.getElementById("productTable");
  tbody.innerHTML = "";
  let totalQty = 0;
  let lowCount = 0;

  products.forEach((p, index) => {
    totalQty += p.qty;
    if (p.qty < 5) lowCount++;

    if (p.name.toLowerCase().includes(keyword) || p.id.toLowerCase().includes(keyword)) {
      let statusBadge = p.qty < 5
        ? '<span class="badge-low">ใกล้หมด</span>'
        : '<span class="badge-normal">ปกติ</span>';

      tbody.innerHTML += `
        <tr>
          <td><strong>${p.id}</strong></td>
          <td class="text-left">${p.name}</td>
          <td>${p.category}</td>
          <td>${p.price}</td>
          <td><strong>${p.qty}</strong></td>
          <td>${statusBadge}</td>
          <td>
            <button class="btn-sm btn-edit" onclick="editProduct(${index})">แก้ไข</button>
            <button class="btn-sm btn-del" onclick="deleteProduct(${index})">ลบ</button>
          </td>
        </tr>
      `;
    }
  });

  document.getElementById("totalItems").innerText = products.length + " รายการ";
  document.getElementById("totalQty").innerText = totalQty + " ชิ้น";
  document.getElementById("lowStock").innerText = lowCount + " รายการ";
  updateDropdowns();
}

async function saveProduct() {
  const idx = parseInt(document.getElementById("editIndex").value);
  const id = document.getElementById("pId").value.trim();
  const name = document.getElementById("pName").value.trim();
  const category = document.getElementById("pCategory").value;
  const price = parseFloat(document.getElementById("pPrice").value);
  const qty = parseInt(document.getElementById("pQty").value);

  if (!id || !name || isNaN(price) || isNaN(qty)) {
    return alert("กรุณากรอกข้อมูลสินค้าให้ครบถ้วนนะคะ");
  }

  if (idx === -1) {
    if (products.some(p => p.id === id)) return alert("รหัสสินค้านี้มีอยู่ในระบบแล้วค่ะ");
    products.push({ id, name, category, price, qty });
  } else {
    products[idx] = { id, name, category, price, qty };
  }
  resetProductForm();
  renderProducts();
  await syncToSheets();
  alert("บันทึกข้อมูลลง Google Sheets เรียบร้อยค่ะ!");
}

function editProduct(index) {
  const p = products[index];
  document.getElementById("editIndex").value = index;
  document.getElementById("pId").value = p.id;
  document.getElementById("pName").value = p.name;
  document.getElementById("pCategory").value = p.category;
  document.getElementById("pPrice").value = p.price;
  document.getElementById("pQty").value = p.qty;
  document.getElementById("productFormTitle").innerText = "✏️ แก้ไขข้อมูลสินค้า";
  document.getElementById("btnSaveProduct").innerText = "บันทึกการแก้ไข";
  document.getElementById("btnCancelEdit").style.display = "block";
}

function resetProductForm() {
  document.getElementById("editIndex").value = -1;
  document.getElementById("pId").value = "";
  document.getElementById("pName").value = "";
  document.getElementById("pPrice").value = "";
  document.getElementById("pQty").value = "";
  document.getElementById("productFormTitle").innerText = "➕ เพิ่มสินค้าใหม่";
  document.getElementById("btnSaveProduct").innerText = "บันทึกสินค้า";
  document.getElementById("btnCancelEdit").style.display = "none";
}

async function deleteProduct(index) {
  if (confirm(`ต้องการลบสินค้า "${products[index].name}" ใช่หรือไม่คะ?`)) {
    products.splice(index, 1);
    renderProducts();
    await syncToSheets();
  }
}

async function addStockIn() {
  const id = document.getElementById("inProductSelect").value;
  const amount = parseInt(document.getElementById("inQtyInput").value);
  const emp = document.getElementById("inEmpSelect").value;

  if (isNaN(amount) || amount <= 0) return alert("กรุณากรอกจำนวนให้ถูกต้องค่ะ");

  const item = products.find(p => p.id === id);
  item.qty += amount;

  const now = new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
  const logId = "IN" + String(stockInLogs.length + 1).padStart(3, '0');
  stockInLogs.unshift({ id: logId, date: now, product: `${item.id} - ${item.name}`, qty: amount, emp });

  renderProducts();
  renderLogs();
  await syncToSheets();
  alert(`รับเข้า "${item.name}" จำนวน ${amount} และบันทึกลง Google Sheets เรียบร้อยค่ะ!`);
}

async function addStockOut() {
  const id = document.getElementById("outProductSelect").value;
  const amount = parseInt(document.getElementById("outQtyInput").value);
  const remark = document.getElementById("outRemarkInput").value.trim() || "ขายหน้าร้าน";
  const emp = document.getElementById("outEmpSelect").value;

  if (isNaN(amount) || amount <= 0) return alert("กรุณากรอกจำนวนให้ถูกต้องค่ะ");

  const item = products.find(p => p.id === id);
  if (item.qty < amount) return alert("ไม่สามารถเบิกได้! สินค้าคงเหลือไม่พอค่ะ");

  item.qty -= amount;

  const now = new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
  const logId = "OUT" + String(stockOutLogs.length + 1).padStart(3, '0');
  stockOutLogs.unshift({ id: logId, date: now, product: `${item.id} - ${item.name}`, qty: amount, remark, emp });

  renderProducts();
  renderLogs();
  await syncToSheets();
  alert(`เบิกออก "${item.name}" จำนวน ${amount} และบันทึกลง Google Sheets เรียบร้อยค่ะ!`);
}

function renderLogs() {
  document.getElementById("stockInTable").innerHTML = stockInLogs.map(l => `
    <tr>
      <td><strong>${l.id}</strong></td>
      <td>${l.date}</td>
      <td class="text-left">${l.product}</td>
      <td><span class="badge-normal">+${l.qty}</span></td>
      <td>${l.emp}</td>
    </tr>
  `).join('');

  document.getElementById("stockOutTable").innerHTML = stockOutLogs.map(l => `
    <tr>
      <td><strong>${l.id}</strong></td>
      <td>${l.date}</td>
      <td class="text-left">${l.product}</td>
      <td><span class="badge-low">-${l.qty}</span></td>
      <td>${l.remark}</td>
      <td>${l.emp}</td>
    </tr>
  `).join('');
}

async function renderEmployees() {
  document.getElementById("empTable").innerHTML = employees.map(e => `
    <tr>
      <td><strong>${e.id}</strong></td>
      <td>${e.position}</td>
      <td>${e.phone}</td>
    </tr>
  `).join('');
  updateDropdowns();
}

async function addEmployee() {
  const id = document.getElementById("eId").value.trim();
  const name = document.getElementById("eName").value.trim();
  const position = document.getElementById("ePos").value;
  const phone = document.getElementById("ePhone").value.trim();

  if (!id || !name || !phone) return alert("กรุณากรอกข้อมูลพนักงานให้ครบถ้วนค่ะ");

  employees.push({ id, name, position, phone });
  document.getElementById("eId").value = "";
  document.getElementById("eName").value = "";
  document.getElementById("ePhone").value = "";
  renderEmployees();
  await syncToSheets();
  alert("เพิ่มข้อมูลพนักงานลง Google Sheets เรียบร้อยค่ะ!");
}

loadDataFromSheets();
