import pool from "../config/db.js";
import crypto from "crypto";
import { computeEntityScore } from "./scoringService.js";
import { explainAlert } from "./aiService.js";
import logger from "../utils/logger.js";

const ALERT_THRESHOLD = 70;

/**
 * Checks an entity's explainable score (from scoringService) and opens a real
 * alert if it crosses the threshold and there isn't already an open one for it.
 * The rule-based score and reasons are what actually decide whether an alert
 * fires; an AI-written one-sentence narration is added on top, best-effort,
 * purely to make `why` readable — if Groq is slow, rate-limited, or the key
 * isn't set, the alert still gets created with its rule-based `why` intact.
 */
export async function maybeCreateAlert(entityId) {
  const scoreData = await computeEntityScore(entityId);
  if (!scoreData || scoreData.score < ALERT_THRESHOLD) return null;

  const existing = await pool.query(
    `SELECT id FROM alerts WHERE $1 = ANY(entity_ids) AND status NOT IN ('REJECTED', 'ACKNOWLEDGED')`,
    [entityId]
  );
  if (existing.rows.length > 0) return null;

  const id = `ALERT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const what = `Entity ${entityId} crossed the analytical threshold (score ${scoreData.score})`;
  const why = scoreData.reasons.map((r) => `${r.label} (+${r.points})`).join("; ");

  let aiSummary = null;
  try {
    aiSummary = await explainAlert({ what, why });
  } catch (err) {
    logger.error(`AI explanation skipped for ${id}: ${err.message}`);
  }

  await pool.query(
    `INSERT INTO alerts (id, type, severity, priority, confidence, status, entity_ids, evidence_ids, timestamp, what, why, ai_summary)
     VALUES ($1, 'SCORE_THRESHOLD', $2, $3, $4, 'UNREVIEWED', $5, $6, $7, $8, $9, $10)`,
    [
      id,
      scoreData.score >= 85 ? "HIGH" : "MEDIUM",
      scoreData.score >= 85 ? 1 : 2,
      scoreData.score,
      [entityId],
      [],
      new Date().toISOString(),
      what,
      why,
      aiSummary,
    ]
  );
  return id;
}