import express from "express";
import { encodeText, decodeText,decodeWithMasterKey,searchUserConversions,
  searchAllConversionsAsCEO
} from "../controllers/binaryController.js";
import { verifyToken, checkRole} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/encode", verifyToken, encodeText);
router.post("/decode", verifyToken, decodeText);
router.post("/master-key", verifyToken, checkRole(["ceo","admin"]), decodeWithMasterKey);
router.post("/search", verifyToken, searchUserConversions); 
router.post("/admin/search", verifyToken, checkRole(["ceo"]), searchAllConversionsAsCEO); 


export default router;
