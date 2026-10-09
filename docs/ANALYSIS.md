# تحليل النظام الحالي — مقرأة هدايات الحفاظ (Apps Script)

> مستخرج من مشروع Apps Script الحيّ بتاريخ 2026-10-09 — قراءة فقط، بلا أي تعديل.
> الحجم: 3,449 سطراً (الرمز.gs: 1,624 | Index.html: 1,825)

## نموذج البيانات (أوراق Google Sheets)

### Students_Master — سجل الطلاب
`ID, Name, Nickname, Phone, Track, Batch, Status, Telegram, Gender, LastActivityDate, JoinDate, City, Age, Nationality, Riwayah, TotalAjzaa, StartJuz, Halaqa, Pledge`

### Daily_Logs — الرصد اليومي
`Date, StudentID, Batch, Task1..Task7, Percentage`

سبع مهام يومية، تُحسب منها نسبة الإنجاز.

### Candidates — المرشحون (يُبنى من الأرشيف)
`ID, Name, Phone, Telegram, Gender, Track, Batch, DaysCount, Nickname, City, Nationality, Riwayah, Status, NominatedAt`

### Tracks_Config — إعداد المسارات
### Settings — إعدادات النظام
### Pending_Apps — طلبات التسجيل المعلّقة

### أوراق الأرشيف (ديناميكية لكل دفعة)
`getArchiveStudentsSheetName(batch)` و `getArchiveLogsSheetName(batch)` — تُنشأ ورقتان لكل دفعة مؤرشفة.

---

## واجهة المستخدم (5 شاشات)

| الشاشة | الوصف |
|---|---|
| `view-login` | دخول الطالب (بالجوال) |
| `view-register` | تسجيل طالب جديد |
| `view-student` | لوحة الطالب — رصد المهام، الترتيب، رسالة تحفيزية |
| `view-adminLogin` | دخول المشرف |
| `view-admin` | لوحة المشرف |

### تبويبات لوحة المشرف
- `tab-pending` — طلبات التسجيل
- `tab-students` — الطلاب، بثلاثة تبويبات فرعية: `all-students` / `top-students` / `struggling`
- `tab-archives` — الأرشيف والمرشحون
- `tab-settings` — الإعدادات
- نوافذ: `editStudentModal`, `statsStudentModal`

---

## واجهة الخادم (24 دالة يستدعيها العميل)

### الطالب
`registerStudent`, `loginStudent`, `submitTasks`, `getStudentStats`, `getRegistrationSettings`

### إدارة الطلاب
`getAdminDashboardData`, `adminLogin`, `approveMultipleStudents`, `rejectStudent`,
`changeStudentStatus`, `changeMultipleStudentsStatus`, `updateStudentData`, `updateFullStudentData`

### الأرشيف والدفعات
`migrateCurrentBatch`, `getArchivedBatchDashboardData`, `changeArchivedStudentStatus`,
`changeMultipleArchivedStudentsStatus`, `updateArchivedStudentData`, `getArchivedStudentStats`

### المرشحون
`refreshCandidatesFromAllArchives`, `getCandidatesDashboardData`, `restoreCandidatesAsNewStudents`

### أخرى
`updateSettings`, `runSmartMonitor`

---

## الأفكار الجوهرية التي يجب الحفاظ عليها

1. **الرصد اليومي بسبع مهام** مع احتساب نسبة مئوية — قلب النظام.
2. **نافذة الرصد الزمنية** — `getRecordingDate`, `getRecordingDeadline`: الرصد مرتبط بيوم محدد وموعد نهائي، لا بوقت الإرسال.
3. **التأخر عن الرصد** — `getDaysBehindRecording`: تتبع من انقطع وكم يوماً.
4. **الترتيب على مستويين** — عام (`getGlobalRankFromScores`) وداخل الدفعة (`getBatchRankFromAggregates`)، مع لوحة أفضل خمسين (`buildRankedTopFifty`).
5. **الرسائل التحفيزية المشروطة** — `qualifiesForMotivation` + `getMotivationalMessage`: رسالة تُختار حسب نسبة اليوم وجنس الطالب، قابلة للتهيئة من الإعدادات.
6. **دورة حياة الدفعة** — دفعة جارية → أرشفة (`migrateCurrentBatch`) → استخراج مرشحين من الأرشيف (`buildCandidatesFromArchive`) → إعادتهم طلاباً جدداً (`restoreCandidatesAsNewStudents`).
7. **المسارات** — `Tracks_Config` وتطبيع المعرّفات (`normalizeTrackId`).
8. **المراقب الذكي** — `runSmartMonitor`: مهمة دورية.
9. **دورة الموافقة** — تسجيل → معلّق → موافقة/رفض → نشط.
10. **التمييز حسب الجنس** في الخطاب (`isFemaleGender`).

---

## قيود البنية الحالية (دوافع الترحيل)

- **التخزين المؤقت في كل مكان** (`putCacheSafe`, `getTodaySubmittedCacheKey`, `clearCache`) — التفاف على بطء قراءة الأوراق.
- **قراءة الورقة كاملة للتجميع** (`readDailyLogsAggregates`, `aggregateStudentScoresFromSheet`) — يتدهور طردياً مع نمو البيانات؛ استعلام SQL يحلّه.
- **الأرشفة بإنشاء أوراق جديدة** — في قاعدة علائقية يكفي عمود `batch` وفهرس.
- **لا توجد فهارس** — `findStudentByPhone` مسح خطّي.
- **حدود حصص Apps Script** على التنفيذ المتزامن.
