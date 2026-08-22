// reportRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { generateReport } from "../controllers/reportController.js";
const router = express.Router();
router.post("/generate", protect, generateReport);
export default router;