import express from "express";
import { getAllUsers, getAllConversions,getUserConversions  } from "../controllers/adminController.js";
import { verifyToken, checkRole } from "../middleware/authMiddleware.js";

const router = express.Router();
router.get("/users", verifyToken, checkRole(["ceo"]), getAllUsers);
router.get("/all/history", verifyToken, checkRole(["ceo"]), getAllConversions);
router.get("/history", verifyToken, getUserConversions);


export default router;
