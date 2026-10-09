# خريطة الترحيل — من Apps Script إلى Cloudflare

## الأوراق ← الجداول

| ورقة Google Sheets | جدول D1 | ملاحظة |
|---|---|---|
| `Students_Master` | `students` | أضيف `public_id`، وفُصل `batch` إلى مفتاح أجنبي |
| `Daily_Logs` | `daily_logs` | `Task1..Task7` ← عمود `tasks` بصيغة JSON ليدعم عدداً متغيّراً |
| `Tracks_Config` | `tracks` | `daily_tasks` يحدّد عدد المهام لكل مسار |
| `Settings` | `settings` + `motivation_messages` | الرسائل كانت نصّاً واحداً يُفكَّك؛ صارت صفوفاً |
| `Pending_Apps` | `students` بحالة `pending` | لا حاجة لجدول منفصل |
| `Candidates` | `candidates` | — |
| أوراق الأرشيف لكل دفعة | `batches.status='archived'` | لا نسخ بيانات؛ الأرشفة تغيير حالة |

## الدوال ← المسارات

### الطالب
| الدالة | المسار |
|---|---|
| `registerStudent` | `POST /api/auth/register` |
| `loginStudent` | `POST /api/auth/login` |
| `submitTasks` | `POST /api/student/logs` |
| `getStudentStats` | `GET /api/student/stats` |
| `getRegistrationSettings` | `GET /api/settings/registration` |

### المشرف
| الدالة | المسار |
|---|---|
| `adminLogin` | `POST /api/auth/admin` |
| `getAdminDashboardData` | `GET /api/admin/dashboard` |
| `approveMultipleStudents` | `POST /api/admin/students/approve` |
| `rejectStudent` | `POST /api/admin/students/:id/reject` |
| `changeStudentStatus`, `changeMultipleStudentsStatus` | `PATCH /api/admin/students/status` |
| `updateStudentData`, `updateFullStudentData` | `PATCH /api/admin/students/:id` |
| `updateSettings` | `PUT /api/admin/settings` |

### الدفعات والأرشيف
| الدالة | المسار |
|---|---|
| `migrateCurrentBatch` | `POST /api/batches/:id/archive` |
| `getArchivedBatchDashboardData` | `GET /api/batches/:id/dashboard` |
| `getArchivedStudentStats` | `GET /api/batches/:id/students/:sid/stats` |
| `changeArchivedStudentStatus`, `changeMultipleArchivedStudentsStatus` | `PATCH /api/batches/:id/students/status` |
| `updateArchivedStudentData` | `PATCH /api/batches/:id/students/:sid` |

> الدوال المنفصلة للطلاب المؤرشفين تختفي: الأرشفة صارت حالة، فنفس المسار يخدم الحالتين.

### المرشحون
| الدالة | المسار |
|---|---|
| `refreshCandidatesFromAllArchives` | `POST /api/candidates/refresh` |
| `getCandidatesDashboardData` | `GET /api/candidates` |
| `restoreCandidatesAsNewStudents` | `POST /api/candidates/restore` |

### ما يسقط من الترحيل
`putCacheSafe`, `clearCache`, `getTodaySubmittedCacheKey`, `readTodaySubmittedFromSheet`, `rememberTodaySubmittedStudent` — كلها التفاف على بطء القراءة من الأوراق؛ يغني عنها فهرس `idx_logs_student_date`.

`ensureSheetWithHeaders`, `createFreshArchiveSheet`, `trimRawSheetForAdmin`, `mergeLegacyCandidateSheetsIntoOne` — إدارة أوراق لا مقابل لها في قاعدة علائقية.

`setupDatabase` ← `schema.sql`.

## منطق يجب نقله حرفياً

هذه هي قواعد العمل، وأي تغيير فيها يغيّر سلوك النظام أمام مستخدميه:

1. **`getRecordingDate` / `getRecordingDeadline`** — تحديد يوم الرصد وموعده النهائي. الرصد ينتمي ليوم محدّد لا لوقت الإرسال.
2. **`getDaysBehindRecording`** — حساب أيام التأخر؛ يحدّد من يظهر في تبويب المتعثّرين.
3. **`qualifiesForMotivation` + `getMotivationalMessage`** — شروط استحقاق الرسالة واختيارها حسب النسبة والجنس.
4. **`sortLeaderboardEntries` + `buildRankedTopFifty`** — قواعد الترتيب وفضّ التعادل.
5. **`buildCandidatesFromArchive`** — معايير ترشيح الطالب من دفعة مؤرشفة.
6. **`normalizeTrackId`** — تطبيع معرّف المسار.

> **تنبيه:** هذه الدوال لم تُنقل بعد. تفاصيلها في مشروع Apps Script الحيّ، ويجب قراءتها منه قبل التنفيذ لا إعادة اختراعها.

## استيراد البيانات

النظام الحالي يعمل ببيانات فعلية. خطة النقل:

1. تصدير كل ورقة إلى CSV.
2. سكربت تحويل يطابق الأعمدة بالخريطة أعلاه، يبني `batches` و`tracks` أولاً ثم `students` ثم `daily_logs`.
3. `wrangler d1 execute --file` للإدخال.
4. تحقّق: عدد الطلاب، عدد سجلات الرصد، ومطابقة متوسط النسبة لكل طالب قبل وبعد.
5. تشغيل النظامين بالتوازي فترة قبل التحويل.
