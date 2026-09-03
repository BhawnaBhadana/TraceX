import pool from "../config/db.js";

export async function getRelationships(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id,
              source_id AS "sourceId",
              target_id AS "targetId",
              type, confidence,
              created_at AS "timestamp"
       FROM relationships`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}