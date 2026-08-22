// alertRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getAlerts, verifySignal, rejectSignal, requestMoreEvidence, acknowledgeAlert } from "../controllers/alertController.js";

const router = express.Router();
router.get("/", getAlerts);
router.post("/:id/verify", protect, verifySignal);
router.post("/:id/reject", protect, rejectSignal);
router.post("/:id/request-evidence", protect, requestMoreEvidence);
router.post("/:id/acknowledge", protect, acknowledgeAlert);
export default router;