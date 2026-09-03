import pool from "../config/db.js";
import crypto from "crypto";

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Clear existing data first (safe to re-run)
    await client.query(`
      TRUNCATE TABLE signal_candidates, trends, alerts, evidence, signals,
      relationships, entities, investigations RESTART IDENTITY CASCADE
    `);

    // Investigation
    const inv = await client.query(
      `INSERT INTO investigations (case_code, title, status)
       VALUES ($1, $2, $3) RETURNING id`,
      ["CASE-2026-014", "Operation Orion", "ACTIVE"]
    );
    const invId = inv.rows[0].id;

    // Entities
    const entities = [
      ["ALPHA-17", "PERSON", "HIGH"],
      ["BETA-04", "PERSON", "MEDIUM"],
      ["ORION-NODE-03", "CHANNEL", "HIGH"],
      ["MARKET-NODE-08", "MARKETPLACE", "CRITICAL"],
      ["NORTH-ROUTE-12", "LOCATION", "MEDIUM"],
    ];
    const entityIds = {};
    for (const [name, type, priority] of entities) {
      const r = await client.query(
        `INSERT INTO entities (name, type, priority, investigation_id, first_observed, last_observed)
         VALUES ($1, $2, $3, $4, NOW() - INTERVAL '30 days', NOW())
         RETURNING id`,
        [name, type, priority, invId]
      );
      entityIds[name] = r.rows[0].id;
    }

    // Relationships
    const rels = [
      ["ALPHA-17", "BETA-04", "COMMUNICATED_WITH", 0.91],
      ["ALPHA-17", "MARKET-NODE-08", "LISTED_ON", 0.87],
      ["BETA-04", "ORION-NODE-03", "MEMBER_OF", 0.83],
      ["MARKET-NODE-08", "NORTH-ROUTE-12", "ASSOCIATED_WITH", 0.76],
    ];
    for (const [a, b, type, conf] of rels) {
      await client.query(
        `INSERT INTO relationships (source_id, target_id, type, confidence, investigation_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [entityIds[a], entityIds[b], type, conf, invId]
      );
    }

    // Signals
    const signalId = crypto.randomUUID();
    await client.query(
      `INSERT INTO signals (id, title, snippet, source, entity_id, investigation_id, topic, type, confidence, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '2 hours')`,
      [
        signalId,
        "Cross-source correlation detected",
        "Repeated alias overlap across two encrypted channels",
        "Synthetic OSINT feed",
        entityIds["ALPHA-17"],
        invId,
        "network_activity",
        "correlation",
        94,
      ]
    );

    // Evidence
    const ev = await client.query(
      `INSERT INTO evidence (evidence_id, source, sha256_hash, confidence, status, finding, investigation_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        "EVID-0087",
        "Encrypted platform export",
        "a8f2c91e4b7d0a3f5c8e2d1b9a7f6e4c3d2b1a0f9e8d7c6b5a4f3e2d1c0b9a87",
        94,
        "VERIFIED",
        "Cross-referenced alias match confirms entity linkage",
        invId,
      ]
    );
    const evidenceId = ev.rows[0].id;

    // Alert
    await client.query(
      `INSERT INTO alerts (title, severity, priority, confidence, status, investigation_id, entity_ids, evidence_ids, reason, ai_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        "ALERT-009: Cross-source correlation detected",
        "CRITICAL",
        91,
        94,
        "OPEN",
        invId,
        JSON.stringify([entityIds["ALPHA-17"], entityIds["BETA-04"], entityIds["ORION-NODE-03"]]),
        JSON.stringify([evidenceId]),
        JSON.stringify({
          factors: [
            { label: "Network behavior", points: 24 },
            { label: "Cross-source match", points: 22 },
            { label: "Signal frequency", points: 20 },
            { label: "Historical activity", points: 15 },
            { label: "Route association", points: 10 },
          ],
        }),
        "TRACE-X flagged repeated cross-platform activity linking ALPHA-17 to a known marketplace node, with corroborating signals from two independent sources.",
      ]
    );

    // Trend
    const trendName = "Synthetic drug signal frequency";
    const trendId = `TREND-${trendName.toUpperCase().replace(/\s+/g, "_")}`;
    await client.query(
      `INSERT INTO trends (id, name, growth_percent, confidence, entities, status, color, description, investigation_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        trendId,
        trendName,
        42,
        81,
        JSON.stringify([entityIds["ALPHA-17"], entityIds["MARKET-NODE-08"]]),
        "RISING",
        "red",
        "Marked increase in cross-source mentions over the past 7 days",
        invId,
      ]
    );

    await client.query("COMMIT");
    console.log("✅ Seed complete — Operation Orion loaded");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seed failed:", err);
  } finally {
    client.release();
    process.exit();
  }
}

seed();