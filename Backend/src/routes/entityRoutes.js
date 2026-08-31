import express from "express";
import { getEntities, getEntity, getEntityScore, getEntityMatches, getEntityNetworkMetrics } from "../controllers/entityController.js";

const router = express.Router();
router.get("/", getEntities);
router.get("/:id", getEntity);
router.get("/:id/score", getEntityScore);
router.get("/:id/matches", getEntityMatches);
router.get("/:id/network-metrics", getEntityNetworkMetrics);
export default router;