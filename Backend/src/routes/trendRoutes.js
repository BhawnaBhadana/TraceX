// trendRoutes.js
import express from "express";
import { getTrends } from "../controllers/trendController.js";
const router = express.Router();
router.get("/", getTrends);
export default router;