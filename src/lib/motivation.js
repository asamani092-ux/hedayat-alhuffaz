/**
 * الرسائل التحفيزية — تُختار حسب نسبة اليوم وجنس الطالب.
 *
 * في Apps Script كانت الرسائل نصّاً واحداً في الإعدادات يُفكَّك عند كل طلب
 * (parseMotivationMessages)، والاستحقاق يحدّده qualifiesForMotivation.
 * هنا صارت صفوفاً في motivation_messages بعتبات صريحة.
 *
 * ⚠ شروط الاستحقاق الأصلية غير منقولة بعد — راجع qualifiesForMotivation.
 */

export async function pickMessage(db, { percentage, gender }) {
  const { results } = await db
    .prepare(
      `SELECT body FROM motivation_messages
        WHERE is_active = 1
          AND ? >= min_percent AND ? <= max_percent
          AND (gender = 'any' OR gender = ?)`
    )
    .bind(percentage, percentage, gender ?? 'any')
    .all();

  if (!results.length) return null;
  return results[Math.floor(Math.random() * results.length)].body;
}

/** التمييز في الخطاب — مقابل isFemaleGender. */
export function addressing(gender) {
  return gender === 'female'
    ? { you: 'أنتِ', didYou: 'أنجزتِ', keep: 'واصلي' }
    : { you: 'أنت', didYou: 'أنجزت', keep: 'واصل' };
}
