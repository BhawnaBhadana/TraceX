// relationshipRoutes.js
import express from "express";
import { getRelationships } from "../controllers/relationshipController.js";
const router = express.Router();
router.get("/", getRelationships);
export default router;