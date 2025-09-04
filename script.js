// script.js
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const BASE_URL = "https://dearmaiah.com";
const API_URL = `${BASE_URL}/products.json?page=`;
const OUTPUT_DIR = path.join(__dirname, "images");
const DELAY_MS = 5000; // หน่วง 5 วิเฉพาะตอนดาวน์โหลดใหม่

// สร้างโฟลเดอร์ images ถ้ายังไม่มี
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// sanitize ชื่อไฟล์ให้ใช้ได้จริง
function sanitizeFileName(name) {
  return name
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50);
}

// ดาวน์โหลดรูปภาพ
async function downloadImage(url, filename) {
  const filepath = path.join(OUTPUT_DIR, filename);

  // ถ้ามีไฟล์แล้ว skip เลย ไม่หน่วง
  if (fs.existsSync(filepath)) {
    console.log(`⏩ Skipped: ${filename}`);
    return false; // ไม่ต้องหน่วง
  }

  try {
    const res = await axios.get(url, { responseType: "arraybuffer" });
    fs.writeFileSync(filepath, res.data);
    console.log(`✅ Saved: ${filename}`);
    return true; // ดาวน์โหลดใหม่ ต้องหน่วง
  } catch (err) {
    console.error(`❌ Failed: ${url} (${err.message})`);
    return false;
  }
}

// โหลดรายการสินค้าแต่ละหน้า
async function fetchPage(page) {
  try {
    const res = await axios.get(`${API_URL}${page}`);
    const items = res.data.items || [];
    if (items.length === 0) {
      console.log("📌 No items found on page", page);
      return [];
    }
    return items;
  } catch (err) {
    console.error(`❌ Error loading page ${page}:`, err.message);
    return [];
  }
}

// โหลดรายละเอียดสินค้าแต่ละตัว
async function fetchItem(id) {
  try {
    const res = await axios.get(`${BASE_URL}/products/${id}.json`);
    return res.data;
  } catch (err) {
    console.error(`❌ Error loading item ${id}:`, err.message);
    return null;
  }
}

// main
async function main() {
  const args = process.argv.slice(2);
  const startPage = parseInt(args[0] || "1", 10);
  const endPage = parseInt(args[1] || startPage, 10);

  for (let page = startPage; page <= endPage; page++) {
    console.log(`\n📄 Loading page ${page}...`);
    const items = await fetchPage(page);

    for (const item of items) {
      // ตรวจสอบว่ามีไฟล์ของสินค้านี้อยู่แล้ว
      const productFilesExist = fs.readdirSync(OUTPUT_DIR).some(file =>
        file.startsWith(`${item.id}-`)
      );
      if (productFilesExist) {
        console.log(`⏩ Skipped item ${item.id} (${item.name})`);
        continue; // ไม่ต้อง fetch
      }

      const product = await fetchItem(item.id);
      if (!product) continue;

      // โหลดรูปย่อยจาก photos
      const photos = product.photos || [];
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        if (!photo || !photo.normal) continue;
        if (photo.normal.includes("no_image_available")) continue;

        const imgUrl = photo.normal.startsWith("http")
          ? photo.normal
          : BASE_URL + photo.normal;

        const filename = `${product.id}-${sanitizeFileName(product.name)}-${i+1}.jpg`;

        const downloaded = await downloadImage(imgUrl, filename);

        // หน่วงเฉพาะตอนดาวน์โหลดใหม่
        if (downloaded) {
          await new Promise((r) => setTimeout(r, DELAY_MS));
        }
      }
    }
  }

  console.log("\n🎉 All done!");
}

main();
