// script.js
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const BASE_URL = "https://dearmaiah.com";
const API_URL = `${BASE_URL}/products.json?page=`;
const OUTPUT_DIR = path.join(__dirname, "images");

// สร้างโฟลเดอร์ images ถ้ายังไม่มี
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

// sanitize ชื่อไฟล์ให้ใช้ได้จริง
function sanitizeFileName(name) {
  return name
    .replace(/[^a-zA-Z0-9-_]/g, "-") // เอาเฉพาะตัวอักษร/ตัวเลข/ขีดกลาง/ขีดล่าง
    .replace(/-+/g, "-") // ลดขีดซ้ำ ๆ ให้เหลือขีดเดียว
    .substring(0, 50); // จำกัดความยาว กันยาวเกิน
}

async function downloadImage(url, filename) {
  try {
    const res = await axios.get(url, { responseType: "arraybuffer" });
    fs.writeFileSync(filename, res.data);
    console.log("✅ Saved:", filename);
  } catch (err) {
    console.error("❌ Failed:", url, err.message);
  }
}

async function fetchPage(page) {
  try {
    const res = await axios.get(API_URL + page);
    const data = res.data;

    if (!data.items || data.items.length === 0) {
      console.log("📌 No more items. Done!");
      return false;
    }

    for (const item of data.items) {
      if (item.photo && item.photo.normal) {
        let imgUrl = item.photo.normal;

        // ❌ ข้ามรูป default ที่ไม่มีจริง
        if (imgUrl.includes("no_image_available.jpg")) {
          console.log("⏭️ Skip default image for", item.id);
          continue;
        }

        // ถ้าเป็น relative path → เติม BASE_URL
        if (imgUrl.startsWith("/")) {
          imgUrl = BASE_URL + imgUrl;
        }

        const safeName = sanitizeFileName(item.name || "noname");
        const filename = path.join(OUTPUT_DIR, `${item.id}-${safeName}.jpg`);
        await downloadImage(imgUrl, filename);
      }
    }

    return true;
  } catch (err) {
    console.error("Error fetching page", page, err.message);
    return false;
  }
}

async function run() {
  // ใช้ args กำหนดหน้าแรก-หน้าสุดท้าย
  // ตัวอย่าง: node script.js 2 5  (โหลด page 2 ถึง 5)
  const startPage = parseInt(process.argv[2] || "1", 10);
  const endPage = parseInt(process.argv[3] || startPage, 10);

  let page = startPage;

  while (page <= endPage) {
    console.log(`\n📥 Fetching page ${page}...`);
    const hasData = await fetchPage(page);
    if (!hasData) break;
    page++;
    await new Promise((r) => setTimeout(r, 1000)); // wait 1s
  }
}

run();
