import { PrismaClient } from '@prisma/client';

const db = new PrismaClient({ log: [] });
const run = process.env.MVP_VALIDATION_RUN_ID;
const fixtureIds = run ? [1, 2].map(index => `${run}-${index}`) : [];
try {
  if (process.env.VERCEL_ENV !== 'production') throw new Error('Production environment required.');
  if (run && !/^mvp-validation-20261003-[a-f0-9]{12}$/.test(run)) throw new Error('Invalid validation run.');
  if (process.argv.includes('--fixtures')) {
    const hash = process.env.MVP_VALIDATION_HASH;
    if (!run || !/^\$2[aby]\$\d\d\$.{53}$/.test(hash || '')) throw new Error('Missing validation credentials.');
    if (await db.user.count({ where: { id: { in: fixtureIds } } })) throw new Error('Validation fixtures already exist.');
    await db.user.createMany({ data: fixtureIds.map((id, index) => ({
      id, email: `${id}@example.invalid`, name: `Validação temporária ${index + 1}`,
      passwordHash: hash, role: 'STUDENT', emailVerifiedAt: new Date(),
    })) });
    console.log(`Created ${fixtureIds.length} isolated validation accounts.`);
  }
  if (process.argv.includes('--cleanup')) {
    if (!run) throw new Error('Missing validation run.');
    const fixtures = await db.user.findMany({ where: { id: { in: fixtureIds } }, select: { id: true, email: true, role: true } });
    if (fixtures.some(user => user.email !== `${user.id}@example.invalid` || user.role !== 'STUDENT')) throw new Error('Unexpected validation account.');
    await db.entitlement.deleteMany({ where: { userId: { in: fixtures.map(user => user.id) } } });
    const deleted = await db.user.deleteMany({ where: { id: { in: fixtures.map(user => user.id) } } });
    console.log(`Removed ${deleted.count} validation accounts and their cascading test data.`);
  }
  const [questions, courses, products, flashcards, exams, admins, owner, migrations] = await Promise.all([
    db.question.count({ where: { status: 'PUBLISHED', reviewState: 'APPROVED' } }),
    db.course.count({ where: { published: true, status: 'PUBLISHED' } }),
    db.product.findMany({ where: { status: 'PUBLISHED' }, select: { id: true, name: true, priceCents: true, abacateProductId: true, checkoutUrl: true } }),
    db.flashcard.count({ where: { status: 'PUBLISHED' } }),
    db.provaAntiga.count(), db.user.count({ where: { role: 'ADMIN' } }),
    db.user.findUnique({ where: { email: 'guilhermeda2008@gmail.com' }, select: { role: true, emailVerifiedAt: true } }),
    db.$queryRaw`SELECT COUNT(*)::int AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
  ]);
  console.log('RELEASE_AUDIT ' + JSON.stringify({
    appUrl: process.env.NEXT_PUBLIC_APP_URL, migrations: migrations[0].count,
    catalog: { publishedApprovedQuestions: questions, publishedCourses: courses, flashcards, oldExams: exams, products },
    accounts: { adminCount: admins, ownerRole: owner?.role, ownerVerified: Boolean(owner?.emailVerifiedAt) },
    payments: { provider: process.env.PAYMENT_PROVIDER || 'abacatepay', configured: Boolean(process.env.ABACATEPAY_API_KEY), environment: process.env.ABACATEPAY_ENV || 'sandbox', webhookConfigured: Boolean(process.env.ABACATEPAY_WEBHOOK_SECRET) },
  }));
  const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error('Storage configuration absent.');
  const headers = { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' };
  const materials = await db.material.findMany({ where: { status: 'PUBLISHED' }, select: { title: true, fileUrl: true } });
  for (const material of materials) {
    const match = material.fileUrl?.match(/^\/api\/materials\/files\/([^/?]+)$/);
    if (!match) {
      console.log('MATERIAL_AUDIT ' + JSON.stringify({ title: material.title, delivery: material.fileUrl ? 'external-or-other' : 'no-file' }));
      continue;
    }
    const response = await fetch(`${base}/storage/v1/object/material-pdfs/${encodeURIComponent(decodeURIComponent(match[1]))}`, { headers, method: 'HEAD', signal: AbortSignal.timeout(15000) });
    console.log('MATERIAL_AUDIT ' + JSON.stringify({ title: material.title, storageHttpStatus: response.status, size: response.headers.get('content-length') }));
  }
  for (const name of [...new Set(['exam-pdfs', 'material-pdfs', 'question-images', 'official-exam-files', 'essay-images', 'course-media', process.env.COURSE_MEDIA_BUCKET || 'question-images', process.env.AVATAR_IMAGES_BUCKET || 'question-images'])]) {
    const response = await fetch(`${base}/storage/v1/bucket/${name}`, { headers, signal: AbortSignal.timeout(15000) });
    if (response.ok) {
      const bucket = await response.json();
      console.log('STORAGE_AUDIT ' + JSON.stringify({ name, public: bucket.public, status: 'exists' }));
    } else {
      const message = await response.text();
      const missing = response.status === 404 || (response.status === 400 && /not found|does not exist/i.test(message));
      if (missing && process.argv.includes('--create-buckets')) {
        const created = await fetch(`${base}/storage/v1/bucket`, { method: 'POST', headers, body: JSON.stringify({ id: name, name, public: false }), signal: AbortSignal.timeout(15000) });
        if (!created.ok) throw new Error(`Bucket creation failed: ${name} (${created.status}).`);
        console.log('STORAGE_AUDIT ' + JSON.stringify({ name, public: false, status: 'created' }));
      } else console.log('STORAGE_AUDIT ' + JSON.stringify({ name, status: missing ? 'missing' : 'unavailable', httpStatus: response.status }));
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[connection hidden]') : 'Release audit failed.');
  process.exitCode = 1;
} finally { await db.$disconnect(); }
