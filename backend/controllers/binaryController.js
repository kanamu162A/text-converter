import pool from "../Config/db.js";
import { translate } from "@vitalets/google-translate-api";
import crypto from "crypto";

// ================= GENERATE RANDOM PIN =================
function generatePin(length = 4) {
  const digits = "0123456789";
  return Array.from({ length }, () => digits[Math.floor(Math.random() * digits.length)]).join("");
}

// ================= SAFE TRANSLATION =================
async function safeTranslate(text, lang, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const translated = await translate(text, { to: lang });
      return translated.text;
    } catch (err) {
      if (i === retries - 1) return `Translation failed: ${err.message}`;
      await new Promise((res) => setTimeout(res, 500));
    }
  }
}

// ================= ENCODE TEXT =================
export const encodeText = async (req, res) => {
  try {
    const { text, length = 15 } = req.body; // fixed length default 15
    if (!text) return res.status(400).json({ error: "Text is required" });

    const pin = generatePin();

    // Convert to binary + pin shift
    let binaryArr = text.split("").map((char, i) => {
      let code = char.charCodeAt(0) + parseInt(pin[i % pin.length]);
      return code.toString(2);
    });
    let rawBinary = binaryArr.join(" ");

    // Hash the binary (sha256) → fixed length output
    let hash = crypto.createHash("sha256").update(rawBinary).digest("hex");
    let fixedBinary = hash.slice(0, length); // e.g. 15 chars only

    // Save conversion (store original text for decoding later)
    await pool.query(
      "INSERT INTO conversions (user_id, original_text, binary_output, pin_hash) VALUES ($1, $2, $3, $4)",
      [req.user.id, text, fixedBinary, pin]
    );

    res.json({ binary_output: fixedBinary, pin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= DECODE TEXT (PIN required) =================
export const decodeText = async (req, res) => {
  try {
    const { binary_output, pin, languages } = req.body;

    if (!binary_output || !pin) {
      return res.status(400).json({ error: "Binary output and pin are required" });
    }

    // Lookup in DB by hashed binary + pin
    const result = await pool.query(
      "SELECT * FROM conversions WHERE binary_output=$1 AND pin_hash=$2",
      [binary_output, pin]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid binary or pin" });
    }

    const decoded = result.rows[0].original_text;

    // Normalize languages (keep behavior: if none provided, respond with "No translation selected")
    const langs = Array.isArray(languages) ? languages : (languages ? [languages] : []);

    const translations = {};
    if (langs.length > 0) {
      for (const lang of langs) {
        try {
          translations[lang] = await safeTranslate(decoded, lang);
        } catch (err) {
          // If a translation fails, record the error string for that language
          translations[lang] = `Translation failed: ${err.message}`;
        }
      }
    }

    // Return a consistent response that frontend can rely on
    return res.json({
      text: decoded, // ← frontend expects this
      original_text: decoded,
      translations: Object.keys(translations).length ? translations : "No translation selected",
    });
  } catch (err) {
    console.error("Decode error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
// ================= GENERATE MASTER KEY (CEO/Admin) =================
export const generateMasterKey = async (req, res) => {
  try {
    const user = req.user || req.body;

    if (!user || user.role !== "ceo") {
      return res.status(403).json({ success: false, error: "Only CEO can generate master key" });
    }

    const keyValue = crypto.randomBytes(16).toString("hex"); // 32-char key
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

// ================= DECODE USING MASTER KEY =================
export const decodeWithMasterKey = async (req, res) => {
  try {
    const { binary_output, key_value } = req.body;

    if (!binary_output || !key_value)
      return res.status(400).json({ error: "Binary and master key are required" });

    // Check if key exists and is valid
    const keyCheck = await pool.query(
      "SELECT * FROM master_keys WHERE key_value=$1 AND expires_at > NOW()",
      [key_value]
    );

    if (keyCheck.rows.length === 0)
      return res.status(400).json({ error: "Invalid or expired master key" });

    // Decode directly from DB (ignore PIN requirement)
    const result = await pool.query(
      "SELECT original_text FROM conversions WHERE binary_output=$1",
      [binary_output]
    );

    if (result.rows.length === 0)
      return res.status(400).json({ error: "Binary output not found" });

    res.json({ original_text: result.rows[0].original_text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
