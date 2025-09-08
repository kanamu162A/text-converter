import express from "express";
import { encodeText, decodeText,decodeWithMasterKey } from "../controllers/binaryController.js";
import { verifyToken, checkRole} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/encode", verifyToken, encodeText);
router.post("/decode", verifyToken, decodeText);
router.post("/master-key", verifyToken, checkRole(["ceo","admin"]), decodeWithMasterKey);


export default router;
