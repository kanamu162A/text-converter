// ================= IMPORTS =================
import express from "express";
import pool from "../Config/db.js";
import translate from "@vitalets/google-translate-api"; // ✅ correct import
import crypto from "crypto";

const router = express.Router();

// ================= UTILITIES =================

// Generate random numeric PIN
function generatePin(length = 4) {
  const digits = "0123456789";
  return Array.from({ length }, () =>
    digits[Math.floor(Math.random() * digits.length)]
  ).join("");
}

// Safe translation with retries + clean fallback
async function safeTranslate(text, lang, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await translate(text, { to: lang });

      if (result && result.text && result.text.trim() !== "") {
        return result.text.trim();
      }
    } catch (err) {
      if (i === retries - 1) {
        console.error(`❌ Translation failed for "${text}" -> ${lang}:`, err.message);
        return null; // Return null if fully failed
      }
    }
  }
  return null;
}

// ================= ENCODE TEXT =================
export const encodeText = async (req, res) => {
  try {
    const { text, length = 15 } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    const pin = generatePin();

    // Convert text into binary with PIN offset
    let binaryArr = text.split("").map((char, i) => {
      let code = char.charCodeAt(0) + parseInt(pin[i % pin.length]);
      return code.toString(2);
    });
    let rawBinary = binaryArr.join(" ");

    // Hash and shorten
    let hash = crypto.createHash("sha256").update(rawBinary).digest("hex");
    let fixedBinary = hash.slice(0, length);

    // ⚠️ Store hashed PIN for security
    const pinHash = crypto.createHash("sha256").update(pin).digest("hex");

    await pool.query(
      "INSERT INTO conversions (user_id, original_text, binary_output, pin_hash) VALUES ($1, $2, $3, $4)",
      [req.user.id, text, fixedBinary, pinHash]
    );

    res.json({ binary_output: fixedBinary, pin }); // Return raw pin only to user
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= DECODE TEXT =================
export const decodeText = async (req, res) => {
  try {
    const { binary_output, pin, languages } = req.body;
    if (!binary_output || !pin) {
      return res.status(400).json({ error: "Binary output and pin are required" });
    }

    const pinHash = crypto.createHash("sha256").update(pin).digest("hex");

    const result = await pool.query(
      "SELECT original_text FROM conversions WHERE binary_output=$1 AND pin_hash=$2 LIMIT 1",
      [binary_output, pinHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid binary or pin" });
    }

    const decoded = result.rows[0].original_text;
    const langs = Array.isArray(languages) ? languages : (languages ? [languages] : []);
    const translations = {};

    for (const lang of langs) {
      const translated = await safeTranslate(decoded, lang);
      translations[lang] = translated || "Translation unavailable";
    }

    return res.json({
      text: decoded,
      original_text: decoded,
      translations: Object.keys(translations).length ? translations : "No translation selected",
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ================= GENERATE MASTER KEY =================
export const generateMasterKey = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== "ceo") {
      return res.status(403).json({ success: false, error: "Only CEO can generate master key" });
    }

    const keyValue = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await pool.query(
      "INSERT INTO master_keys (key_value, expires_at, created_by) VALUES ($1, $2, $3)",
      [keyValue, expiresAt, user.id]
    );

    res.json({ key_value: keyValue, expires_at: expiresAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= DECODE WITH MASTER KEY =================
export const decodeWithMasterKey = async (req, res) => {
  try {
    const { binary_output, key_value } = req.body;
    if (!binary_output || !key_value)
      return res.status(400).json({ error: "Binary and master key are required" });

    const keyCheck = await pool.query(
      "SELECT 1 FROM master_keys WHERE key_value=$1 AND expires_at > NOW() LIMIT 1",
      [key_value]
    );

    if (keyCheck.rows.length === 0)
      return res.status(400).json({ error: "Invalid or expired master key" });

    const result = await pool.query(
      "SELECT original_text FROM conversions WHERE binary_output=$1 LIMIT 1",
      [binary_output]
    );

    if (result.rows.length === 0)
      return res.status(400).json({ error: "Binary output not found" });

    res.json({ original_text: result.rows[0].original_text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= SEARCH HELPERS (Fast with Index) =================
async function searchConversionsByToken({ userId, token, isCEO = false }) {
  if (!token) throw new Error("Token is required");

  const conditions = [];
  const values = [];
  let index = 1;

  if (userId && !isCEO) {
    conditions.push(`c.user_id = $${index++}`);
    values.push(userId);
  }

  conditions.push(`c.binary_output ILIKE $${index++}`);
  values.push(`%${token}%`);

  const sql = `
    SELECT c.id, u.email, c.original_text, c.binary_output, c.created_at
    FROM conversions c
    JOIN users u ON c.user_id = u.id
    WHERE ${conditions.join(" AND ")}
    ORDER BY c.created_at DESC
    LIMIT 50
  `;

  const { rows } = await pool.query(sql, values);
  return rows;
}

// ================= USER SEARCH =================
export const searchUserConversions = async (req, res) => {
  try {
    const { token } = req.body;
    const rows = await searchConversionsByToken({ userId: req.user.id, token });
    if (rows.length === 0) return res.status(404).json({ message: "No matching conversions found" });
    res.json({ conversions: rows });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ================= CEO SEARCH =================
export const searchAllConversionsAsCEO = async (req, res) => {
  try {
    const { token } = req.body;
    const rows = await searchConversionsByToken({ token, isCEO: true });
    if (rows.length === 0) return res.status(404).json({ message: "No matching conversions found" });
    res.json({ conversions: rows });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export default router;
