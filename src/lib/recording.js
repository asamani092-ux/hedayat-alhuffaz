/**
 * نافذة الرصد — يوم الرصد وموعده النهائي وحساب التأخر.
 *
 * هذه قواعد عمل، لا تفاصيل تنفيذ: الرصد ينتمي ليوم محدّد وله موعد نهائي،
 * وليس لوقت إرسال الطالب. المقابل في Apps Script:
 * getRecordingDate / getRecordingDeadline / getRecordingDateInfo / getDaysBehindRecording
 *
 * ⚠ غير منقول بعد — اقرأ المنطق الأصلي من مشروع Apps Script الحيّ قبل التنفيذ.
 */

/** @param {Date} now @param {string} timezone @returns {string} ISO date */
export function getRecordingDate(now, timezone) {
  // TODO: قبل الموعد النهائي يكون يوم الرصد هو اليوم؛ بعده ينتقل لليوم التالي.
  throw new Error('getRecordingDate: غير منفّذ');
}

/** @returns {Date} */
export function getRecordingDeadline(recordingDate, deadlineHour, timezone) {
  // TODO
  throw new Error('getRecordingDeadline: غير منفّذ');
}

/**
 * أيام التأخر عن الرصد — يحدّد من يظهر في تبويب المتعثّرين.
 * @returns {number}
 */
export function getDaysBehind(lastActivityDate, recordingDate) {
  if (!lastActivityDate) return Infinity;
  const a = Date.parse(lastActivityDate);
  const b = Date.parse(recordingDate);
  if (Number.isNaN(a) || Number.isNaN(b)) return Infinity;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/** نسبة الإنجاز من قائمة المهام. */
export function calculatePercentage(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) return 0;
  const done = tasks.filter(Boolean).length;
  return Math.round((done / tasks.length) * 1000) / 10;
}
