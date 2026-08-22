// evidenceRoutes.js
import express from "express";
import { getEvidence } from "../controllers/evidenceController.js";
const router = express.Router();
router.get("/", getEvidence);
export default router;