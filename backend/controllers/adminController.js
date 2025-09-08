import pool from "../Config/db.js";


export const getAllUsers = async (req, res) => {
  try {
    const r = await pool.query("SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC");
    await logAudit(req.user.id, "admin_view_users", "");
    res.json({ success:true, users: r.rows });
  } catch (err) {
    res.status(500).json({ success:false, message: err.message });
  }
};

export const getAllConversions = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const r = await pool.query(
      `SELECT 
         c.id, 
         u.username AS user, 
         c.original_text AS text, 
         c.binary_output AS binary, 
         c.pin_hash AS pin, 
         c.created_at AS date
       FROM conversions c
       JOIN users u ON c.user_id = u.id
       ORDER BY c.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query("SELECT COUNT(*) FROM conversions");
    const total = parseInt(countResult.rows[0].count, 10);


    res.json({ 
      success: true, 
      conversions: r.rows, 
      page, 
      limit, 
      total 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========================= USER: Get Own Conversions =========================
export const getUserConversions = async (req, res) => {
  try {
    const { page = 1, limit = 100} = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id; // ✅ From verifyToken middleware

    // Fetch user-specific conversions
    const r = await pool.query(
      `SELECT 
         id, 
         original_text AS text, 
         binary_output AS binary, 
         pin_hash AS pin, 
         created_at AS date
       FROM conversions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    // Count total conversions for pagination
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM conversions WHERE user_id = $1",
      [userId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    res.json({
      success: true,
      conversions: r.rows,
      page,
      limit,
      total
    });

  } catch (err) {
    console.error("User Conversions Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const getAuditLogs = async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500");
    res.json({ success:true, logs: r.rows });
  } catch (err) {
    res.status(500).json({ success:false, message: err.message });
  }
};
