import express from "express";
import { getHistory, getProfile } from "../controllers/dashboardController.js";
import { verifyToken,checkRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/profile",verifyToken,getProfile);
router.get("/history",verifyToken,checkRole(["ceo"]), getHistory);

export default router;
