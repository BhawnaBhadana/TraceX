import pool from "../config/db.js";
import crypto from "crypto";

/**
 * Given a signal's CONFIRMED candidates, resolves each one to an entity
 * (matching an existing alias, or creating a new entity for human review when
 * nothing matches) and creates CO_OCCURRENCE relationships between every pair
 * of entities that appeared together in that signal.
 *
 * This is the pipeline's "Correlate" + "Connect" stages running on real
 * confirmed data — call it after an analyst confirms a candidate via
 * reviewCandidate() in signalController.js.
 */
export async function correlateSignal(signalId) {
  const candRes = await pool.query(
    `SELECT * FROM signal_candidates WHERE signal_id = $1 AND status = 'CONFIRMED'`,
    [signalId]
  );
  if (candRes.rows.length === 0) return { entityIds: [], relationshipsCreated: 0 };

  const signalRes = await pool.query(`SELECT * FROM signals WHERE id = $1`, [signalId]);
  const signal = signalRes.rows[0];

  const entityIds = [];
  for (const cand of candRes.rows) {
    const entityId = await resolveOrCreateEntity(cand, signal);
    entityIds.push(entityId);
    await pool.query(`UPDATE signal_candidates SET matched_entity_id = $1 WHERE id = $2`, [entityId, cand.id]);
  }

  let relationshipsCreated = 0;
  const uniqueEntityIds = [...new Set(entityIds)];
  for (let i = 0; i < uniqueEntityIds.length; i++) {
    for (let j = i + 1; j < uniqueEntityIds.length; j++) {
      const [a, b] = [uniqueEntityIds[i], uniqueEntityIds[j]];
      const existing = await pool.query(
        `SELECT id FROM relationships WHERE (source = $1 AND target = $2) OR (source = $2 AND target = $1)`,
        [a, b]
      );
      if (existing.rows.length > 0) continue;

      await pool.query(
        `INSERT INTO relationships (id, source, target, type, timestamp, confidence, source_id)
         VALUES ($1, $2, $3, 'CO_OCCURRENCE', $4, $5, $6)`,
        [crypto.randomUUID(), a, b, new Date().toISOString(), 60, signal?.source_id || null]
      );
      relationshipsCreated++;
    }
  }

  return { entityIds: uniqueEntityIds, relationshipsCreated };
}

async function resolveOrCreateEntity(candidate, signal) {
  const value = candidate.canonical_value || candidate.value;

  const matchRes = await pool.query(`SELECT id FROM entities WHERE $1 = ANY(aliases)`, [value]);
  if (matchRes.rows.length > 0) {
    await pool.query(
      `UPDATE entities SET last_observed = $1, activity = COALESCE(activity, 0) + 1 WHERE id = $2`,
      [new Date().toISOString(), matchRes.rows[0].id]
    );
    return matchRes.rows[0].id;
  }

  const id = `ENT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  await pool.query(
    `INSERT INTO entities (id, type, aliases, sources, priority, first_observed, last_observed, activity, community, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      candidate.type,
      [value],
      signal?.source_id ? [signal.source_id] : [],
      candidate.confidence >= 0.8 ? 3 : 2,
      new Date().toISOString(),
      new Date().toISOString(),
      1,
      null,
      `Auto-created from a confirmed candidate in signal ${signal?.id || "unknown"}`,
    ]
  );
  return id;
}