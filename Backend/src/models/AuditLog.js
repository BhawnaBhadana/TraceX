import pool from "../config/db.js";

export async function createAuditLog({ userId, action, resource, resourceId, ipAddress }) {
  await pool.query(
    `INSERT INTO audit_logs (user_id, action, resource, resource_id, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId || null, action, resource, resourceId || null, ipAddress || null]
  );
}

export async function findAuditLogs({ userId, action, resource, limit = 100, offset = 0 } = {}) {
  const conditions = [];
  const values = [];

  if (userId) {
    values.push(userId);
    conditions.push(`user_id = $${values.length}`);
  }
  if (action) {
    values.push(action);
    conditions.push(`action = $${values.length}`);
  }
  if (resource) {
    values.push(resource);
    conditions.push(`resource = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  values.push(limit);
  const limitParam = `$${values.length}`;
  values.push(offset);
  const offsetParam = `$${values.length}`;

  const result = await pool.query(
    `SELECT id, user_id AS "userId", action, resource, resource_id AS "resourceId",
            ip_address AS "ipAddress", timestamp
     FROM audit_logs
     ${whereClause}
     ORDER BY timestamp DESC
     LIMIT ${limitParam} OFFSET ${offsetParam}`,
    values
  );
  return result.rows;
}