import pool from "../config/db.js";

export async function generateReport(req, res, next) {
  try {
    const [entities, records, relationships, evidence, alerts] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM entities`),
      pool.query(`SELECT COUNT(*)::int AS count FROM signals`),
      pool.query(`SELECT COUNT(*)::int AS count FROM relationships`),
      pool.query(`SELECT COUNT(*)::int AS count FROM evidence`),
      pool.query(`SELECT COUNT(*)::int AS count FROM alerts`),
    ]);
    res.json({
      id: `REPORT-${Date.now().toString().slice(-6)}`,
      title: `${req.body.investigation || "Operation Orion"} Intelligence Report`,
      generatedAt: new Date().toISOString(),
      investigation: req.body.investigation || "OPERATION-ORION",
      generatedBy: req.user.name,
      sections: 12,
      stats: {
        entities: entities.rows[0].count,
        records: records.rows[0].count,
        relationships: relationships.rows[0].count,
        evidence: evidence.rows[0].count,
        alerts: alerts.rows[0].count,
      },
    });
  } catch (err) { next(err); }
}