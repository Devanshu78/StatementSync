import dotenv from "dotenv";
dotenv.config();

import { Pool } from "pg";

let pool = null;

const getPool = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DB_URL,
      ssl: { rejectUnauthorized: false },
      // ✅ Serverless optimizations
      max: 1, // Limit connections for serverless
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
};

export async function initDb() {
  const sql = `
  -- users
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- uploads (what user uploaded and when)
  CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bank_filename TEXT NOT NULL,
    shop_filename TEXT NOT NULL,
    detected_month TEXT,
    status TEXT NOT NULL DEFAULT 'processing',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_uploads_user ON uploads(user_id, created_at DESC);

  -- audits (results of reconciliation)
  CREATE TABLE IF NOT EXISTS audits (
    id TEXT PRIMARY KEY,
    upload_id TEXT NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month TEXT,
    stats_json JSONB NOT NULL,
    matches_json JSONB NOT NULL,
    anomalies_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_audits_user_month ON audits(user_id, month);
  `;
  const pool = getPool();
  await pool.query(sql);
}

export { getPool as pool };

// ---- helpers
export async function createUser({ id, name, email, passwordHash }) {
  const pool = getPool();
  const q = `
    INSERT INTO users (id, name, email, password_hash)
    VALUES ($1,$2,$3,$4) RETURNING id, name, email, created_at
  `;
  const { rows } = await pool.query(q, [id, name, email, passwordHash]);
  return rows[0];
}

export async function findUserByEmail(email) {
  const pool = getPool();
  const { rows } = await pool.query(
    "SELECT * FROM users WHERE email = $1 LIMIT 1",
    [email]
  );
  return rows[0] || null;
}

export async function createUpload({ id, userId, bankFilename, shopFilename }) {
  const pool = getPool();
  const q = `
    INSERT INTO uploads (id, user_id, bank_filename, shop_filename, status)
    VALUES ($1,$2,$3,$4,'processing')
    RETURNING *
  `;
  const { rows } = await pool.query(q, [
    id,
    userId,
    bankFilename,
    shopFilename,
  ]);
  return rows[0];
}

export async function finalizeUpload({ id, detectedMonth, status }) {
  const pool = getPool();
  const q = `
    UPDATE uploads SET detected_month = $2, status = $3
    WHERE id = $1 RETURNING *
  `;
  const { rows } = await pool.query(q, [id, detectedMonth, status]);
  return rows[0];
}

export async function createAudit({
  id,
  uploadId,
  userId,
  month,
  stats,
  matches,
  anomalies,
}) {
  const pool = getPool();
  const q = `
    INSERT INTO audits (id, upload_id, user_id, month, stats_json, matches_json, anomalies_json)
    VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb)
    RETURNING *
  `;
  const params = [
    id,
    uploadId,
    userId,
    month,
    JSON.stringify(stats),
    JSON.stringify(matches),
    JSON.stringify(anomalies),
  ];
  const { rows } = await pool.query(q, params);
  return rows[0];
}

export async function listUploadsByUser(userId, limit = 20) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT * FROM uploads WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return rows;
}


export async function getAuditById(uploadId, userId) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT * FROM audits WHERE upload_id = $1 AND user_id = $2 LIMIT 1`,
    [uploadId, userId]
  );
  return rows[0] || null;
}
