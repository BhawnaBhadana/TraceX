// evidenceController.js
import pool from "../config/db.js";
export async function getEvidence(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, type, source, timestamp, hash,
              full_hash AS "fullHash",
              confidence, status, finding
       FROM evidence`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}