/**
 * 在 sync({ alter: true }) 前清理重复索引，避免 MySQL「Too many keys; max 64」报错。
 * Sequelize 每次 alter 会对每列执行 CHANGE，可能产生重复索引；本函数每表每列只保留一个索引。
 */
import { Sequelize, QueryTypes } from 'sequelize';

const TABLES = ['users', 'admins', 'verification_codes', 'driver_locations', 'driver_notifications'];

interface IndexRow {
  Key_name: string;
  Column_name: string;
}

export async function cleanDuplicateIndexes(sequelize: Sequelize): Promise<void> {
  for (const table of TABLES) {
    try {
      const raw = await sequelize.query(`SHOW INDEX FROM \`${table}\``, {
        type: QueryTypes.SELECT,
      });
      const rows = (Array.isArray(raw) ? raw : []) as IndexRow[];
      if (rows.length === 0) continue;

      const byColumn = new Map<string, string[]>();
      for (const row of rows) {
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
        await sequelize.query(`DROP INDEX \`${keyName}\` ON \`${table}\``);
      }
    } catch (e) {
      // 表不存在或无权等，忽略
    }
  }
}
