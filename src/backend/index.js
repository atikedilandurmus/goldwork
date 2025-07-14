import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import csv from "csv-parser";
import pool from "./db.js"; // PostgreSQL bağlantı dosyan
import XLSX from "xlsx";
import iconv from "iconv-lite";
import { parse } from "csv-parse";
import bcrypt from "bcrypt";
import bwipjs from "bwip-js";
import pg from "pg";
import jwt from "jsonwebtoken";
import axios from "axios";
import cron from "node-cron";
import path from "path";

const { Pool, types } = pg;

// PostgreSQL DATE (OID: 1082) ve TIMESTAMP (OID: 1114) alanlarını string olarak al
types.setTypeParser(1082, (val) => val); // DATE
types.setTypeParser(1114, (val) => val); // TIMESTAMP WITHOUT TIME ZONE

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Multer dosya yükleme ayarı
const upload = multer({ dest: "uploads/" });

async function generateBarcodeBase64(data) {
  try {
    const png = await bwipjs.toBuffer({
      bcid: "code128", // Barkod tipi
      text: data, // Barkod verisi
      scale: 3, // Görüntü ölçeği
      height: 10, // Barkod yüksekliği (milimetre)
      includetext: true, // Barkodun altında metin göster
      textxalign: "center", // Metin hizalama
    });
    return png.toString("base64"); // Base64 string döndür
  } catch (err) {
    console.error("Barkod üretme hatası:", err);
    return null;
  }
}

// Veritabanı bağlantı kontrolü
(async () => {
  try {
    const client = await pool.connect();
    await client.query("SELECT NOW()");
    client.release();
    console.log("✅ Veritabanına başarıyla bağlanıldı.");
  } catch (err) {
    console.error("❌ Veritabanına bağlanılamadı:", err.message);
    process.exit(1);
  }
})();
const SECRET_KEY = process.env.JWT_SECRET || "gizliAnahtar"; // .env dosyasına taşıman tavsiye edilir

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const userResult = await pool.query(
      `SELECT u.id, u.email, u.password_hash, r.role_name 
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = $1`,
      [email]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({ message: "Kullanıcı bulunamadı" });
    }

    const user = userResult.rows[0];
    const isPasswordMatch = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordMatch) {
      return res.status(401).json({ message: "Şifre yanlış" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role_name,
      },
      SECRET_KEY,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Giriş başarılı",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role_name,
      },
    });
  } catch (error) {
    console.error("Login hatası:", error);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Token yok" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token yok" });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (err) {
    console.log("JWT verify error:", err);
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ error: "Oturum süresi doldu. Lütfen tekrar giriş yapın." });
    }
    return res.status(401).json({ error: "Geçersiz token" });
  }
};

app.get("/check-token", authMiddleware, (req, res) => {
  res.json({ valid: true });
});
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existing = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (existing.rowCount > 0) {
      return res.status(400).json({ message: "Email zaten kayıtlı" });
    }

    const hash = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      `INSERT INTO users (username, email, password_hash, role_id, created_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
      [name, email, hash, 2] // 2: varsayılan kullanıcı rolü
    );

    res
      .status(201)
      .json({ message: "Kayıt başarılı", userId: newUser.rows[0].id });
  } catch (err) {
    console.error("Kayıt hatası:", err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

app.get("/users", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.username, u.email, r.role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Kullanıcıları alma hatası:", err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

app.post("/users", authMiddleware, async (req, res) => {
  const { username, email, password, role_id } = req.body;

  if (!username || !email || !password || !role_id) {
    return res.status(400).json({ error: "Eksik alanlar var" });
  }

  try {
    // Şifreyi hash'le (örneğin bcrypt ile)
    const hashedPassword = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash, role_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [username, email, hashedPassword, role_id]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.put("/users/:id/role", async (req, res) => {
  const userId = req.params.id;
  const { role_id } = req.body;

  try {
    await pool.query("UPDATE users SET role_id = $1 WHERE id = $2", [
      role_id,
      userId,
    ]);
    res.json({ message: "Rol güncellendi" });
  } catch (err) {
    console.error("Rol güncelleme hatası:", err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});
app.get("/roles", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, role_name FROM roles");
    res.json(result.rows);
  } catch (err) {
    console.error("Roller alınırken hata:", err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

app.delete("/users/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const deleted = await pool.query("DELETE FROM users WHERE id = $1", [
      userId,
    ]);
    if (deleted.rowCount === 0) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }
    res.status(200).json({ message: "Kullanıcı silindi" });
  } catch (err) {
    console.error("Kullanıcı silme hatası:", err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// Multer setup (dosyayı "uploads/" klasörüne kaydeder)
const upload_ring = multer({ dest: "uploads_ring/" });

app.post("/upload_ring", upload_ring.single("file"), async (req, res) => {
  const filePath = req.file.path;
  const originalName = req.file.originalname;

  try {
    let data;

    if (originalName.endsWith(".xlsx") || originalName.endsWith(".xls")) {
      const workbook = XLSX.readFile(filePath);
      const ws = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(ws, { defval: "" });
      data = formatData(rawData);
    } else if (originalName.endsWith(".csv")) {
      const buffer = fs.readFileSync(filePath);
      const content = iconv.decode(buffer, "utf8");
      data = await new Promise((resolve, reject) => {
        parse(content, { columns: true, trim: true }, (err, records) => {
          if (err) reject(err);
          else resolve(formatData(records));
        });
      });
    } else {
      return res.status(400).json({ error: "Desteklenmeyen dosya türü" });
    }
    console.log("Okunan ve işlenen veriler:", data); // <- Burada data'yı konsola yazdırıyoruz

    fs.unlinkSync(filePath);

    const client = await pool.connect();
    try {
      await insertProducts(client, data);
      res.json({
        success: true,
        message: "Ürünler başarıyla eklendi",
        count: data.length,
      });
    } catch (err) {
      console.error("DB ekleme hatası:", err);
      res
        .status(500)
        .json({ error: "Veritabanına ekleme sırasında hata oluştu" });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Dosya işleme hatası:", err);
    res.status(500).json({ error: "Dosya işleme sırasında hata oluştu" });
  }
});

// CSV parse işleminde header satırını aldıktan sonra kullan:
// const newHeaders = renameDuplicateKeys(originalHeaders);

// Sonra her satırdaki verileri bu yeni header'lara göre eşle:
function parseNumeric(value) {
  if (!value) return null;
  // Virgülü noktaya çevir, sonra sayıya çevir
  const replaced = value.toString().replace(",", ".");
  const num = Number(replaced);
  return isNaN(num) ? null : num;
}

function formatData(data) {
  return data.map((row) => {
    const stones = [];
    const maxStones = 4;

    for (let i = 1; i <= maxStones; i++) {
      const suffix = i === 1 ? "" : ` ${i}`;
      const sekli = (row[`ŞEKLİ${suffix}`] || "").trim();
      const olcusu = (row[`BOYU${suffix}`] || "").trim();
      const adetStr = (row[`ADET${suffix}`] || "").trim();
      const adet = adetStr ? Number(adetStr) : 0;

      if (sekli && olcusu && adet > 0) {
        stones.push({
          sekli,
          olcusu,
          adet,
        });
      }
    }

    return {
      sku_kodu: row["SKU KODU"],
      sira_numarasi: row["SIRA NUMARASI"],
      fotograf: row["FOTOĞRAF"],
      tip: row["TİP"],
      adi: row["ADI"],
      magaza: row["MAĞAZA"],
      karati: parseNumeric(row["KARATI"]),
      grami: parseNumeric(row["GRAMI"]),
      genislik: parseNumeric(row["GENİŞLİK"]),
      uzunluk: parseNumeric(row["UZUNLUK"]),
      kalinlik: parseNumeric(row["KALINLIK"]),
      kol_olcusu: parseNumeric(row["KOL ÖLÇÜSÜ"]),
      tas_agirligi: parseNumeric(row["TAŞ AĞIRLIĞI"]),
      stones,
    };
  });
}

async function insertProducts(client, products) {
  try {
    await client.query("BEGIN");

    for (const product of products) {
      // Önce product tablosuna ekle
      const productResult = await client.query(
        `INSERT INTO products (
          sku_kodu, fotograf, tip, adi, magaza,
          karati, grami, genislik, uzunluk, kalinlik, kol_olcusu, tas_agirligi
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING id`,
        [
          product.sku_kodu,
          product.fotograf,
          product.tip,
          product.adi,
          product.magaza,
          product.karati || null,
          product.grami || null,
          product.genislik || null,
          product.uzunluk || null,
          product.kalinlik || null,
          product.kol_olcusu || null,
          product.tas_agirligi || null,
        ]
      );

      const productId = productResult.rows[0].id;

      // Taşları ekle
      for (const stone of product.stones) {
        // stones tablosundan sekli ile stone_id al
        let stoneId = null;

        const stoneResult = await client.query(
          "SELECT id FROM stones WHERE sekli = $1",
          [stone.sekli]
        );

        if (stoneResult.rows.length > 0) {
          stoneId = stoneResult.rows[0].id;
        } else {
          // Yeni taş tipi ekle
          const insertStoneResult = await client.query(
            "INSERT INTO stones (sekli) VALUES ($1) RETURNING id",
            [stone.sekli]
          );
          stoneId = insertStoneResult.rows[0].id;
        }

        // stone_measurements tablosuna ölçüyü kaydet
        let stoneMeasurementId = null;

        const stoneMeasurementResult = await client.query(
          "SELECT id FROM stone_measurements WHERE olcusu = $1 AND stone_id = $2",
          [stone.olcusu, stoneId]
        );

        if (stoneMeasurementResult.rows.length > 0) {
          stoneMeasurementId = stoneMeasurementResult.rows[0].id;
        } else {
          const insertStoneMeasurementResult = await client.query(
            "INSERT INTO stone_measurements (olcusu, stone_id) VALUES ($1, $2) RETURNING id",
            [stone.olcusu, stoneId]
          );
          stoneMeasurementId = insertStoneMeasurementResult.rows[0].id;
        }

        // product_stones tablosuna ekle
        await client.query(
          `INSERT INTO product_stones (product_id, stone_measurement_id, adet)
           VALUES ($1, $2, $3)`,
          [productId, stoneMeasurementId, stone.adet]
        );
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}
function parseSaleDate(dateStr) {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;

  let [month, day, year] = parts;
  month = parseInt(month, 10);
  day = parseInt(day, 10);
  year = parseInt(year, 10);

  if (year < 100) year += 2000;

  const date = new Date(year, month - 1, day);
  return date;
}

async function createShopCSVs(client) {
  try {
    // Önce tüm mağazaların isimlerini alalım
    const result = await client.query(
      `SELECT DISTINCT magaza FROM imalat_takip WHERE magaza IS NOT NULL`
    );
    const rows = result.rows || [];

    const shopsData = {};

    for (const row of rows) {
      const shop = row.magaza;
      if (!shop) continue;

      // Her mağaza için ürün bilgilerini çek
      const shopResult = await client.query(
        `SELECT * FROM imalat_takip WHERE magaza = $1 ORDER BY tarih ASC`,
        [shop]
      );
      const shopRows = shopResult.rows || [];

      if (shopRows.length === 0) continue;

      // Mağaza ismini key olarak ürünleri dizi halinde tut
      shopsData[shop] = shopRows;
    }

    return shopsData; // Örnek: { "MagazaA": [urun1, urun2,...], "MagazaB": [...], ... }
  } catch (err) {
    console.error("Mağaza ürünleri getirilirken hata:", err.message);
    throw err;
  }
}

// CSV yükleme endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Dosya yüklenmedi." });

  const results = [];
  const filePath = req.file.path;
  const fileName = req.file.originalname;

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (row) => results.push(row))
    .on("end", async () => {
      const client = await pool.connect();
      try {
        // Dosya bilgisi kaydet
        await client.query(`INSERT INTO uploads (file_name) VALUES ($1)`, [
          fileName,
        ]);

        for (const row of results) {
          const checkRes = await client.query(
            `SELECT 1 FROM jsv_staging WHERE order_id = $1 AND transaction_id = $2 LIMIT 1`,
            [row["Order ID"], row["Transaction ID"]]
          );

          if (checkRes.rowCount === 0) {
            await client.query(
              `INSERT INTO jsv_staging (
                sale_date, item_name, buyer, quantity, price, coupon_code, coupon_details, discount_amount,
                shipping_discount, order_shipping, order_sales_tax, item_total, currency, transaction_id,
                listing_id, date_paid, date_shipped, ship_name, ship_address1, ship_address2, ship_city,
                ship_state, ship_zipcode, ship_country, order_id, variations, order_type, listings_type,
                payment_type, inperson_discount, inperson_location, vat_paid_by_buyer, sku
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8,
                $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
                $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33
              )`,
              [
                row["Sale Date"],
                row["Item Name"],
                row["Buyer"],
                row["Quantity"],
                row["Price"],
                row["Coupon Code"],
                row["Coupon Details"],
                row["Discount Amount"],
                row["Shipping Discount"],
                row["Order Shipping"],
                row["Order Sales Tax"],
                row["Item Total"],
                row["Currency"],
                row["Transaction ID"],
                row["Listing ID"],
                row["Date Paid"],
                row["Date Shipped"],
                row["Ship Name"],
                row["Ship Address1"],
                row["Ship Address2"],
                row["Ship City"],
                row["Ship State"],
                row["Ship Zipcode"],
                row["Ship Country"],
                row["Order ID"],
                row["Variations"],
                row["Order Type"],
                row["Listings Type"],
                row["Payment Type"],
                row["InPerson Discount"],
                row["InPerson Location"],
                row["VAT Paid by Buyer"],
                row["SKU"],
              ]
            );
            await processStagingToMain(client, row);
          } else {
            console.log(
              `Tekrarlanan kayıt atlandı: order_id=${row["Order ID"]}, transaction_id=${row["Transaction ID"]}`
            );
          }
        }
        await createShopCSVs(client);

        res.json({
          message:
            "CSV başarıyla yüklendi ve veritabanına aktarıldı (tekrarlar atlandı).",
        });
      } catch (error) {
        console.error("🧨 Hata:", error.message);
        res.status(500).json({ error: "Veritabanı hatası." });
      } finally {
        client.release();
      }
    })
    .on("error", (err) => {
      console.error("CSV okuma hatası:", err);
      res.status(500).json({ error: "CSV işlenirken hata oluştu." });
    });
});

async function getShopFromSku(client, skuLower) {
  if (!skuLower) return null;
  const { rows } = await client.query(`SELECT name, prefix FROM shops`);
  for (const row of rows) {
    if (skuLower.includes(row.prefix.toLowerCase())) {
      return row.name;
    }
  }
  return null;
}
function decodeHtmlEntities(text) {
  if (!text) return "";
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

app.post("/jsv_staging", authMiddleware, async (req, res) => {
  const row = req.body;

  const client = await pool.connect();

  try {
    // Tekrarlı kayıt kontrolü
    const checkRes = await client.query(
      `SELECT 1 FROM jsv_staging WHERE order_id = $1 AND transaction_id = $2 LIMIT 1`,
      [row.order_id, row.transaction_id]
    );

    if (checkRes.rowCount > 0) {
      return res.status(409).json({ error: "Kayıt zaten var" });
    }

    // jsv_staging tablosuna kaydet
    await client.query(
      `INSERT INTO jsv_staging (
        sale_date, item_name, buyer, quantity, price, coupon_code, coupon_details, discount_amount,
        shipping_discount, order_shipping, order_sales_tax, item_total, currency, transaction_id,
        listing_id, date_paid, date_shipped, ship_name, ship_address1, ship_address2, ship_city,
        ship_state, ship_zipcode, ship_country, order_id, variations, order_type, listings_type,
        payment_type, inperson_discount, inperson_location, vat_paid_by_buyer, sku
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
        $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33
      )`,
      [
        row.sale_date,
        row.item_name,
        row.buyer,
        row.quantity,
        row.price,
        row.coupon_code,
        row.coupon_details,
        row.discount_amount,
        row.shipping_discount,
        row.order_shipping,
        row.order_sales_tax,
        row.item_total,
        row.currency,
        row.transaction_id,
        row.listing_id,
        row.date_paid,
        row.date_shipped,
        row.ship_name,
        row.ship_address1,
        row.ship_address2,
        row.ship_city,
        row.ship_state,
        row.ship_zipcode,
        row.ship_country,
        row.order_id,
        row.variations,
        row.order_type,
        row.listings_type,
        row.payment_type,
        row.inperson_discount,
        row.inperson_location,
        row.vat_paid_by_buyer,
        row.sku,
      ]
    );

    // staging'den editted ve imalat_takip tablolarına işleme fonksiyonu
    await processStagingToMain(client, row);

    res.json({ message: "Kayıt başarılı" });
  } catch (error) {
    console.error("Hata:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  } finally {
    client.release();
  }
});
async function processStagingToMain(client, row) {
  const getField = (row, keys) => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null) return row[key];
    }
    return undefined;
  };

  // Alanları alırken hem CSV hem form gönderimindeki isimlere bakıyoruz
  const saleDateStr = getField(row, ["Sale Date", "sale_date"]);
  if (!saleDateStr) throw new Error("sale_date yok");

  // Tarihi PostgreSQL formatına çeviren fonksiyon
  const convertDateToPostgresFormat = (dateStr) => {
    if (!dateStr) return null;

    // Eğer zaten YYYY-MM-DD formatında ise direkt döndür
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    // MM/DD/YY veya MM/DD/YYYY formatını YYYY-MM-DD ye çevir
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      let [month, day, year] = parts;
      if (year.length === 2) {
        year = parseInt(year, 10) < 50 ? `20${year}` : `19${year}`;
      }
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    return null;
  };

  // Benzersiz ID oluşturuyoruz
  const unique_id = `${getField(row, ["Order ID", "order_id"]) || ""}${
    getField(row, ["Transaction ID", "transaction_id"]) || ""
  }`;
  const skuLower = (getField(row, ["SKU", "sku"]) || "").toLowerCase();

  // shops tablosundan mağaza adını getir (senin mevcut fonksiyonun)
  let shops = await getShopFromSku(client, skuLower);

  // Variations alanı
  const variationsText = getField(row, ["Variations", "variations"]) || "";

  // Gold carat, color, size, personalization çıkarımı (senin mevcut kodun)
  let gold_carat = "";
  let color = "";
  let size = "";
  let personalization = "";

  const varLower = variationsText.toLowerCase();
  if (varLower.includes("10k")) gold_carat = "10K";
  else if (varLower.includes("14k")) gold_carat = "14K";
  else if (varLower.includes("18k")) gold_carat = "18K";

  if (varLower.includes("yellow")) color = "YELLOW";
  else if (varLower.includes("rose")) color = "ROSE";
  else if (varLower.includes("white")) color = "WHITE";

  const sizeMatch = variationsText.match(
    /Ring size:\s*([0-9]+(?: [0-9]\/[0-9])?)/i
  );
  if (sizeMatch) size = sizeMatch[1];

  const persMatch = variationsText.match(
    /Personalization:\s*([\s\S]*?)(?=(Chain Length:|Chain Size:|Necklace Length:|Color:|Number of the Disc|Personalization:|$))/i
  );
  personalization = persMatch
    ? persMatch[1].trim().replace(/[,;-\s]+$/, "")
    : "";
  personalization = decodeHtmlEntities(personalization);

  const chainKeys = ["Chain Length", "Chain Size", "Necklace Length"];
  let chainParts = [];
  for (const key of chainKeys) {
    const regex = new RegExp(key + ":\\s*([^,;\\n]+)", "i");
    const match = variationsText.match(regex);
    if (match) {
      let val = decodeHtmlEntities(match[1].trim());
      chainParts.push(`${key}: ${val}`);
    }
  }
  if (chainParts.length > 0) {
    if (personalization) personalization += " | ";
    personalization += chainParts.join(" | ");
  }

  // Kargo tipi hesaplama
  let shipping = "EKSP";
  const orderShippingNum = Number(
    getField(row, ["Order Shipping", "order_shipping"]) || 0
  );
  const shipCountry = (
    getField(row, ["Ship Country", "ship_country"]) || ""
  ).toLowerCase();

  if (orderShippingNum > 0) shipping = "EKSP";
  else if (shipCountry.includes("states")) shipping = "EKO";

  const fullname_fulladdress = [
    row["Ship Name"],
    row["Ship Address1"],
    row["Ship Address2"],
    row["Ship City"],
    row["Ship State"],
    row["Ship Zipcode"],
    row["Ship Country"],
  ]
    .filter(Boolean)
    .join(" ");

  const product_features = (row["SKU"] || "") + size + gold_carat + color;
  const shipNameParts = (row["Ship Name"] || "").split(" ");
  const [name_part_1, name_part_2, name_part_3, name_part_4, name_part_5] =
    shipNameParts.concat(["", "", "", "", ""]).slice(0, 5);

  const sql = `
    INSERT INTO jsv_editted (
      unique_id, sale_date, item_name, buyer, quantity, price,
      coupon_code, coupon_details, discount_amount, shipping_discount,
      order_shipping, order_sales_tax, item_total, currency, transaction_id,
      listing_id, date_paid, date_shipped, ship_name, ship_address1,
      ship_address2, ship_city, ship_state, ship_zipcode, ship_country,
      order_id, variations, order_type, listings_type, payment_type,
      inperson_discount, inperson_location, vat_paid_by_buyer, sku,
      shops, gold_carat, color, size, personalization, shipping,
      name_part_1, name_part_2, name_part_3, name_part_4, name_part_5,
     fullname_fulladdress, product_features
    ) VALUES (
      $1,$2,$3,$4,$5,$6,
      $7,$8,$9,$10,
      $11,$12,$13,$14,$15,
      $16,$17,$18,$19,$20,
      $21,$22,$23,$24,$25,
      $26,$27,$28,$29,$30,
      $31,$32,$33,$34,$35,
      $36,$37,$38,$39,$40,
      $41,$42,$43,$44,$45,
      $46,$47
    )
    ON CONFLICT (unique_id) DO UPDATE SET
      sale_date = EXCLUDED.sale_date,
      item_name = EXCLUDED.item_name,
      buyer = EXCLUDED.buyer,
      quantity = EXCLUDED.quantity,
      price = EXCLUDED.price,
      coupon_code = EXCLUDED.coupon_code,
      coupon_details = EXCLUDED.coupon_details,
      discount_amount = EXCLUDED.discount_amount,
      shipping_discount = EXCLUDED.shipping_discount,
      order_shipping = EXCLUDED.order_shipping,
      order_sales_tax = EXCLUDED.order_sales_tax,
      item_total = EXCLUDED.item_total,
      currency = EXCLUDED.currency,
      transaction_id = EXCLUDED.transaction_id,
      listing_id = EXCLUDED.listing_id,
      date_paid = EXCLUDED.date_paid,
      date_shipped = EXCLUDED.date_shipped,
      ship_name = EXCLUDED.ship_name,
      ship_address1 = EXCLUDED.ship_address1,
      ship_address2 = EXCLUDED.ship_address2,
      ship_city = EXCLUDED.ship_city,
      ship_state = EXCLUDED.ship_state,
      ship_zipcode = EXCLUDED.ship_zipcode,
      ship_country = EXCLUDED.ship_country,
      order_id = EXCLUDED.order_id,
      variations = EXCLUDED.variations,
      order_type = EXCLUDED.order_type,
      listings_type = EXCLUDED.listings_type,
      payment_type = EXCLUDED.payment_type,
      inperson_discount = EXCLUDED.inperson_discount,
      inperson_location = EXCLUDED.inperson_location,
      vat_paid_by_buyer = EXCLUDED.vat_paid_by_buyer,
      sku = EXCLUDED.sku,
      shops = EXCLUDED.shops,
      gold_carat = EXCLUDED.gold_carat,
      color = EXCLUDED.color,
      size = EXCLUDED.size,
      personalization = EXCLUDED.personalization,
      shipping = EXCLUDED.shipping,
      name_part_1 = EXCLUDED.name_part_1,
      name_part_2 = EXCLUDED.name_part_2,
      name_part_3 = EXCLUDED.name_part_3,
      name_part_4 = EXCLUDED.name_part_4,
      name_part_5 = EXCLUDED.name_part_5,
      fullname_fulladdress = EXCLUDED.fullname_fulladdress,
      product_features = EXCLUDED.product_features
  `;

  const values = [
    unique_id,
    row["Sale Date"],
    row["Item Name"],
    row["Buyer"],
    row["Quantity"],
    row["Price"],
    row["Coupon Code"],
    row["Coupon Details"],
    row["Discount Amount"],
    row["Shipping Discount"],
    row["Order Shipping"],
    row["Order Sales Tax"],
    row["Item Total"],
    row["Currency"],
    row["Transaction ID"],
    row["Listing ID"],
    row["Date Paid"],
    row["Date Shipped"],
    row["Ship Name"],
    row["Ship Address1"],
    row["Ship Address2"],
    row["Ship City"],
    row["Ship State"],
    row["Ship Zipcode"],
    row["Ship Country"],
    row["Order ID"],
    row["Variations"],
    row["Order Type"],
    row["Listings Type"],
    row["Payment Type"],
    row["InPerson Discount"],
    row["InPerson Location"],
    row["VAT Paid by Buyer"],
    row["SKU"],
    shops,
    gold_carat,
    color,
    size,
    personalization,
    shipping,
    name_part_1,
    name_part_2,
    name_part_3,
    name_part_4,
    name_part_5,
    fullname_fulladdress,
    product_features,
  ];

  await client.query(sql, values);

  async function getUrunAdiBySku(client, sku) {
    if (!sku) return null;
    let result = await client.query(
      "SELECT adi FROM products WHERE sku_kodu = $1 LIMIT 1",
      [sku]
    );
    if (result.rowCount > 0) return result.rows[0].adi;

    result = await client.query(
      "SELECT adi FROM blg_pendants WHERE sku = $1 LIMIT 1",
      [sku]
    );
    if (result.rowCount > 0) return result.rows[0].adi;

    return null;
  }

  // Tahmini teslimat tarihi hesapla (veritabanından tatilleri alarak)
  async function getEstimatedDeliveryDateFromDB(client, orderDateStr) {
    if (!orderDateStr) return null;
    const orderDate = new Date(orderDateStr);
    if (isNaN(orderDate)) return null;

    const { rows } = await client.query(
      "SELECT tatil_tarihi FROM resmi_tatiller"
    );
    const holidays = rows.map((row) => formatDate(new Date(row.tatil_tarihi)));

    return addWorkDays(orderDate, 5, holidays);
  }

  function formatDate(date) {
    return date.toISOString().split("T")[0];
  }

  function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  function isHoliday(date, holidays) {
    const dateStr = formatDate(date);
    return holidays.includes(dateStr);
  }

  function addWorkDays(startDate, workDays, holidays) {
    let addedDays = 0;
    let currentDate = new Date(startDate);

    while (addedDays < workDays) {
      currentDate.setDate(currentDate.getDate() + 1);
      if (!isWeekend(currentDate) && !isHoliday(currentDate, holidays)) {
        addedDays++;
      }
    }

    return currentDate;
  }

  const check = false;
  const tarih = convertDateToPostgresFormat(row["Sale Date"]);
  const fotograf = null;
  const magaza = shops;
  const musteri_adi = row["Ship Name"] || null;
  const uyari = null;
  const urun_kodu = row["SKU"] || null;
  const urun_adi = await getUrunAdiBySku(client, urun_kodu);
  const olcusu = size || null;
  const ayari = gold_carat || null;
  const colorVal = color || null;
  const imalat_durumu = "Yeni Sipariş";
  const stok_durumu = null;
  const kisellestirme = personalization || null;
  const aciklama = null;
  const tasi = null;
  const siparis_kodu = row["Order ID"] || null;
  const kargo_adresi = fullname_fulladdress || null;
  const barkodBase64 = siparis_kodu
    ? await generateBarcodeBase64(siparis_kodu)
    : null;
  const kargo = shipping || null;
  const coklu = Number(row["Quantity"]) > 1 ? "ÇOKLU" : null;

  const tahmini_teslimat = await getEstimatedDeliveryDateFromDB(client, tarih);

  await client.query(
    `INSERT INTO imalat_takip (
    unique_id, is_checked, tarih, fotograf, magaza, musteri_adi, uyari, urun_adi,
    urun_kodu, olcusu, ayari, color, imalat_durumu, stok_durumu, kisellestirme,
    aciklama, tasi, siparis_kodu, kargo_adresi, barkod, kargo, tahmini_teslimat,coklu
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9,
    $10, $11, $12, $13, $14, $15, $16,
    $17, $18, $19, $20, $21, $22, $23
  ) ON CONFLICT (unique_id) DO UPDATE SET
    tarih = EXCLUDED.tarih,
    magaza = EXCLUDED.magaza,
    musteri_adi = EXCLUDED.musteri_adi,
    uyari = EXCLUDED.uyari,
    urun_adi = EXCLUDED.urun_adi,
    urun_kodu = EXCLUDED.urun_kodu,
    olcusu = EXCLUDED.olcusu,
    ayari = EXCLUDED.ayari,
    color = EXCLUDED.color,
    imalat_durumu = EXCLUDED.imalat_durumu,
    stok_durumu = EXCLUDED.stok_durumu,
    kisellestirme = EXCLUDED.kisellestirme,
    aciklama = EXCLUDED.aciklama,
    tasi = EXCLUDED.tasi,
    siparis_kodu = EXCLUDED.siparis_kodu,
    kargo_adresi = EXCLUDED.kargo_adresi,
    barkod = EXCLUDED.barkod,
    kargo = EXCLUDED.kargo,
    tahmini_teslimat = EXCLUDED.tahmini_teslimat,
      coklu = EXCLUDED.coklu

`,
    [
      unique_id,
      check,
      tarih,
      fotograf,
      magaza,
      musteri_adi,
      uyari,
      urun_adi,
      urun_kodu,
      olcusu,
      ayari,
      colorVal,
      imalat_durumu,
      stok_durumu,
      kisellestirme,
      aciklama,
      tasi,
      siparis_kodu,
      kargo_adresi,
      barkodBase64,
      kargo,
      tahmini_teslimat,
      coklu,
    ]
  );
}

app.get("/missing-shops", async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT DISTINCT sku
       FROM jsv_editted
       WHERE (shops IS NULL OR shops = '')
         AND sku IS NOT NULL
         AND sku <> ''`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Sunucu hatası" });
  } finally {
    client.release();
  }
});

// Express örneği
app.post("/shops/update-missing", async (req, res) => {
  const { prefix, shopName } = req.body;

  if (!prefix || !shopName) {
    return res.status(400).json({ error: "prefix ve shopName gerekli." });
  }

  try {
    // shops kolonu null olan ve SKU'sunda prefix geçen kayıtları güncelle
    const result = await pool.query(
      `UPDATE jsv_editted
       SET shops = $1
       WHERE shops IS NULL AND LOWER(sku) LIKE LOWER($2)`,
      [shopName, `%${prefix}%`]
    );

    res.json({ updatedCount: result.rowCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Güncelleme işlemi başarısız oldu." });
  }
});

app.get("/api/all-shops", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Yetkisiz" });

  try {
    const result = await pool.query("SELECT name FROM shops ORDER BY name ASC");
    res.json(result.rows.map((r) => r.name));
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});
app.post("/api/user_shops", authMiddleware, async (req, res) => {
  const { user_email, shops } = req.body;
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Yetkisiz" });

  try {
    await pool.query("DELETE FROM user_shops WHERE user_email = $1", [
      user_email,
    ]);

    for (const shop of shops) {
      await pool.query(
        "INSERT INTO user_shops (user_email, shop_name) VALUES ($1, $2)",
        [user_email, shop]
      );
    }

    res.json({ message: "Yetkiler güncellendi." });
  } catch (error) {
    console.error("Yetki güncelleme hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.get("/api/user_shops/:email", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Yetkisiz" });

  const email = req.params.email;
  try {
    const result = await pool.query(
      "SELECT shop_name FROM user_shops WHERE user_email = $1",
      [email]
    );
    res.json(result.rows.map((r) => r.shop_name));
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.get("/api/shops", authMiddleware, async (req, res) => {
  try {
    // Kullanıcının yetkili olduğu mağazalar user_shops tablosunda kayıtlı ise onlardan çek:
    const result = await pool.query(
      `SELECT s.name FROM shops s
       JOIN user_shops us ON s.name = us.shop_name
       WHERE us.user_email = $1`,
      [req.user.email]
    );

    // Eğer user_shops tablosu yoksa, yukarıdaki sorgu hata verir,
    // o zaman direkt shops tablosunda domain eşleşmesi ile çekebilirsin:
    // "SELECT name FROM shops WHERE LOWER(name) = $1"

    res.json(result.rows.map((r) => r.name));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.get("/api/shop-products/:shopName", async (req, res) => {
  const client = await pool.connect();
  try {
    const shopName = req.params.shopName;
    const result = await client.query(
      `SELECT * FROM jsv_editted WHERE shops = $1 ORDER BY sale_date ASC`,
      [shopName]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

app.post("/shops", authMiddleware, async (req, res) => {
  const { name, prefix } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO shops (name, prefix) VALUES ($1, $2) RETURNING *`,
      [name, prefix.toLowerCase()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Mağaza ekleme hatası:", err);
    res.status(500).json({ error: "Mağaza eklenemedi." });
  }
});

// Tabloları listele (örneğin: jsv_editted_2025_04, jsv_editted_2025_05)
app.get("/jsv_editted_tables", authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE 'jsv_editted_%'
      ORDER BY table_name DESC
    `);
    const tables = result.rows.map((row) => row.table_name);
    res.json(tables);
  } catch (error) {
    console.error("Tablolar alınırken hata:", error.message);
    res.status(500).json({ error: "Tablolar alınamadı" });
  } finally {
    client.release();
  }
});
app.get("/jsv_editted/:table", authMiddleware, async (req, res) => {
  const table = req.params.table;

  // Güvenlik kontrolü: sadece belirli pattern'e izin ver
  if (!/^jsv_editted_\d{4}_\d{2}$/.test(table)) {
    return res.status(400).json({ error: "Geçersiz tablo adı." });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT * FROM ${table}  ORDER BY sale_date ASC  `
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Tablo verisi alınırken hata:", error.message);
    res.status(500).json({ error: "Tablo verisi alınamadı." });
  } finally {
    client.release();
  }
});

app.get("/jsv_editted", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM jsv_editted");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching jsv:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});
async function getShopNameBySkuPrefix(client, sku) {
  if (!sku) return null;
  const prefix = sku.substring(0, 3).toUpperCase(); // ilk 3 harfi al

  // shops tablosundan prefix ile eşleşen mağazayı çek
  const res = await client.query(
    "SELECT name FROM shops WHERE prefix = $1 LIMIT 1",
    [prefix]
  );

  if (res.rowCount > 0) return res.rows[0].name;
  return null;
}
app.patch("/jsv_editted/:unique_id", async (req, res) => {
  const { unique_id } = req.params;
  const updates = req.body;

  try {
    if (!unique_id) return res.status(400).json({ error: "unique_id gerekli" });

    if (updates.sku) {
      const shopName = await getShopNameBySkuPrefix(pool, updates.sku);
      if (shopName) updates.shops = shopName;
    }

    const columns = Object.keys(updates);
    if (columns.length === 0)
      return res.status(400).json({ error: "Güncellenecek veri yok" });

    const setString = columns
      .map((col, idx) => `"${col}"=$${idx + 1}`)
      .join(", ");
    const values = columns.map((col) => updates[col]);
    values.push(unique_id);

    const query = `UPDATE jsv_editted SET ${setString} WHERE unique_id=$${values.length} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Kayıt bulunamadı" });

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.listen(port, () => {
  console.log(`Server ${port} portunda çalışıyor`);
});
app.get("/stones_types", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM stones_types ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching stones:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.get("/stones", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM stones ORDER BY sekli ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching stones:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.get("/stone-sizes/:stoneId", authMiddleware, async (req, res) => {
  const { stoneId } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM stone_measurements WHERE stone_id = $1 ORDER BY olcusu ASC",
      [stoneId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching stone sizes:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.post("/products", async (req, res) => {
  const {
    sku_kodu,
    fotograf,
    tip,
    adi,
    magaza,
    karati,
    grami,
    genislik,
    uzunluk,
    kalinlik,
    kol_olcusu,
    tas_agirligi,
    stones,
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Ürünü ekle
    const productResult = await client.query(
      `INSERT INTO products (
        sku_kodu, fotograf, tip, adi, magaza,
        karati, grami, genislik, uzunluk, kalinlik, kol_olcusu, tas_agirligi
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id`,
      [
        sku_kodu,
        fotograf,
        tip,
        adi,
        magaza,
        karati,
        grami,
        genislik,
        uzunluk,
        kalinlik,
        kol_olcusu,
        tas_agirligi,
      ]
    );

    const productId = productResult.rows[0].id;

    if (Array.isArray(stones) && stones.length > 0) {
      for (const stone of stones) {
        await client.query(
          `INSERT INTO product_stones (product_id, stone_measurement_id, adet, stone_type_id)
           VALUES ($1, $2, $3, $4)`,
          [
            productId,
            stone.stone_measurement_id,
            stone.adet,
            stone.stone_type_id,
          ]
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json({ message: "Ürün başarıyla eklendi", productId });
  } catch (err) {
    if (err.code === "23505" && err.constraint === "sku_kodu") {
      res.status(400).json({ error: `Ürün ekleme hatası: ${err.detail}` });
    } else {
      console.error("Ürün ekleme hatası:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  } finally {
    client.release();
  }
});

// Express route
app.get("/products/:shopName", authMiddleware, async (req, res) => {
  const { shopName } = req.params;

  try {
    const query = `
      SELECT
        p.*,
        json_agg(
          json_build_object(
            'product_stone_id', ps.id,
            'adet', ps.adet,
            'stone_id', s.id,
            'stone_sekli', s.sekli,
            'stone_rengi', s.rengi,
            'measurement_id', sm.id,
            'olcusu', sm.olcusu,
            'stone_type_id', ps.stone_type_id,
            'stone_type', st.stone_type
          )
        ) FILTER (WHERE ps.id IS NOT NULL) AS stones
      FROM products p
      LEFT JOIN product_stones ps ON ps.product_id = p.id
      LEFT JOIN stone_measurements sm ON sm.id = ps.stone_measurement_id
      LEFT JOIN stones s ON s.id = sm.stone_id
      LEFT JOIN stones_types st ON st.id = ps.stone_type_id
      WHERE LOWER(p.magaza) = LOWER($1)
      GROUP BY p.id
      ORDER BY p.id ASC
      LIMIT 1000
    `;

    const result = await pool.query(query, [shopName]);
    res.json(result.rows);
  } catch (err) {
    console.error("GET /products/:shopName error:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.get("/products", authMiddleware, async (req, res) => {
  try {
    const productsResult = await pool.query(`
      SELECT
        p.*,
        json_agg(
          json_build_object(
            'product_stone_id', ps.id,
            'adet', ps.adet,
            'stone_id', s.id,
            'stone_sekli', s.sekli,
            'stone_rengi', s.rengi,
            'measurement_id', sm.id,
            'olcusu', sm.olcusu,
            'stone_type_id', ps.stone_type_id,
            'stone_type', st.stone_type
          )
        ) FILTER (WHERE ps.id IS NOT NULL) AS stones
      FROM products p
      LEFT JOIN product_stones ps ON ps.product_id = p.id
      LEFT JOIN stone_measurements sm ON sm.id = ps.stone_measurement_id
      LEFT JOIN stones s ON s.id = sm.stone_id
      LEFT JOIN stones_types st ON st.id = ps.stone_type_id 
      WHERE p.sku_kodu IS NOT NULL AND p.sku_kodu <> ''
      GROUP BY p.id
      ORDER BY p.id ASC;
    `);

    res.json(productsResult.rows);
  } catch (err) {
    console.error("GET /products error:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.get("/imalat_takip", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM imalat_takip ORDER BY sira_no asc "
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Sunucu hatası");
  }
});

app.patch("/imalat_takip/:id/etiket_basilma", async (req, res) => {
  const { id } = req.params;
  const { etiket_basilma_tarihi } = req.body;

  try {
    await pool.query(
      "UPDATE imalat_takip SET etiket_basilma_tarihi = $1 WHERE unique_id = $2",
      [etiket_basilma_tarihi, id]
    );
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Güncelleme başarısız" });
  }
});

app.get("/jolene_rings", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM jolene_rings ORDER BY sku asc LIMIT 1000"
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /jolene error:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});
app.get("/gemglam_rings", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM gemglam_rings ORDER BY sku asc LIMIT 1000"
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /jolene error:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});
app.patch("/imalat_takip/:unique_id", authMiddleware, async (req, res) => {
  const { unique_id } = req.params;
  const updateFields = req.body;
  const kullanici = req.user.email;
  const userId = req.user.id;
  const roleName = req.user.role;

  const ayarToMilyem = (ayar) => {
    const num = parseInt(ayar);
    const milyemMap = {
      6: 250,
      8: 333,
      10: 417,
      12: 500,
      14: 585,
      16: 667,
      18: 750,
      20: 833,
      22: 916,
      24: 995,
      26: 1083,
    };
    return milyemMap[num] ?? 0;
  };

  if (!unique_id) return res.status(400).json({ error: "unique_id gerekli" });
  const keys = Object.keys(updateFields);
  if (keys.length === 0)
    return res.status(400).json({ error: "Güncellenecek alan yok" });

  try {
    if (!roleName)
      return res.status(401).json({ error: "Rol bilgisi bulunamadı" });

    const { rows: existingRows } = await pool.query(
      "SELECT * FROM imalat_takip WHERE unique_id = $1",
      [unique_id]
    );
    if (existingRows.length === 0)
      return res.status(404).json({ error: "Kayıt bulunamadı" });
    const existing = existingRows[0];

    // 1. Dokumcu varsa dokum_gram = atolye_gram
    if (
      updateFields.dokumcu &&
      (updateFields.atolye_gram || existing.atolye_gram)
    ) {
      updateFields.dokum_gram =
        updateFields.atolye_gram ?? existing.atolye_gram;
    }

    // 2. Cilacı varsa cila_giris_gram = dokum_gram (eğer elle girilmemişse)
    if (
      updateFields.cilaci &&
      updateFields.cila_giris_gram === undefined &&
      (updateFields.dokum_gram || existing.dokum_gram)
    ) {
      updateFields.cila_giris_gram =
        updateFields.dokum_gram ?? existing.dokum_gram;
    }

    // 3. 🧮 Cila ramat hesaplama ve CILA tablosuna yaz (Toplam ekleme yapacak şekilde)
    if (
      (updateFields.cilaci || existing.cilaci) &&
      updateFields.cila_gram !== undefined &&
      parseFloat(updateFields.cila_gram) > 0
    ) {
      const cilaAdi = updateFields.cilaci ?? existing.cilaci;
      const ayar = updateFields.ayari ?? existing.ayari;

      const cilaGirisStr =
        updateFields.cila_giris_gram ?? existing.cila_giris_gram;
      const cilaGramStr = updateFields.cila_gram ?? existing.cila_gram;
      const kocanGramStr = updateFields.kocan_gram ?? existing.kocan_gram;

      const cilaGram = parseFloat(cilaGramStr) || 0;
      const kocanGram = parseFloat(kocanGramStr) || 0;
      const cilaGiris = parseFloat(cilaGirisStr) || 0;

      console.log("🧪 Ramat Hesaplama Kontrolü:", {
        cilaAdi,
        ayar,
        cilaGiris,
        cilaGram,
        kocanGram,
      });

      if (cilaAdi && ayar && cilaGram > 0) {
        // Mevcut ramat değerlerini çek
        const { rows: cilaRows } = await pool.query(
          "SELECT ramat_terazi, ramat_has FROM cila WHERE TRIM(cila_adi) ILIKE TRIM($1)",
          [cilaAdi]
        );

        let mevcutRamatTerazi = 0;
        let mevcutRamatHas = 0;
        if (cilaRows.length > 0) {
          mevcutRamatTerazi = parseFloat(cilaRows[0].ramat_terazi) || 0;
          mevcutRamatHas = parseFloat(cilaRows[0].ramat_has) || 0;
        }

        // Yeni hesaplama
        const ramatTeraziYeni = parseFloat(
          (cilaGiris - (cilaGram + kocanGram)).toFixed(2)
        );
        const milyem = ayarToMilyem(ayar);
        const ramatHasYeni = parseFloat(
          (ramatTeraziYeni * (milyem / 1000)).toFixed(2)
        );

        // Toplam değerler
        const toplamRamatTerazi = parseFloat(
          (mevcutRamatTerazi + ramatTeraziYeni).toFixed(2)
        );
        const toplamRamatHas = parseFloat(
          (mevcutRamatHas + ramatHasYeni).toFixed(2)
        );

        // Güncelle
        await pool.query(
          "UPDATE cila SET ramat_terazi = $1, ramat_has = $2 WHERE TRIM(cila_adi) ILIKE TRIM($3)",
          [toplamRamatTerazi, toplamRamatHas, cilaAdi]
        );

        // Log kaydı (önceki ve yeni değerler)
        await pool.query(
          `INSERT INTO imalat_takip_log (unique_id, alan_adi, eski_deger, yeni_deger, kullanici_adi)
           VALUES 
           ($1, 'ramat_terazi', $2, $3, $4),
           ($1, 'ramat_has', $5, $6, $4)`,
          [
            unique_id,
            mevcutRamatTerazi.toString(),
            toplamRamatTerazi.toString(),
            kullanici,
            mevcutRamatHas.toString(),
            toplamRamatHas.toString(),
          ]
        );
          await logToDefter(
  "cila",
  cilaAdi,
  cilaGram,
  ayar,
  kullanici,
  existing,
  { ramatTeraziYeni, ramatHasYeni }
);


      }
    }

    // 4. Yetki kontrolü
    const { rows: userPermRows } = await pool.query(
      "SELECT step_name FROM user_step_permissions WHERE user_id = $1 AND can_edit = TRUE",
      [userId]
    );
    let allowedSteps = userPermRows.map((r) => r.step_name.toLowerCase());

    if (allowedSteps.length === 0) {
      const { rows: roleRows } = await pool.query(
        "SELECT id FROM roles WHERE role_name = $1",
        [roleName]
      );
      if (roleRows.length === 0)
        return res.status(401).json({ error: "Rol bilgisi bulunamadı" });

      const roleId = roleRows[0].id;
      const { rows: rolePermRows } = await pool.query(
        "SELECT step_name FROM role_step_permissions WHERE role_id = $1 AND can_edit = TRUE",
        [roleId]
      );
      allowedSteps = rolePermRows.map((r) => r.step_name.toLowerCase());
    }

    for (const field of keys) {
      const oldVal = existing[field];
      const newVal = updateFields[field];
      if (String(oldVal) !== String(newVal)) {
        if (!allowedSteps.includes(field.toLowerCase())) {
          return res.status(403).json({
            error: `Bu alanda (${field}) düzenleme yetkiniz yok.`,
          });
        }
      }
    }

    const ayar = updateFields.ayari ?? existing.ayari;
    const atolyeAdi = updateFields.atolye_adi ?? existing.atolye_adi;
    const atolyeGram = updateFields.atolye_gram ?? existing.atolye_gram;
    let hesaplananDolarBakiye = null;

    // 5. logToDefter (atölye)
    if (updateFields.atolye_gram && ayar && atolyeAdi && atolyeGram) {
      const result = await logToDefter(
        "atolye",
        atolyeAdi,
        parseFloat(atolyeGram),
        ayar,
        kullanici,
        existing
      );
      if (result) hesaplananDolarBakiye = result.yeniDolar;
    }

    // 6. Ana tabloyu güncelle
    const allKeys = Object.keys(updateFields);
    const setClauses = allKeys
      .map((key, idx) => `"${key}" = $${idx + 1}`)
      .join(", ");
    const values = Object.values(updateFields);
    values.push(unique_id);
    const query = `UPDATE imalat_takip SET ${setClauses} WHERE unique_id = $${
      allKeys.length + 1
    } RETURNING *`;
    const { rows } = await pool.query(query, values);

    // 7. logToDefter (döküm)
    if (
      updateFields.dokumcu &&
      (updateFields.dokum_gram || existing.dokum_gram) &&
      ayar
    ) {
      const dokumcu = updateFields.dokumcu;
      const dokumGram = parseFloat(
        updateFields.dokum_gram ?? existing.dokum_gram
      );
      const result = await logToDefter(
        "dokum",
        dokumcu,
        dokumGram,
        ayar,
        kullanici,
        existing
      );
      if (result) rows[0].dokum_dolar_bakiye_alacak = result.yeniDolar;
    }

    // 8. Değişiklik loglama
    const changeLogs = [];
    let firstChangedFieldName = null;
    let firstChangedFieldValue = null;

    for (const key of allKeys) {
      const oldVal = existing[key];
      const newVal = updateFields[key];
      if (String(oldVal) !== String(newVal)) {
        if (!firstChangedFieldName) {
          firstChangedFieldName = key;
          firstChangedFieldValue = newVal;
        }
        changeLogs.push({
          unique_id,
          alan_adi: key,
          eski_deger: oldVal,
          yeni_deger: newVal,
        });
      }
    }

    for (const log of changeLogs) {
      await pool.query(
        `INSERT INTO imalat_takip_log (unique_id, alan_adi, eski_deger, yeni_deger, kullanici_adi)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          log.unique_id,
          log.alan_adi,
          String(log.eski_deger),
          String(log.yeni_deger),
          kullanici,
        ]
      );
    }

    if (firstChangedFieldName && firstChangedFieldValue !== null) {
      await pool.query(
        `UPDATE imalat_takip SET imalat_durumu = $1, paketleme = $2 WHERE unique_id = $3`,
        [firstChangedFieldName, firstChangedFieldValue, unique_id]
      );
    }

    if (hesaplananDolarBakiye !== null) {
      rows[0].dolar_bakiye_alacak = hesaplananDolarBakiye;
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("UPDATE error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

async function logToDefter(
  entity,
  entityName,
  gram,
  ayar,
  islemYapan,
  existing,
  extra = {}
) {
  if (!entityName || !gram || !ayar) {
    console.log("Eksik parametre:", { entityName, gram, ayar });
    return;
  }

  console.log("logToDefter çağrıldı:", entity);

  const entityLower = entity.toLowerCase(); // dokum, atolye, cila
  const entityTable = entityLower;
  const defterTable = `${entityLower}_defteri`;

  // Entity tablosundan id ve işçilik verilerini al
  const { rows } = await pool.query(
    `SELECT id, has_tezgah_isciligi, dolar_tezgah_isciligi, has_bakiye_alacak, dolar_bakiye_alacak
     FROM ${entityTable}
     WHERE ${entityLower}_adi = $1`,
    [entityName]
  );
  if (rows.length === 0) return;

  const {
    id: entityId,
    has_tezgah_isciligi = 0,
    dolar_tezgah_isciligi = 0,
    has_bakiye_alacak = 0,
    dolar_bakiye_alacak = 0,
  } = rows[0];

  // Milyem hesaplama
  const milyemMap = {
    6: 250, 8: 333, 10: 417, 12: 500, 14: 585,
    16: 667, 18: 750, 20: 833, 22: 916, 24: 995, 26: 1083,
  };
  const milyem = milyemMap[parseInt(ayar)] ?? 0;

  // Has hesaplama
  let hesaplananHas;
  if (entityLower === "cila") {
    hesaplananHas = parseFloat((gram * (has_tezgah_isciligi / 1000)).toFixed(2));
  } else {
    hesaplananHas = parseFloat((gram * ((milyem + has_tezgah_isciligi) / 1000)).toFixed(2));
  }

  const yeniHas = parseFloat(has_bakiye_alacak) + hesaplananHas;
  const yeniDolar = parseFloat(dolar_bakiye_alacak) + dolar_tezgah_isciligi;

  // Açıklama oluştur
  let aciklama = `Sıra No: ${existing.sira_no || ""}, Ürün: ${existing.urun_adi || ""}, Kod: ${existing.urun_kodu || ""}, ${entity}ye gönderildi`;

  if (
    entityLower === "cila" &&
    extra.ramatTeraziYeni !== undefined &&
    extra.ramatHasYeni !== undefined
  ) {
    aciklama += ` | Ramat Terazi: ${extra.ramatTeraziYeni}g, Ramat Has: ${extra.ramatHasYeni}g`;
  }

  // Ana tabloyu güncelle
  await pool.query(
    `UPDATE ${entityTable}
     SET has_bakiye_alacak = $1, dolar_bakiye_alacak = $2
     WHERE ${entityLower}_adi = $3`,
    [yeniHas, yeniDolar, entityName]
  );

  // Deftere kayıt
  try {
    await pool.query(
      `INSERT INTO ${defterTable}
       (${entityLower}_id, tarih, islem_turu, bakiye_has, bakiye_dolar, aciklama, islem_yapan)
       VALUES ($1, $2, 'alacak', $3, $4, $5, $6)`,
      [
        entityId,
        new Date().toISOString().split("T")[0],
        hesaplananHas,
        yeniDolar,
        aciklama, // 👈 doğru açıklama burada
        islemYapan,
      ]
    );
  } catch (e) {
    console.error(`🚨 DEFTER INSERT ERROR (${defterTable}):`, e.message);
  }

  return { yeniDolar };
}


app.patch("/imalat_takip/:unique_id", authMiddleware, async (req, res) => {
  const { unique_id } = req.params;
  const updateFields = req.body;
  const kullanici = req.user.email;
  const userId = req.user.id;
  const roleName = req.user.role;

  console.log("⛳ PATCH başlıyor:", updateFields); // En başta log

  if (!unique_id) return res.status(400).json({ error: "unique_id gerekli" });
  const keys = Object.keys(updateFields);
  if (keys.length === 0)
    return res.status(400).json({ error: "Güncellenecek alan yok" });

  try {
    if (!roleName)
      return res.status(401).json({ error: "Rol bilgisi bulunamadı" });

    const { rows: existingRows } = await pool.query(
      "SELECT * FROM imalat_takip WHERE unique_id = $1",
      [unique_id]
    );
    if (existingRows.length === 0)
      return res.status(404).json({ error: "Kayıt bulunamadı" });
    const existing = existingRows[0];

    // existing alındıktan sonra ayarı tanımla
    const ayar = updateFields.ayari ?? existing.ayari;

    const ayarToMilyem = (ayar) => {
      const num = parseInt(ayar);
      const milyemMap = {
        6: 250,
        8: 333,
        10: 417,
        12: 500,
        14: 585,
        16: 667,
        18: 750,
        20: 833,
        22: 916,
        24: 995,
        26: 1083,
      };
      return milyemMap[num] ?? 0;
    };

    // 1. Dokumcu varsa dokum_gram = atolye_gram
    if (
      updateFields.dokumcu &&
      (updateFields.atolye_gram || existing.atolye_gram)
    ) {
      updateFields.dokum_gram =
        updateFields.atolye_gram ?? existing.atolye_gram;
    }

    // 2. Cilacı varsa cila_giris_gram yoksa dokum_gram ya da existing.dokum_gram al
    if (
      updateFields.cilaci &&
      !("cila_giris_gram" in updateFields) && // kesin kontrol
      (updateFields.dokum_gram || existing.dokum_gram)
    ) {
      updateFields.cila_giris_gram =
        updateFields.dokum_gram ?? existing.dokum_gram;
    }

    // 3. Cila ramat hesaplama ve CILA tablosuna yaz
    if (
      updateFields.cilaci &&
      (updateFields.cila_giris_gram || existing.cila_giris_gram)
    ) {
      const cilaGiris =
        parseFloat(updateFields.cila_giris_gram ?? existing.cila_giris_gram) ||
        0;
      const cilaGram =
        parseFloat(updateFields.cila_gram ?? existing.cila_gram) || 0;
      const kocanGram =
        parseFloat(updateFields.kocan_gram ?? existing.kocan_gram) || 0;

      const ramatTerazi = parseFloat(
        (cilaGiris - (cilaGram + kocanGram)).toFixed(3)
      ); // Yuvarlama
      const cilaAdi = updateFields.cilaci ?? existing.cilaci;

      if (cilaAdi && ayar) {
        const milyem = ayarToMilyem(ayar);
        const ramatHas = parseFloat((ramatTerazi * (milyem / 1000)).toFixed(2));

        await pool.query(
          "UPDATE cila SET ramat_terazi = $1, ramat_has = $2 WHERE TRIM(cila_adi) ILIKE TRIM($3)",
          [ramatTerazi, ramatHas, cilaAdi]
        );

        await pool.query(
          `INSERT INTO imalat_takip_log (unique_id, alan_adi, eski_deger, yeni_deger, kullanici_adi)
           VALUES 
           ($1, 'ramat_terazi', '-', $2, $3),
           ($1, 'ramat_has', '-', $4, $3)`,
          [unique_id, ramatTerazi.toString(), kullanici, ramatHas.toString()]
        );
      }
    }

    // 3.5 Kocan Has Bakiye Hesapla ve dokum tablosuna yaz
    if (
      (updateFields.kocan_gram || existing.kocan_gram) &&
      (updateFields.ayari || existing.ayari) &&
      (updateFields.dokumcu || existing.dokumcu)
    ) {
      const dokumcu = updateFields.dokumcu ?? existing.dokumcu;
      const kocanGram =
        parseFloat(updateFields.kocan_gram ?? existing.kocan_gram) || 0;
      const milyem = ayarToMilyem(ayar);
      const kocanHasBakiye = parseFloat(
        (kocanGram * (milyem / 1000)).toFixed(2)
      );

      await pool.query(
        `UPDATE dokum SET kocan_has_bakiye = $1 WHERE TRIM(dokum_adi) ILIKE TRIM($2)`,
        [kocanHasBakiye, dokumcu]
      );

      await pool.query(
        `INSERT INTO imalat_takip_log (unique_id, alan_adi, eski_deger, yeni_deger, kullanici_adi)
         VALUES ($1, 'kocan_has_bakiye', '-', $2, $3)`,
        [unique_id, kocanHasBakiye.toString(), kullanici]
      );
    }

    // 4. Yetki kontrolü
    const { rows: userPermRows } = await pool.query(
      "SELECT step_name FROM user_step_permissions WHERE user_id = $1 AND can_edit = TRUE",
      [userId]
    );
    let allowedSteps = userPermRows.map((r) => r.step_name.toLowerCase());

    if (allowedSteps.length === 0) {
      const { rows: roleRows } = await pool.query(
        "SELECT id FROM roles WHERE role_name = $1",
        [roleName]
      );
      if (roleRows.length === 0)
        return res.status(401).json({ error: "Rol bilgisi bulunamadı" });

      const roleId = roleRows[0].id;
      const { rows: rolePermRows } = await pool.query(
        "SELECT step_name FROM role_step_permissions WHERE role_id = $1 AND can_edit = TRUE",
        [roleId]
      );
      allowedSteps = rolePermRows.map((r) => r.step_name.toLowerCase());
    }

    for (const field of keys) {
      const oldVal = existing[field];
      const newVal = updateFields[field];
      if (String(oldVal) !== String(newVal)) {
        if (!allowedSteps.includes(field.toLowerCase())) {
          return res.status(403).json({
            error: `Bu alanda (${field}) düzenleme yetkiniz yok.`,
          });
        }
      }
    }

    const atolyeAdi = updateFields.atolye_adi ?? existing.atolye_adi;
    const atolyeGram = updateFields.atolye_gram ?? existing.atolye_gram;
    let hesaplananDolarBakiye = null;

    // 5. logToDefter (atölye)
    if (updateFields.atolye_gram && ayar && atolyeAdi && atolyeGram) {
      const result = await logToDefter(
        "atolye",
        atolyeAdi,
        parseFloat(atolyeGram),
        ayar,
        kullanici,
        existing
      );
      if (result) hesaplananDolarBakiye = result.yeniDolar;
    }

    // 6. Ana tabloyu güncelle
    const setClauses = keys
      .map((key, idx) => `"${key}" = $${idx + 1}`)
      .join(", ");
    const values = Object.values(updateFields);
    values.push(unique_id);
    const query = `UPDATE imalat_takip SET ${setClauses} WHERE unique_id = $${
      keys.length + 1
    } RETURNING *`;
    const { rows } = await pool.query(query, values);

    // 7. logToDefter (döküm)
    if (
      updateFields.dokumcu &&
      (updateFields.dokum_gram || existing.dokum_gram) &&
      ayar
    ) {
      const dokumcu = updateFields.dokumcu;
      const dokumGram = parseFloat(
        updateFields.dokum_gram ?? existing.dokum_gram
      );
      const result = await logToDefter(
        "dokum",
        dokumcu,
        dokumGram,
        ayar,
        kullanici,
        existing
      );
      if (result) rows[0].dokum_dolar_bakiye_alacak = result.yeniDolar;
    }

    // 8. Değişiklik loglama
    const changeLogs = [];
    let firstChangedFieldName = null;
    let firstChangedFieldValue = null;

    for (const key of keys) {
      const oldVal = existing[key];
      const newVal = updateFields[key];
      if (String(oldVal) !== String(newVal)) {
        if (!firstChangedFieldName) {
          firstChangedFieldName = key;
          firstChangedFieldValue = newVal;
        }
        changeLogs.push({
          unique_id,
          alan_adi: key,
          eski_deger: oldVal,
          yeni_deger: newVal,
        });
      }
    }

    for (const log of changeLogs) {
      await pool.query(
        `INSERT INTO imalat_takip_log (unique_id, alan_adi, eski_deger, yeni_deger, kullanici_adi)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          log.unique_id,
          log.alan_adi,
          String(log.eski_deger),
          String(log.yeni_deger),
          kullanici,
        ]
      );
    }

    if (firstChangedFieldName && firstChangedFieldValue !== null) {
      await pool.query(
        `UPDATE imalat_takip SET imalat_durumu = $1, paketleme = $2 WHERE unique_id = $3`,
        [firstChangedFieldName, firstChangedFieldValue, unique_id]
      );
    }

    if (hesaplananDolarBakiye !== null) {
      rows[0].dolar_bakiye_alacak = hesaplananDolarBakiye;
    }

    // Test logları
    console.log("➡️ kocan_gram:", updateFields.kocan_gram);
    console.log("➡️ ayari:", updateFields.ayari);
    console.log("➡️ dokumcu:", updateFields.dokumcu);

    res.json(rows[0]);
  } catch (error) {
    console.error("UPDATE error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.get("/imalat_takip/:unique_id", authMiddleware, async (req, res) => {
  const { unique_id } = req.params;
  try {
    const { rows } = await pool.query(
      "SELECT * FROM imalat_takip WHERE unique_id = $1",
      [unique_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Kayıt bulunamadı" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("GET error:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.get("/imalat_takip_logs", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      " SELECT log.*, it.urun_adi FROM imalat_takip_log log LEFT JOIN imalat_takip it ON log.unique_id = it.unique_id ORDER BY log.degisim_tarihi DESC "
    );

    // Eğer kayıt yoksa boş dizi dön
    res.json(result.rows);
  } catch (error) {
    console.error("Loglar getirilirken hata:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.get("/taslar", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM taslar ORDER BY olcusu ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching taslar:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});
app.post("/taslar", async (req, res) => {
  const {
    stok_kodu,
    stok_adi,
    olcusu,
    sekli,
    rengi,
    tas_cinsi,
    aciklama,
    grami,
    stok_adeti,
    stok_grami,
    mihlama_cinsi,
    mihlama_grami,
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO taslar (
        stok_kodu, stok_adi, olcusu, sekli, rengi, tas_cinsi, aciklama,grami, 
        stok_adeti, stok_grami, mihlama_cinsi, mihlama_grami
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        stok_kodu,
        stok_adi,
        olcusu,
        sekli,
        rengi,
        tas_cinsi,
        aciklama,
        grami,
        stok_adeti,
        stok_grami,
        mihlama_cinsi,
        mihlama_grami,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Taş ekleme hatası:", err);

    if (err.code === "23505") {
      // unique constraint hatası
      return res.status(400).json({
        error: `Bu stok kodu zaten kayıtlı: ${stok_kodu}`,
      });
    }

    res.status(500).json({ error: "Taş eklenemedi" });
  }
});

// Tüm izinleri getir (tüm roller × tüm adımlar)
app.get("/role_step_permissions/all", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM role_step_permissions");
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Yeni izin ekle
app.post("/role_step_permissions", authMiddleware, async (req, res) => {
  const { role_id, step_name, can_edit } = req.body;

  if (!role_id || !step_name || typeof can_edit !== "boolean") {
    return res.status(400).json({ error: "Eksik veya hatalı alan" });
  }

  try {
    // UNIQUE constraint olduğu için hata varsa yakalanacak
    const { rows } = await pool.query(
      `INSERT INTO role_step_permissions (role_id, step_name, can_edit)
       VALUES ($1, $2, $3) RETURNING *`,
      [role_id, step_name, can_edit]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      // unique violation, izin zaten var, güncelleme yapılmalı
      return res.status(409).json({ error: "İzin zaten mevcut" });
    }
    console.error(error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// İzin güncelle (id ile)
app.put("/role_step_permissions/:id", async (req, res) => {
  const { id } = req.params;
  const { can_edit } = req.body;
  if (typeof can_edit !== "boolean") {
    return res.status(400).json({ error: "can_edit boolean olmalı" });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE role_step_permissions SET can_edit = $1 WHERE id = $2 RETURNING *`,
      [can_edit, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "İzin bulunamadı" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.get("/api/role_permissions/:roleName", authMiddleware, async (req, res) => {
  const roleName = req.params.roleName;

  if (!roleName) {
    return res.status(400).json({ error: "Role name gerekli" });
  }

  try {
    // 1. roles tablosundan role id al
    const { rows: roleRows } = await pool.query(
      "SELECT id FROM roles WHERE role_name = $1",
      [roleName]
    );

    if (roleRows.length === 0) {
      return res.status(404).json({ error: "Rol bulunamadı" });
    }

    const roleId = roleRows[0].id;

    // 2. role_step_permissions tablosundan izinleri çek
    const { rows: permissions } = await pool.query(
      "SELECT step_name FROM role_step_permissions WHERE role_id = $1 AND can_edit = TRUE",
      [roleId]
    );

    const allowedFields = permissions.map((p) => p.step_name.toLowerCase());

    res.json({ allowedFields });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Tüm kullanıcı izinlerini getir
app.get("/user_step_permissions/all", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM user_step_permissions");
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Yeni izin ekle
app.post("/user_step_permissions", async (req, res) => {
  const { user_id, step_name, can_edit } = req.body;

  if (!user_id || !step_name || typeof can_edit !== "boolean") {
    return res.status(400).json({ error: "Eksik veya hatalı alan" });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO user_step_permissions (user_id, step_name, can_edit)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, step_name)
       DO UPDATE SET can_edit = EXCLUDED.can_edit
       RETURNING *`,
      [user_id, step_name, can_edit]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.put("/user_step_permissions/:id", async (req, res) => {
  const { id } = req.params;
  const { can_edit } = req.body;
  if (typeof can_edit !== "boolean") {
    return res.status(400).json({ error: "can_edit boolean olmalı" });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE user_step_permissions SET can_edit = $1 WHERE id = $2 RETURNING *`,
      [can_edit, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "İzin bulunamadı" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});
app.get("/api/imalat_takip/columns", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'imalat_takip' 
      AND column_name NOT IN ('unique_id', 'created_at', 'updated_at')
      ORDER BY ordinal_position
    `);
    const columns = rows.map((r) => r.column_name);
    res.json(columns);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Kolonlar alınırken hata oluştu." });
  }
});

// Yeni sütun (adım) ekle ve kullanıcı izinlerini tanımla
app.post("/api/imalat_takip/add_column", authMiddleware, async (req, res) => {
  const { step_name, title, type, user_ids } = req.body;

  if (!step_name || !type || !Array.isArray(user_ids)) {
    return res.status(400).json({ error: "Eksik veya hatalı alan" });
  }

  const columnName = step_name.replace(/\s+/g, "_").toLowerCase(); // örn: taş yıkama => tas_yikama

  let columnType;
  if (type === "checkbox") {
    columnType = "BOOLEAN DEFAULT FALSE";
  } else if (type === "text") {
    columnType = "TEXT";
  } else if (type === "date") {
    columnType = "DATE";
  } else {
    return res.status(400).json({ error: "Desteklenmeyen tür" });
  }

  try {
    // 🔹 1. Tabloya yeni sütunu ekle
    await pool.query(
      `ALTER TABLE imalat_takip ADD COLUMN IF NOT EXISTS "${columnName}" ${columnType}`
    );

    // 🔹 2. Her kullanıcı için bu adım adına izin ata
    for (const userId of user_ids) {
      await pool.query(
        `INSERT INTO user_step_permissions (user_id, step_name, can_edit)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (user_id, step_name)
         DO UPDATE SET can_edit = EXCLUDED.can_edit`,
        [userId, columnName]
      );
    }
    console.log("Ekleniyor:", columnName, columnType);

    res.json({
      success: true,
      message: "Sütun ve izinler eklendi",
      column: columnName,
    });
  } catch (error) {
    console.error("Sütun ekleme hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.delete(
  "/api/imalat_takip/delete_column/:step",
  authMiddleware,
  async (req, res) => {
    const { step } = req.params;
    if (!step) return res.status(400).json({ error: "Geçersiz adım adı" });

    try {
      await pool.query(
        `ALTER TABLE imalat_takip DROP COLUMN IF EXISTS "${step}"`
      );
      await pool.query(
        "DELETE FROM user_step_permissions WHERE step_name = $1",
        [step]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Sütun silme hatası:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  }
);

app.get("/api/user_permissions/:userId", authMiddleware, async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (!userId) return res.status(400).json({ error: "User ID gerekli" });

  try {
    const { rows: userPermRows } = await pool.query(
      "SELECT step_name FROM user_step_permissions WHERE user_id = $1 AND can_edit = TRUE",
      [userId]
    );
    if (userPermRows.length > 0) {
      return res.json({
        allowedFields: userPermRows.map((r) => r.step_name.toLowerCase()),
      });
    }
    // Eğer kullanıcı bazlı izin yoksa rol bazlı izinleri getir
    const { rows: roleRows } = await pool.query(
      `SELECT id, role_name FROM roles WHERE id = (SELECT role_id FROM users WHERE id = $1)`,
      [userId]
    );
    if (roleRows.length === 0)
      return res.status(404).json({ error: "Rol bulunamadı" });
    const roleId = roleRows[0].id;

    const { rows: rolePermRows } = await pool.query(
      "SELECT step_name FROM role_step_permissions WHERE role_id = $1 AND can_edit = TRUE",
      [roleId]
    );
    res.json({
      allowedFields: rolePermRows.map((r) => r.step_name.toLowerCase()),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

//////////////////////////////////////////////////////////////////// HOME

app.get("/summary", async (req, res) => {
  try {
    const totalResult = await pool.query(
      "SELECT COUNT(*) AS total FROM imalat_takip"
    );
    const totalOrders = parseInt(totalResult.rows[0].total, 10);

    const cilaResult = await pool.query(
      `SELECT COUNT(*) AS count FROM imalat_takip WHERE "cilaci" = 'true'`
    );
    const cila = parseInt(cilaResult.rows[0].count, 10);

    const stlResult = await pool.query(
      'SELECT COUNT(*) AS count FROM imalat_takip WHERE "stl" = true'
    );
    const stl = parseInt(stlResult.rows[0].count, 10);

    const completedResult = await pool.query(
      'SELECT COUNT(*) AS count FROM imalat_takip WHERE "tamamlandi" = true'
    );
    const tamamlandi = parseInt(completedResult.rows[0].count, 10);

    const dueTodayResult = await pool.query(`
 WITH workdays AS (
  SELECT
    unique_id,
    urun_adi,
    kargo_adresi,
    siparis_kodu,
    tarih,
    (
      SELECT date
      FROM (
        SELECT date::date,
               ROW_NUMBER() OVER (ORDER BY date) AS rn
        FROM generate_series(
               tarih::date + INTERVAL '1 day',
               tarih::date + INTERVAL '20 days',
               INTERVAL '1 day'
             ) date
        WHERE EXTRACT(DOW FROM date) NOT IN (0,6)  -- Pazar=0, Cumartesi=6 hariç
          AND date NOT IN (SELECT tatil_tarihi FROM resmi_tatiller)
      ) sub
      WHERE rn = 5
    ) AS hedef_teslim_tarihi
  FROM imalat_takip
)
SELECT unique_id, urun_adi, kargo_adresi, siparis_kodu, tarih, hedef_teslim_tarihi
FROM workdays
WHERE hedef_teslim_tarihi = CURRENT_DATE
  AND unique_id IN (
    SELECT unique_id FROM imalat_takip WHERE tamamlandi = false
  );

    `);

    const dueTodayList = dueTodayResult.rows;

    res.json({
      totalOrders,
      cila,
      stl,
      tamamlandi,
      dueToday: dueTodayList,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

const fetchHolidays = async (year = new Date().getFullYear()) => {
  try {
    const response = await axios.get(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/TR`
    );
    return response.data;
  } catch (error) {
    console.error("Tatil API hatası:", error.message);
    return [];
  }
};

const saveHolidaysToDb = async (year) => {
  const holidays = await fetchHolidays(year);
  const client = await pool.connect();

  try {
    for (const holiday of holidays) {
      await client.query(
        `INSERT INTO resmi_tatiller (tatil_tarihi, aciklama)
         VALUES ($1, $2)
         ON CONFLICT (tatil_tarihi) DO NOTHING`,
        [holiday.date, holiday.localName]
      );
    }
    console.log(`✅ ${year} yılı tatilleri veritabanına kaydedildi.`);
  } catch (err) {
    console.error("Veritabanına tatil kaydı hatası:", err.message);
  } finally {
    client.release();
  }
};

// 🌟 Uygulama başlarken sadece bu yılın tatillerini çek
(async () => {
  const thisYear = new Date().getFullYear();
  await saveHolidaysToDb(thisYear);
})();

cron.schedule("0 0 1 */2 *", async () => {
  const thisYear = new Date().getFullYear();

  console.log(`Tatil verileri çekiliyor: ${thisYear}`);

  await saveHolidaysToDb(thisYear);
});

// 🔄 Tatil listesini alma endpoint’i
app.get("/holidays", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM resmi_tatiller ORDER BY tatil_tarihi ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Tatil verisi alınamadı:", err.message);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});
app.post("/holidays", async (req, res) => {
  const { tatil_tarihi, aciklama, endDate } = req.body;
  const client = await pool.connect();

  try {
    if (endDate && endDate >= tatil_tarihi) {
      let currentDate = new Date(tatil_tarihi);
      const stopDate = new Date(endDate);

      while (currentDate <= stopDate) {
        const dateStr = currentDate.toISOString().slice(0, 10);
        await client.query(
          `INSERT INTO resmi_tatiller (tatil_tarihi, aciklama)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [dateStr, aciklama]
        );
        currentDate.setDate(currentDate.getDate() + 1);
      }
      res.json({ success: true, message: "Tatil aralığı kaydedildi." });
    } else {
      await client.query(
        `INSERT INTO resmi_tatiller (tatil_tarihi, aciklama)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [tatil_tarihi, aciklama]
      );
      res.json({ success: true, message: "Tek tatil günü kaydedildi." });
    }
  } catch (error) {
    console.error("Tatil ekleme hatası:", error);
    res.status(500).json({ message: "Sunucu hatası" });
  } finally {
    client.release();
  }
});

app.delete("/holidays/:date", async (req, res) => {
  const { date } = req.params;
  try {
    await pool.query(`DELETE FROM resmi_tatiller WHERE tatil_tarihi = $1`, [
      date,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("Tatil silme hatası:", err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

app.get("/last-upload", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT file_name, uploaded_at FROM uploads ORDER BY uploaded_at DESC LIMIT 1`
    );

    if (result.rows.length === 0) return res.json(null);
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Atölye listeleme
app.get("/api/atolye", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM atolye ORDER BY id");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Yeni atölye ekleme
app.post("/api/atolye", authMiddleware, async (req, res) => {
  const {
    atolye_adi,
    has_tezgah_isciligi = 0,
    dolar_tezgah_isciligi = 0,
    has_tuy_isciligi = 0,
    dolar_tuy_isciligi = 0,
  } = req.body;

  if (!atolye_adi) return res.status(400).json({ error: "Atölye adı gerekli" });

  try {
    const { rows } = await pool.query(
      `INSERT INTO atolye (
        atolye_adi, has_tezgah_isciligi, dolar_tezgah_isciligi,
        has_tuy_isciligi, dolar_tuy_isciligi
      ) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [
        atolye_adi,
        has_tezgah_isciligi,
        dolar_tezgah_isciligi,
        has_tuy_isciligi,
        dolar_tuy_isciligi,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Atölye güncelleme
app.patch("/api/atolye/:id", authMiddleware, async (req, res) => {
  const id = req.params.id;
  const fields = req.body; // örn: { has_tezgah_isciligi: 12 }

  try {
    // Dinamik SET sorgusu oluştur
    const setStr = Object.keys(fields)
      .map((key, idx) => `${key} = $${idx + 1}`)
      .join(", ");
    const values = Object.values(fields);

    const { rows } = await pool.query(
      `UPDATE atolye SET ${setStr} WHERE id = $${
        values.length + 1
      } RETURNING *`,
      [...values, id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "Atölye bulunamadı" });

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Atölye silme
app.delete("/api/atolye/:id", authMiddleware, async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query("DELETE FROM atolye WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.post("/api/atolye_defteri/:atolyeId", async (req, res) => {
  const { atolyeId } = req.params;
  const { tarih, islem_turu, has_miktar, dolar_miktar, aciklama, islem_yapan } =
    req.body;

  if (!["alacak", "verecek"].includes(islem_turu)) {
    return res.status(400).json({ error: "Geçersiz işlem türü" });
  }

  const hasMiktar = parseFloat(has_miktar) || 0;
  const dolarMiktar = parseFloat(dolar_miktar) || 0;

  if (hasMiktar <= 0 && dolarMiktar <= 0) {
    return res
      .status(400)
      .json({ error: "En az bir pozitif miktar girilmelidir." });
  }

  try {
    // 1. Atölye bakiyesini al
    const atolye = await pool.query(
      "SELECT has_bakiye_alacak, dolar_bakiye_alacak FROM atolye WHERE id = $1",
      [atolyeId]
    );

    if (atolye.rows.length === 0) {
      return res.status(404).json({ error: "Atölye bulunamadı" });
    }

    let bakiyeHas = parseFloat(atolye.rows[0].has_bakiye_alacak) || 0;
    let bakiyeDolar = parseFloat(atolye.rows[0].dolar_bakiye_alacak) || 0;

    // 2. İşleme göre bakiyeyi kontrol et/güncelle
    if (islem_turu === "verecek") {
      if (hasMiktar > bakiyeHas) {
        return res.status(400).json({ error: "Yetersiz has bakiyesi." });
      }
      if (dolarMiktar > bakiyeDolar) {
        return res.status(400).json({ error: "Yetersiz dolar bakiyesi." });
      }

      bakiyeHas -= hasMiktar;
      bakiyeDolar -= dolarMiktar;
    } else if (islem_turu === "alacak") {
      bakiyeHas += hasMiktar;
      bakiyeDolar += dolarMiktar;
    }

    // 3. Deftere kayıt ekle
    await pool.query(
      `INSERT INTO atolye_defteri (atolye_id, tarih, islem_turu, bakiye_has, bakiye_dolar, aciklama, islem_yapan)
   VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        atolyeId,
        tarih,
        islem_turu,
        hasMiktar,
        dolarMiktar,
        aciklama || "",
        islem_yapan || "",
      ]
    );

    // 4. Atölye bakiyesini güncelle
    await pool.query(
      `UPDATE atolye SET has_bakiye_alacak = $1, dolar_bakiye_alacak = $2 WHERE id = $3`,
      [bakiyeHas, bakiyeDolar, atolyeId]
    );

    res.status(201).json({ message: "İşlem başarıyla kaydedildi." });
  } catch (err) {
    console.error("ATOLYE DEFTERI POST HATASI:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Örnek: GET /api/dokum_defteri/:id
app.get("/api/:entity_defteri/:id", authMiddleware, async (req, res) => {
  const { entity_defteri, id } = req.params;

  // örnek: dokum_defteri → entity = "dokum"
  const entity = entity_defteri.replace("_defteri", "");

  const validEntities = ["dokum", "cila", "atolye", "mihlama", "tuy"];
  if (!validEntities.includes(entity)) {
    return res.status(400).json({ error: "Geçersiz entity" });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM ${entity}_defteri WHERE ${entity}_id = $1 ORDER BY tarih DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Detay sorgu hatası:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.get("/api/atolye_defteri/:atolyeId", authMiddleware, async (req, res) => {
  const { atolyeId } = req.params;
  try {
    const { rows } = await pool.query(
      "SELECT * FROM atolye_defteri WHERE atolye_id = $1 ORDER BY tarih DESC",
      [atolyeId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Defter verisi alınamadı:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Döküm listeleme
app.get("/api/dokum", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM dokum ORDER BY id");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Yeni döküm ekleme
app.post("/api/dokum", authMiddleware, async (req, res) => {
  const {
    dokum_adi,
    has_tezgah_isciligi = 0,
    dolar_tezgah_isciligi = 0,
    has_tuy_isciligi = 0,
    dolar_tuy_isciligi = 0,
    has_bakiye_alacak = 0,
    has_bakiye_verecek = 0,
    dolar_bakiye_alacak = 0,
    dolar_bakiye_verecek = 0,
  } = req.body;

  if (!dokum_adi) return res.status(400).json({ error: "Dökümcü adı gerekli" });

  try {
    const { rows } = await pool.query(
      `INSERT INTO dokum (
        dokum_adi, has_tezgah_isciligi, dolar_tezgah_isciligi,
        has_tuy_isciligi, dolar_tuy_isciligi,
        has_bakiye_alacak, has_bakiye_verecek,
        dolar_bakiye_alacak, dolar_bakiye_verecek
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        dokum_adi,
        has_tezgah_isciligi,
        dolar_tezgah_isciligi,
        has_tuy_isciligi,
        dolar_tuy_isciligi,
        has_bakiye_alacak,
        has_bakiye_verecek,
        dolar_bakiye_alacak,
        dolar_bakiye_verecek,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Döküm güncelleme
app.patch("/api/dokum/:id", authMiddleware, async (req, res) => {
  const id = req.params.id;
  const fields = req.body;

  try {
    const setStr = Object.keys(fields)
      .map((key, idx) => `${key} = $${idx + 1}`)
      .join(", ");
    const values = Object.values(fields);

    const { rows } = await pool.query(
      `UPDATE dokum SET ${setStr} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "Kayıt bulunamadı" });

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Döküm silme
app.delete("/api/dokum/:id", authMiddleware, async (req, res) => {
  const id = req.params.id;

  try {
    await pool.query("DELETE FROM dokum WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// cila listeleme
app.get("/api/cila", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM cila ORDER BY id");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Yeni cila ekleme
app.post("/api/cila", authMiddleware, async (req, res) => {
  const {
    cila_adi,
    has_tezgah_isciligi = 0,
    dolar_tezgah_isciligi = 0,
    has_tuy_isciligi = 0,
    dolar_tuy_isciligi = 0,
    has_bakiye_alacak = 0,
    has_bakiye_verecek = 0,
    dolar_bakiye_alacak = 0,
    dolar_bakiye_verecek = 0,
  } = req.body;

  if (!cila_adi) return res.status(400).json({ error: "Dökümcü adı gerekli" });

  try {
    const { rows } = await pool.query(
      `INSERT INTO cila (
        cila_adi, has_tezgah_isciligi, dolar_tezgah_isciligi,
        has_tuy_isciligi, dolar_tuy_isciligi,
        has_bakiye_alacak, has_bakiye_verecek,
        dolar_bakiye_alacak, dolar_bakiye_verecek
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        cila_adi,
        has_tezgah_isciligi,
        dolar_tezgah_isciligi,
        has_tuy_isciligi,
        dolar_tuy_isciligi,
        has_bakiye_alacak,
        has_bakiye_verecek,
        dolar_bakiye_alacak,
        dolar_bakiye_verecek,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// cila güncelleme
app.patch("/api/cila/:id", authMiddleware, async (req, res) => {
  const id = req.params.id;
  const fields = req.body;

  try {
    const setStr = Object.keys(fields)
      .map((key, idx) => `${key} = $${idx + 1}`)
      .join(", ");
    const values = Object.values(fields);

    const { rows } = await pool.query(
      `UPDATE cila SET ${setStr} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "Kayıt bulunamadı" });

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// CİLA silme
app.delete("/api/cila/:id", authMiddleware, async (req, res) => {
  const id = req.params.id;

  try {
    await pool.query("DELETE FROM cila WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// mihlama listeleme
app.get("/api/mihlama", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM mihlama ORDER BY id");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// mihlama cila ekleme
app.post("/api/mihlama", authMiddleware, async (req, res) => {
  const {
    mihlama,
    has_tezgah_isciligi = 0,
    dolar_tezgah_isciligi = 0,
    has_tuy_isciligi = 0,
    dolar_tuy_isciligi = 0,
    has_bakiye_alacak = 0,
    has_bakiye_verecek = 0,
    dolar_bakiye_alacak = 0,
    dolar_bakiye_verecek = 0,
  } = req.body;

  if (!mihlama) return res.status(400).json({ error: "Dökümcü adı gerekli" });

  try {
    const { rows } = await pool.query(
      `INSERT INTO mihlama (
        mihlama, has_tezgah_isciligi, dolar_tezgah_isciligi,
        has_tuy_isciligi, dolar_tuy_isciligi,
        has_bakiye_alacak, has_bakiye_verecek,
        dolar_bakiye_alacak, dolar_bakiye_verecek
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        mihlama,
        has_tezgah_isciligi,
        dolar_tezgah_isciligi,
        has_tuy_isciligi,
        dolar_tuy_isciligi,
        has_bakiye_alacak,
        has_bakiye_verecek,
        dolar_bakiye_alacak,
        dolar_bakiye_verecek,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// mihlama güncelleme
app.patch("/api/mihlama/:id", authMiddleware, async (req, res) => {
  const id = req.params.id;
  const fields = req.body;

  try {
    const setStr = Object.keys(fields)
      .map((key, idx) => `${key} = $${idx + 1}`)
      .join(", ");
    const values = Object.values(fields);

    const { rows } = await pool.query(
      `UPDATE mihlama SET ${setStr} WHERE id = $${
        values.length + 1
      } RETURNING *`,
      [...values, id]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "Kayıt bulunamadı" });

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// mihlama silme
app.delete("/api/mihlama/:id", authMiddleware, async (req, res) => {
  const id = req.params.id;

  try {
    await pool.query("DELETE FROM mihlama WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// tüy listeleme
app.get("/api/tuy", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM tuy ORDER BY id");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

//tuy ekleme
app.post("/api/tuy", authMiddleware, async (req, res) => {
  const {
    tuycu_adi,
    has_tezgah_isciligi = 0,
    dolar_tezgah_isciligi = 0,
    has_tuy_isciligi = 0,
    dolar_tuy_isciligi = 0,
    has_bakiye_alacak = 0,
    has_bakiye_verecek = 0,
    dolar_bakiye_alacak = 0,
    dolar_bakiye_verecek = 0,
  } = req.body;

  if (!tuycu_adi) return res.status(400).json({ error: "Dökümcü adı gerekli" });

  try {
    const { rows } = await pool.query(
      `INSERT INTO tuy (
        tuycu_adi, has_tezgah_isciligi, dolar_tezgah_isciligi,
        has_tuy_isciligi, dolar_tuy_isciligi,
        has_bakiye_alacak, has_bakiye_verecek,
        dolar_bakiye_alacak, dolar_bakiye_verecek
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        tuycu_adi,
        has_tezgah_isciligi,
        dolar_tezgah_isciligi,
        has_tuy_isciligi,
        dolar_tuy_isciligi,
        has_bakiye_alacak,
        has_bakiye_verecek,
        dolar_bakiye_alacak,
        dolar_bakiye_verecek,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// tuy güncelleme
app.patch("/api/tuy/:id", authMiddleware, async (req, res) => {
  const id = req.params.id;
  const fields = req.body;

  try {
    const setStr = Object.keys(fields)
      .map((key, idx) => `${key} = $${idx + 1}`)
      .join(", ");
    const values = Object.values(fields);

    const { rows } = await pool.query(
      `UPDATE tuy SET ${setStr} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "Kayıt bulunamadı" });

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// mihlama silme
app.delete("/api/tuy/:id", authMiddleware, async (req, res) => {
  const id = req.params.id;

  try {
    await pool.query("DELETE FROM tuy WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.listen(port, () => {
  console.log(`🚀 Sunucu ${port} portunda çalışıyor.`);
});
