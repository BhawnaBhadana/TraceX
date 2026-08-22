// entityRoutes.js
import express from "express";
import { getEntities, getEntity } from "../controllers/entityController.js";
const router = express.Router();
router.get("/", getEntities);
router.get("/:id", getEntity);
export default router;