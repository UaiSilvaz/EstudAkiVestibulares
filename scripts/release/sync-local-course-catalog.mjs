import fs from 'node:fs';
import { PrismaClient, Prisma } from '@prisma/client';

const db = new PrismaClient({ transactionOptions: { maxWait: 20000, timeout: 120000 } });
const expectedEmail = 'guilhermeda2009@gmail.com';
const payload = JSON.parse(fs.readFileSync(new URL('./local-course-catalog.json', import.meta.url), 'utf8'));
const models = new Map(Prisma.dmmf.datamodel.models.map(model => [model.name, model]));
const rows = new Map(payload.rows.map(row => [row.model + ':' + row.data.id, row]));
const mapped = new Map();
const applied = new Set();
const allowed = new Set(['Course', 'Subject', 'Module', 'Lesson', 'Topic', 'Product', 'Material', 'LessonQuestion', 'Question', 'QuestionAlternative', 'Vestibular', 'Reward', 'Simulation']);
const delegate = (tx, name) => tx[name[0].toLowerCase() + name.slice(1)];

async function importRow(tx, row) {
  const key = row.model + ':' + row.data.id;
  if (applied.has(key)) return mapped.get(key);
  if (!allowed.has(row.model)) throw new Error('Unexpected release model.');
  const model = models.get(row.model);
  const data = { ...row.data };
  for (const field of model.fields.filter(field => field.kind === 'object' && field.relationFromFields?.length === 1)) {
    const foreignKey = field.relationFromFields[0];
    if (!data[foreignKey]) continue;
    const dependency = rows.get(field.type + ':' + data[foreignKey]);
    if (!dependency) throw new Error('Release dependency missing: ' + field.type);
    data[foreignKey] = await importRow(tx, dependency);
  }
  if (row.model === 'Simulation') data.questionIds = await Promise.all((data.questionIds || []).map(async id => {
    const question = rows.get('Question:' + id);
    if (!question) throw new Error('Simulation question missing.');
    return importRow(tx, question);
  }));
  for (const field of model.fields.filter(field => field.type === 'Json')) {
    if (data[field.name] === null) data[field.name] = field.isRequired ? Prisma.JsonNull : Prisma.DbNull;
  }
  const accessor = delegate(tx, row.model);
  const natural = model.fields.find(field => field.isUnique && field.name === 'slug');
  let existing = natural ? await accessor.findUnique({ where: { slug: data.slug } }) : null;
  if (!existing && row.model === 'LessonQuestion') existing = await accessor.findUnique({where:{lessonId_questionId:{lessonId:data.lessonId,questionId:data.questionId}}});
  if (!existing) existing = await accessor.findUnique({ where: { id: data.id } });
  const update = Object.fromEntries(Object.entries(data).filter(([name]) => !['id', 'createdAt', 'updatedAt'].includes(name)));
  // Existing taxonomy is shared with other content; only resolve its ID.
  const sharedTaxonomy = ['Subject', 'Topic', 'Vestibular'].includes(row.model);
  const saved = existing
    ? sharedTaxonomy ? existing : await accessor.update({ where: { id: existing.id }, data: update })
    : await accessor.create({ data });
  applied.add(key);
  mapped.set(key, saved.id);
  return saved.id;
}

try {
  if (payload.version !== 1 || payload.courseSlugs.length !== 2 || rows.size !== payload.rows.length) throw new Error('Invalid course release.');
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({ courses: payload.courseSlugs, rows: rows.size, mutation: false }));
  } else {
    if (process.env.VERCEL_ENV !== 'production' && !process.argv.includes('--allow-local')) throw new Error('Production release requires VERCEL_ENV=production.');
    const hash = process.env.RELEASE_ADMIN_HASH;
    if (!/^\$2[aby]\$\d\d\$.{53}$/.test(hash || '')) throw new Error('Admin password hash required.');
    await db.$transaction(async tx => {
      const existing = await tx.user.findUnique({ where: { email: expectedEmail }, select: { id: true } });
      const data = { role: 'ADMIN', name: 'Guilherme — Administrador', passwordHash: hash, emailVerifiedAt: new Date(), targetExam: 'ENEM', league: 'Diamante' };
      const admin = await tx.user.upsert({ where: { email: expectedEmail }, create: { email: expectedEmail, ...data }, update: data });
      if (existing) await tx.authSession.deleteMany({ where: { userId: existing.id } });
      await tx.xpAward.upsert({ where: { userId_sourceKey: { userId: admin.id, sourceKey: 'admin-owner:max-rank' } },
        create: { userId: admin.id, sourceKey: 'admin-owner:max-rank', amount: 10000, reason: 'Nível máximo administrativo autorizado pelo proprietário' }, update: { amount: 10000 } });
      const sum = await tx.xpAward.aggregate({ where: { userId: admin.id }, _sum: { amount: true } });
      await tx.user.update({ where: { id: admin.id }, data: { xp: sum._sum.amount || 10000 } });
      if (!process.argv.includes('--admin-only')) {
        for (const row of payload.rows) await importRow(tx, row);
        for (const join of payload.joins.courseModule) {
          const data = { ...join, courseId: mapped.get('Course:' + join.courseId), moduleId: mapped.get('Module:' + join.moduleId) };
          await tx.courseModule.upsert({ where: { courseId_moduleId: { courseId: data.courseId, moduleId: data.moduleId } }, create: data, update: { position: data.position } });
        }
        for (const join of payload.joins.moduleLesson) {
          const data = { ...join, moduleId: mapped.get('Module:' + join.moduleId), lessonId: mapped.get('Lesson:' + join.lessonId) };
          await tx.moduleLesson.upsert({ where: { moduleId_lessonId: { moduleId: data.moduleId, lessonId: data.lessonId } }, create: data, update: { position: data.position } });
        }
        for (const join of payload.joins.courseProduct) {
          const data = { courseId: mapped.get('Course:' + join.courseId), productId: mapped.get('Product:' + join.productId) };
          await tx.courseProduct.upsert({ where: { courseId_productId: data }, create: data, update: {} });
        }
      }
    });
    console.log(JSON.stringify({ admin: expectedEmail, role: 'ADMIN', coursesSynchronized: !process.argv.includes('--admin-only'), rows: applied.size }));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[connection hidden]') : 'Course release failed.');
  process.exitCode = 1;
} finally { await db.$disconnect(); }
