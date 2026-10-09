import { Hono } from 'hono';
import { cors } from 'hono/cors';

import auth from './routes/auth.js';
import student from './routes/student.js';
import admin from './routes/admin.js';
import batches from './routes/batches.js';
import candidates from './routes/candidates.js';
import { runDailyMonitor } from './lib/monitor.js';

const app = new Hono();

app.use('/api/*', cors());

app.get('/api/health', (c) => c.json({ ok: true }));

app.route('/api/auth', auth);
app.route('/api/student', student);
app.route('/api/admin', admin);
app.route('/api/batches', batches);
app.route('/api/candidates', candidates);

app.onError((err, c) => {
  console.error(err);
  const status = err.status ?? 500;
  return c.json(
    { error: status === 500 ? 'حدث خطأ غير متوقّع' : err.message },
    status
  );
});

// المسارات غير المعرّفة: واجهة البرمجة تُرجع خطأ، وغير ذلك يُمرَّر للأصول الثابتة.
// التعقيد: زمن ثابت O(1) ومكان ثابت O(1) لكل طلب.
app.notFound(async (c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json({ error: 'المسار غير موجود' }, 404);
  }
  return c.env.ASSETS.fetch(c.req.raw);
});

export default {
  fetch: app.fetch,

  // المهمة الدورية — مقابل runSmartMonitor في النسخة السابقة.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runDailyMonitor(env));
  },
};
