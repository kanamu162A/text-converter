import express from "express";
import { generateMasterKey, viewHistory } from "../controllers/masterKeyController.js";
import { verifyToken,checkRole } from "../middleware/authMiddleware.js";
const router = express.Router();


router.post("/master-key",verifyToken,checkRole(["ceo"]), generateMasterKey);
router.get("/view-history",verifyToken,checkRole(["ceo"]), viewHistory);

export default router;
