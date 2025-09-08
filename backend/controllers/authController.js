import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../Config/db.js";

// ========================= HELPERS =========================
const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET not set in environment variables");
  }
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

const sendError = (res, statusCode, message) => {
  return res.status(statusCode).json({
    success: false,
    error: message,
  });
};

// ========================= REGISTER =========================
export const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return sendError(res, 400, "All fields (username, email, password) are required");
    }

    // Check if email or username already exists
    const { rows: existingUsers } = await pool.query(
      "SELECT * FROM users WHERE email = $1 OR username = $2",
      [email, username]
    );

    if (existingUsers.length > 0) {
      return sendError(res, 409, "User with this email or username already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert new user
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, role, created_at`,
      [username, email, hashedPassword, role || "user"]
    );

    const user = rows[0];

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      user,
    });
  } catch (err) {
    console.error("Register error:", err.message);
    return sendError(res, 500, "Internal server error during registration");
  }
};

// ========================= LOGIN =========================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return sendError(res, 400, "Email and password are required");

    const { rows } = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    if (!rows.length) return sendError(res, 404, "User not found");

    const user = rows[0];

    // faster comparison
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return sendError(res, 401, "Invalid password");

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    return sendError(res, 500, "Internal server error during login");
  }
};
