// signalRoutes.js — serves "/api/records"
import express from "express";
import { getRecords } from "../controllers/signalController.js";
const router = express.Router();
router.get("/", getRecords);
export default router;