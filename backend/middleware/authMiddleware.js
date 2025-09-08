import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();



export const verifyToken = (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Access token missing" });
    }

    const token = header.split(" ")[1];

    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; 
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: err.name === "TokenExpiredError" 
        ? "Token has expired" 
        : "Invalid or expired token",
    });
  }
};

/**
 * @param {string|string[]} roles 
 */
export const checkRole = (roles) => {
  const allowed = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden: insufficient permissions" });
    }

    next();
  };
};
