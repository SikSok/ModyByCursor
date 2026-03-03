/**
 * 修复「Too many keys specified; max 64 keys allowed」
 * 清理 users、drivers、admins、verification_codes 表的重复索引。
 * 在 server 目录执行：npm run fix-indexes
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as mysql from 'mysql2/promise';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mody_db',
};

interface IndexRow {
  Key_name: string;
  Column_name: string;
}

async function cleanTableIndexes(
  conn: mysql.Connection,
  table: string
): Promise<number> {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    `SHOW INDEX FROM \`${table}\``
  );
  const indexes = rows as IndexRow[];

  if (indexes.length === 0) return 0;

  const byColumn = new Map<string, string[]>();
  for (const row of indexes) {
    if (row.Key_name === 'PRIMARY') continue;
    const list = byColumn.get(row.Column_name) || [];
    if (!list.includes(row.Key_name)) list.push(row.Key_name);
    byColumn.set(row.Column_name, list);
  }

  const toDrop: string[] = [];
  byColumn.forEach((keyNames, columnName) => {
    if (keyNames.length <= 1) return;
    const kept = keyNames.find((k) => k === columnName) || keyNames[0];
    keyNames.forEach((k) => {
      if (k !== kept) toDrop.push(k);
    });
  });

  const uniqueDrop = [...new Set(toDrop)];
  for (const keyName of uniqueDrop) {
    await conn.query(`DROP INDEX \`${keyName}\` ON \`${table}\``);
    console.log(`  [${table}] 已删除索引: ${keyName}`);
  }
  return uniqueDrop.length;
}

async function main() {
  console.log('连接数据库:', config.host + ':' + config.port + '/' + config.database);
  const conn = await mysql.createConnection(config);

  const tables = ['users', 'drivers', 'admins', 'verification_codes'];
  try {
    let total = 0;
    for (const table of tables) {
      console.log('\n检查表:', table);
      const n = await cleanTableIndexes(conn, table);
      total += n;
      if (n === 0) console.log('  无重复索引');
    }
    console.log('\n' + (total > 0 ? '清理完成，请重新执行 npm run dev' : '所有表均无重复索引'));
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
