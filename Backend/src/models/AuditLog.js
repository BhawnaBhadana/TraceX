import pool from "../config/db.js";
import crypto from "crypto";

export async function createAuditLog({ userId, action, resource, resourceId, ipAddress }) {
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO audit_logs (id, user_id, action, resource, resource_id, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, userId || null, action, resource || null, resourceId || null, ipAddress || null]
  );
  return id;
}

export async function findAuditLogs({ userId, action, resource, limit = 100, offset = 0 } = {}) {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (userId) { conditions.push(`user_id = $${idx++}`); values.push(userId); }
  if (action) { conditions.push(`action = $${idx++}`); values.push(action); }
  if (resource) { conditions.push(`resource = $${idx++}`); values.push(resource); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  values.push(limit, offset);

  const result = await pool.query(
    `SELECT id, user_id AS "userId", action, resource, resource_id AS "resourceId",
            ip_address AS "ipAddress", timestamp
     FROM audit_logs
     ${where}
     ORDER BY timestamp DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    values
  );
  return result.rows;
}