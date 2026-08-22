// signalController.js — serves "/api/records"
import pool from "../config/db.js";
export async function getRecords(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, entity_id AS "entityId", source_id AS "sourceId",
              type, title, snippet, timestamp, confidence, topic
       FROM signals`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}