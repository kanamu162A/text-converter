import pool from "../Config/db.js";

export const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, email, role, created_at FROM users WHERE id=$1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: result.rows[0] }); // ✅ wrap in { user }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getHistory = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT original_text, binary_output, pin_hash, created_at FROM conversions WHERE user_id=$1 ORDER BY created_at DESC",
      [req.user.id]
    );

    res.json({ history: result.rows }); // ✅ wrap in { history }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
