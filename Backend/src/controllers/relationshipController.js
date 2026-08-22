// relationshipController.js
import pool from "../config/db.js";
export async function getRelationships(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, source, target, type, timestamp, confidence,
              source_id AS "sourceId"
       FROM relationships`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}