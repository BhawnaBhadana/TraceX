import pool from "../config/db.js";
import { computeEntityScore, computeNetworkMetrics } from "../services/scoringService.js";
import { findPotentialMatches } from "../services/resolutionService.js";

export async function getEntities(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, type, aliases, sources, priority,
              first_observed AS "firstObserved",
              last_observed AS "lastObserved",
              activity, community, description
       FROM entities`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

export async function getEntity(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, type, aliases, sources, priority,
              first_observed AS "firstObserved",
              last_observed AS "lastObserved",
              activity, community, description
       FROM entities WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Entity not found" });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

export async function getEntityScore(req, res, next) {
  try {
    const data = await computeEntityScore(req.params.id);
    if (!data) return res.status(404).json({ message: "Entity not found" });
    res.json(data);
  } catch (err) { next(err); }
}

export async function getEntityMatches(req, res, next) {
  try {
    const matches = await findPotentialMatches(req.params.id);
    res.json(matches);
  } catch (err) { next(err); }
}

export async function getEntityNetworkMetrics(req, res, next) {
  try {
    const metrics = await computeNetworkMetrics(req.params.id);
    res.json(metrics);
  } catch (err) { next(err); }
}