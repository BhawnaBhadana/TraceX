import pool from "../config/db.js";

export async function getEvidence(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id,
              evidence_id AS "evidenceId",
              source,
              created_at AS "timestamp",
              sha256_hash AS "hash",
              sha256_hash AS "fullHash",
              confidence, status, finding
       FROM evidence`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}