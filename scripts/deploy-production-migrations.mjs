import { PrismaClient } from '@prisma/client';
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

// Run explicitly in the deployment build, where existing private credentials are available.
// Refuse databases without a compatible history; never reset or baseline automatically.
const db = new PrismaClient({ log: [] });
const root = new URL('../prisma/migrations/', import.meta.url);
const names = readdirSync(root, { withFileTypes: true })
  .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
const permitted = new Set([
  '20261003223000_teacher_roles',
  '20261003210000_freemium_preparations',
  '20261003193000_user_ban',
  '20260723190000_achievement_catalog_v2',
  '20260808120000_auth_sessions',
  '20260831013000_source_provider_registry',
  '20260911193000_multi_preparation_foundation',
  '20260915001000_course_learning_system',
  '20261001120000_course_lesson_media',
  '20261001140000_launch_commerce_alignment',
  '20261001150000_password_recovery',
  '20261002120000_abacate_checkout',
  '20261002160000_real_learning_profile',
  '20261002180000_email_verification',
  '20261002181000_private_database_api',
]);

try {
  if (process.env.VERCEL_ENV !== 'production') throw new Error('Requires Vercel Production environment.');
  const exists = await db.$queryRaw`SELECT to_regclass('public."_prisma_migrations"') IS NOT NULL AS exists`;
  if (!exists[0]?.exists) throw new Error('No Prisma migration history. Review database baseline before proceeding.');
  const rows = await db.$queryRaw`SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at`;
  const applied = new Set();
  for (const row of rows) {
    if (row.rolled_back_at) continue;
    if (!row.finished_at) throw new Error(`Unfinished migration: ${row.migration_name}`);
    if (!names.includes(row.migration_name)) throw new Error(`Unknown historical migration: ${row.migration_name}`);
    const sql = readFileSync(new URL(`${row.migration_name}/migration.sql`, root));
    // Git may change line endings on Windows; Prisma accepts the equivalent versions.
    const checksums = [sql, Buffer.from(sql.toString().replace(/\r\n/g, '\n')),
      Buffer.from(sql.toString().replace(/\r?\n/g, '\r\n'))]
      .map(value => createHash('sha256').update(value).digest('hex'));
    if (!checksums.includes(row.checksum)) throw new Error(`Historical migration changed: ${row.migration_name}`);
    applied.add(row.migration_name);
  }
  if (!applied.size) throw new Error('Empty migration history. Baseline review required.');
  const pending = names.filter(name => !applied.has(name));
  console.log(`Database history: ${applied.size} applied migration(s).`);
  console.log(`Pending migrations: ${pending.join(', ') || 'none'}`);
  if (pending.some(name => !permitted.has(name))) throw new Error('Pending migration outside reviewed release.');
  await db.$disconnect();
  if (pending.length && process.argv.includes('--apply')) {
    const migrationEnv = { ...process.env };
    if (process.argv.includes('--session-pooler')) {
      const runtime = new URL(process.env.DATABASE_URL);
      const direct = new URL(process.env.DIRECT_URL);
      const projectRef = direct.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/)?.[1];
      if (!projectRef || !runtime.hostname.endsWith('.pooler.supabase.com') ||
        !decodeURIComponent(runtime.username).endsWith(`.${projectRef}`)) {
        throw new Error('Cannot derive a session pooler for the same Supabase project.');
      }
      runtime.port = '5432';
      runtime.searchParams.delete('pgbouncer');
      migrationEnv.DIRECT_URL = runtime.toString();
      console.log('Migrations use the same Supabase project through its IPv4 session pooler.');
    }
    const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
      stdio: 'inherit', env: migrationEnv, timeout: 120_000,
    });
    if (result.error || result.status !== 0) throw new Error('Prisma migration deployment failed. Review build logs.');
  }
  if (pending.length && !process.argv.includes('--apply')) throw new Error('Pending migrations require explicit --apply.');
} catch (error) {
  console.error(error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[connection hidden]') : 'Database migration check failed.');
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
