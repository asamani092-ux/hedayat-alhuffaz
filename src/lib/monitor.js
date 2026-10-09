/**
 * المهمة الدورية — مقابل runSmartMonitor في Apps Script.
 * تعمل يومياً بعد موعد الرصد النهائي.
 */
export async function runDailyMonitor(env) {
  const db = env.DB;

  // تحديث آخر نشاط لكل طالب من سجلات الرصد.
  await db
    .prepare(
      `UPDATE students
          SET last_activity_date = (
                SELECT MAX(log_date) FROM daily_logs WHERE student_id = students.id
              )
        WHERE status = 'active'`
    )
    .run();

  // تنظيف الجلسات المنتهية.
  await db.prepare(`DELETE FROM sessions WHERE expires_at < datetime('now')`).run();

  // TODO: رصد المنقطعين وإشعار المشرف — راجع runSmartMonitor الأصلية.
}
