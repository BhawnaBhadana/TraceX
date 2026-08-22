// trendController.js
import pool from "../config/db.js";
export async function getTrends(req, res, next) {
  try {
    const result = await pool.query(`SELECT * FROM trends`);
    res.json(result.rows);
  } catch (err) { next(err); }
}