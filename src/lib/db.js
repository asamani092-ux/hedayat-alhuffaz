/** مساعدات قاعدة البيانات. */

export async function getActiveBatch(db) {
  return db.prepare(`SELECT * FROM batches WHERE status = 'active' ORDER BY id DESC LIMIT 1`).first();
}

export async function findStudentByPhone(db, phone, batchId) {
  // كان مسحاً خطّياً على الورقة؛ الآن مفهرس — idx_students_phone_batch.
  return db
    .prepare(`SELECT * FROM students WHERE phone = ? AND batch_id = ?`)
    .bind(phone, batchId)
    .first();
}

export async function getSetting(db, key, fallback = null) {
  const row = await db.prepare(`SELECT value FROM settings WHERE key = ?`).bind(key).first();
  if (!row) return fallback;
  try { return JSON.parse(row.value); } catch { return row.value; }
}

export async function setSetting(db, key, value) {
  const v = typeof value === 'string' ? value : JSON.stringify(value);
  return db
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .bind(key, v)
    .run();
}
