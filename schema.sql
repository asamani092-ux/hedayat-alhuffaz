-- مقرأة هدايات الحفّاظ — مخطط قاعدة البيانات (Cloudflare D1)
-- مشتقّ من أوراق Google Sheets في النسخة الأولى، مع تطبيع العلاقات وإضافة الفهارس.

PRAGMA foreign_keys = ON;

-- ───────────────────────── الدفعات ─────────────────────────
-- في نسخة Apps Script كانت الأرشفة تُنشئ أوراقاً جديدة لكل دفعة.
-- هنا الدفعة صفّ واحد، والأرشفة تغيير حالة — لا نسخ بيانات.
CREATE TABLE batches (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT    NOT NULL UNIQUE,              -- معرّف الدفعة، مثل "2026-A"
  label       TEXT    NOT NULL,                     -- الاسم المعروض
  status      TEXT    NOT NULL DEFAULT 'active'
              CHECK (status IN ('active','archived')),
  started_on  TEXT,                                 -- ISO date
  archived_on TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_batches_status ON batches(status);

-- ───────────────────────── المسارات ─────────────────────────
CREATE TABLE tracks (
  id            TEXT    PRIMARY KEY,                -- معرّف مطبّع (كان normalizeTrackId)
  label         TEXT    NOT NULL,
  daily_tasks   INTEGER NOT NULL DEFAULT 7,         -- عدد المهام اليومية
  description   TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

-- ───────────────────────── الطلاب ─────────────────────────
CREATE TABLE students (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  public_id          TEXT    NOT NULL UNIQUE,       -- المعرّف المعروض للطالب
  name               TEXT    NOT NULL,
  nickname           TEXT,
  phone              TEXT    NOT NULL,              -- مفتاح الدخول
  gender             TEXT    CHECK (gender IN ('male','female')),
  telegram           TEXT,
  city               TEXT,
  age                INTEGER,
  nationality        TEXT,

  track_id           TEXT    REFERENCES tracks(id),
  batch_id           INTEGER NOT NULL REFERENCES batches(id),

  status             TEXT    NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','active','paused','withdrawn','rejected','graduated')),

  -- بيانات الحفظ
  riwayah            TEXT,                          -- الرواية
  total_ajzaa        REAL,                          -- الأجزاء المحفوظة
  start_juz          INTEGER,                       -- جزء البداية
  halaqa             TEXT,
  pledge             INTEGER NOT NULL DEFAULT 0,    -- التعهّد

  join_date          TEXT,
  last_activity_date TEXT,                          -- آخر يوم رصد
  created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- الجوال فريد داخل الدفعة الواحدة فقط: الطالب قد يعود في دفعة لاحقة.
CREATE UNIQUE INDEX idx_students_phone_batch ON students(phone, batch_id);
CREATE INDEX idx_students_phone    ON students(phone);        -- كان findStudentByPhone مسحاً خطّياً
CREATE INDEX idx_students_batch    ON students(batch_id, status);
CREATE INDEX idx_students_activity ON students(last_activity_date);

-- ───────────────────────── الرصد اليومي ─────────────────────────
-- صفّ واحد لكل طالب في كل يوم. المهام مخزّنة كـ JSON لأن عددها يختلف بالمسار.
CREATE TABLE daily_logs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id    INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  batch_id      INTEGER NOT NULL REFERENCES batches(id),
  log_date      TEXT    NOT NULL,                   -- يوم الرصد (ISO) — لا وقت الإرسال
  tasks         TEXT    NOT NULL DEFAULT '[]',      -- JSON: [true,false,...]
  percentage    REAL    NOT NULL DEFAULT 0,
  submitted_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK (percentage >= 0 AND percentage <= 100)
);

-- يمنع الرصد المزدوج — كان يُدار بذاكرة مؤقتة في النسخة السابقة.
CREATE UNIQUE INDEX idx_logs_student_date ON daily_logs(student_id, log_date);
CREATE INDEX idx_logs_date   ON daily_logs(log_date);
CREATE INDEX idx_logs_batch  ON daily_logs(batch_id, log_date);

-- ───────────────────────── المرشحون ─────────────────────────
-- يُستخرجون من دفعات مؤرشفة لإعادة ضمّهم في دفعة جديدة.
CREATE TABLE candidates (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  source_student INTEGER REFERENCES students(id) ON DELETE SET NULL,
  source_batch   INTEGER REFERENCES batches(id),
  name           TEXT    NOT NULL,
  phone          TEXT    NOT NULL,
  gender         TEXT,
  telegram       TEXT,
  nickname       TEXT,
  city           TEXT,
  nationality    TEXT,
  riwayah        TEXT,
  track_id       TEXT    REFERENCES tracks(id),
  days_count     INTEGER NOT NULL DEFAULT 0,        -- أيام الرصد في الدفعة السابقة
  status         TEXT    NOT NULL DEFAULT 'nominated'
                 CHECK (status IN ('nominated','restored','declined')),
  nominated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE UNIQUE INDEX idx_candidates_src ON candidates(source_student, source_batch);

-- ───────────────────────── الإعدادات ─────────────────────────
CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,                         -- JSON أو نص
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ───────────────────────── الرسائل التحفيزية ─────────────────────────
-- كانت تُقرأ من الإعدادات كنصّ واحد ثم تُفكَّك (parseMotivationMessages).
CREATE TABLE motivation_messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  body        TEXT    NOT NULL,
  gender      TEXT    CHECK (gender IN ('male','female','any')) DEFAULT 'any',
  min_percent REAL    NOT NULL DEFAULT 0,           -- عتبة الاستحقاق
  max_percent REAL    NOT NULL DEFAULT 100,
  is_active   INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_motivation_range ON motivation_messages(is_active, min_percent, max_percent);

-- ───────────────────────── جلسات المشرفين ─────────────────────────
CREATE TABLE admins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,                   -- لا كلمات سر صريحة
  display_name  TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  token      TEXT PRIMARY KEY,
  subject_id INTEGER NOT NULL,
  role       TEXT    NOT NULL CHECK (role IN ('student','admin')),
  expires_at TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sessions_expiry ON sessions(expires_at);

-- ───────────────────────── عرض: تجميع النقاط ─────────────────────────
-- يُغني عن readDailyLogsAggregates التي كانت تقرأ الورقة كاملة في الذاكرة.
CREATE VIEW student_scores AS
SELECT
  s.id            AS student_id,
  s.batch_id      AS batch_id,
  COUNT(l.id)     AS days_logged,
  COALESCE(AVG(l.percentage), 0)  AS avg_percentage,
  COALESCE(SUM(l.percentage), 0)  AS total_score,
  MAX(l.log_date) AS last_log_date
FROM students s
LEFT JOIN daily_logs l ON l.student_id = s.id
GROUP BY s.id, s.batch_id;
