import pool from "../Config/db.js";
import crypto from "crypto";

export const generateMasterKey = async (req, res) => {
  try {
    if (req.user.role !== "ceo") {
      return res.status(403).json({ success: false, error: "Only CEO can generate master key" });
    }

    const key = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      "INSERT INTO master_keys (key_value, expires_at, created_by) VALUES ($1, $2, $3)",
      [key, expiresAt, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: "Master key generated successfully",
      master_key: key,
      expires_at: expiresAt,
    });
  } catch (err) {
    console.error("Master Key Error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

export const viewHistory = async (req, res) => {
  try {
    const { master_key } = req.query;
    let query, params;

    if (req.user.role === "ceo") {
      if (master_key) {
        const result = await pool.query(
          "SELECT * FROM master_keys WHERE key_value=$1 AND expires_at > NOW()",
          [master_key]
        );

        if (result.rows.length === 0) {
          return res.status(403).json({ success: false, error: "Invalid or expired master key" });
        }

        query = "SELECT * FROM conversions ORDER BY created_at DESC";
        params = [];
      } else {
        query = "SELECT * FROM conversions ORDER BY created_at DESC";
        params = [];
      }
    } else {
      query = "SELECT * FROM conversions WHERE user_id=$1 ORDER BY created_at DESC";
      params = [req.user.id];
    }

    const history = await pool.query(query, params);

    res.json({
      success: true,
      count: history.rows.length,
      history: history.rows,
    });
  } catch (err) {
    console.error("View History Error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};
