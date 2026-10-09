/**
 * الترتيب — عام وداخل الدفعة.
 *
 * في Apps Script كان التجميع يقرأ ورقة الرصد كاملة في الذاكرة
 * (readDailyLogsAggregates / aggregateStudentScoresFromSheet) ثم يرتّب.
 * هنا يقوم بالتجميع استعلامٌ على العرض student_scores.
 *
 * ⚠ قواعد الترتيب وفضّ التعادل غير منقولة بعد —
 *   راجع sortLeaderboardEntries / buildRankedTopFifty في المشروع الأصلي.
 */

const TOP_LIMIT = 50;

/** لوحة الصدارة العامة. */
export async function getGlobalLeaderboard(db, { limit = TOP_LIMIT } = {}) {
  const { results } = await db
    .prepare(
      `SELECT s.id, s.public_id, s.name, s.nickname, s.gender, s.track_id,
              sc.days_logged, sc.avg_percentage, sc.total_score
         FROM student_scores sc
         JOIN students s ON s.id = sc.student_id
        WHERE s.status = 'active'
        ORDER BY sc.total_score DESC, sc.days_logged DESC, s.name ASC
        LIMIT ?`
    )
    .bind(limit)
    .all();

  return rank(results);
}

/** الترتيب داخل دفعة واحدة. */
export async function getBatchLeaderboard(db, batchId, { limit = TOP_LIMIT } = {}) {
  const { results } = await db
    .prepare(
      `SELECT s.id, s.public_id, s.name, s.nickname, s.gender, s.track_id,
              sc.days_logged, sc.avg_percentage, sc.total_score
         FROM student_scores sc
         JOIN students s ON s.id = sc.student_id
        WHERE sc.batch_id = ? AND s.status = 'active'
        ORDER BY sc.total_score DESC, sc.days_logged DESC, s.name ASC
        LIMIT ?`
    )
    .bind(batchId, limit)
    .all();

  return rank(results);
}

/** ترتيب طالب بعينه داخل دفعته. */
export async function getStudentRank(db, studentId, batchId) {
  const row = await db
    .prepare(
      `SELECT COUNT(*) + 1 AS rank
         FROM student_scores sc
         JOIN students s ON s.id = sc.student_id
        WHERE sc.batch_id = ?
          AND s.status = 'active'
          AND sc.total_score > (SELECT total_score FROM student_scores WHERE student_id = ?)`
    )
    .bind(batchId, studentId)
    .first();

  return row?.rank ?? null;
}

/** يضيف رقم الترتيب، ويمنح المتساوين نفس الرقم. */
function rank(rows) {
  let lastScore = null;
  let lastRank = 0;

  return rows.map((row, i) => {
    if (row.total_score !== lastScore) {
      lastRank = i + 1;
      lastScore = row.total_score;
    }
    return { ...row, rank: lastRank };
  });
}
