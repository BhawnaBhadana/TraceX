// entityController.js
import pool from "../config/db.js";

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