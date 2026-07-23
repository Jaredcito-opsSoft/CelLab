import { sql } from 'drizzle-orm';
import { db, queryClient } from '../db/client.js';

const [version, tables, grants] = await Promise.all([
  db.execute(sql`select current_setting('server_version') as version`),
  db.execute(sql`select relname as table_name, relrowsecurity as rls_enabled from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' order by relname`),
  db.execute(sql`select table_name, grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and grantee in ('anon', 'authenticated') order by table_name, grantee, privilege_type`),
]);
console.log(JSON.stringify({
  postgresVersion: version[0]?.version,
  tableCount: tables.length,
  rlsDisabledTables: [...tables].filter((row) => !row.rls_enabled).map((row) => row.table_name),
  dataApiGrantCount: grants.length,
  dataApiGrantedTables: [...new Set([...grants].map((row) => row.table_name))],
}, null, 2));
await queryClient.end({ timeout: 5 });
