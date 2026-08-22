import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import pool from "../config/db.js";
import {
  entities, records, relationships, alerts, trends,
  evidence, investigations, notifications, categories,
} from "./seedData.js";

dotenv.config();

async function run() {
  await pool.query(`TRUNCATE notifications, categories, alerts, evidence, relationships, signals, trends, entities, investigations, users`);

  for (const inv of investigations) {
    await pool.query(
      `INSERT INTO investigations (id, name, status, entities, records, relationships, alerts, trends, updated)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [inv.id, inv.name, inv.status, inv.entities, inv.records, inv.relationships, inv.alerts, inv.trends, inv.updated]
    );
  }

  for (const e of entities) {
    await pool.query(
      `INSERT INTO entities (id, type, aliases, sources, priority, first_observed, last_observed, activity, community, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [e.id, e.type, e.aliases, e.sources, e.priority, e.firstObserved, e.lastObserved, e.activity, e.community, e.description]
    );
  }

  for (const r of records) {
    await pool.query(
      `INSERT INTO signals (id, entity_id, source_id, type, title, snippet, timestamp, confidence, topic)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [r.id, r.entityId, r.sourceId, r.type, r.title, r.snippet, r.timestamp, r.confidence, r.topic]
    );
  }

  for (const rel of relationships) {
    await pool.query(
      `INSERT INTO relationships (id, source, target, type, timestamp, confidence, source_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [rel.id, rel.source, rel.target, rel.type, rel.timestamp, rel.confidence, rel.sourceId]
    );
  }

  for (const a of alerts) {
    await pool.query(
      `INSERT INTO alerts (id, type, severity, priority, confidence, status, entity_ids, evidence_ids, timestamp, what, why)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [a.id, a.type, a.severity, a.priority, a.confidence, a.status, a.entityIds, a.evidenceIds, a.timestamp, a.what, a.why]
    );
  }

  for (const t of trends) {
    await pool.query(
      `INSERT INTO trends (id, name, growth, confidence, entities, status, color, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [t.id, t.name, t.growth, t.confidence, t.entities, t.status, t.color, t.description]
    );
  }

  for (const ev of evidence) {
    await pool.query(
      `INSERT INTO evidence (id, type, source, timestamp, hash, full_hash, confidence, status, finding)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [ev.id, ev.type, ev.source, ev.timestamp, ev.hash, ev.fullHash, ev.confidence, ev.status, ev.finding]
    );
  }

  for (const n of notifications) {
    await pool.query(
      `INSERT INTO notifications (id, title, detail, route, alert_id, entity_id, trend_id, unread, time)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [n.id, n.title, n.detail, n.route, n.alertId || null, n.entityId || null, n.trendId || null, n.unread, n.time]
    );
  }

  for (const name of categories) {
    await pool.query(`INSERT INTO categories (name) VALUES ($1) ON CONFLICT DO NOTHING`, [name]);
  }

  const hashed = await bcrypt.hash("ChangeMe123!", 10);
  await pool.query(
    `INSERT INTO users (id, name, email, password, role) VALUES ($1,$2,$3,$4,$5)`,
    [crypto.randomUUID(), "A. Patel", "apatel@tracex.local", hashed, "investigator"]
  );

  console.log("Seed complete. Login: apatel@tracex.local / ChangeMe123!");
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});