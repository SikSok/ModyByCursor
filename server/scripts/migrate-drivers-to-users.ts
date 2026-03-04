/**
 * 单用户表重构：将 drivers 数据合并入 users，并更新 driver_locations、driver_notifications 的 driver_id。
 * 执行前请先：1）部署含 User 司机字段的代码并执行 sync；2）备份数据库。
 * 用法（在 server 目录下）：npx ts-node scripts/migrate-drivers-to-users.ts
 * 本脚本不依赖 Driver 模型，使用原始 SQL 读取 drivers 表（可在删除 Driver 模型后执行）。
 */
import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../src/config/database';
import '../src/models';
import User from '../src/models/User';
import DriverLocation from '../src/models/DriverLocation';
import DriverNotification from '../src/models/DriverNotification';
import { Op, QueryTypes } from 'sequelize';

const DRIVERS_TABLE = 'drivers';

interface DriverRow {
  id: number;
  phone: string;
  password_hash: string;
  name: string | null;
  avatar: string | null;
  id_card: string | null;
  id_card_front: string | null;
  id_card_back: string | null;
  license_plate: string | null;
  license_plate_photo: string | null;
  vehicle_type: string | null;
  status: 'pending' | 'approved' | 'rejected';
  is_available: boolean;
  last_location_id: number | null;
  created_at: Date;
  updated_at: Date;
}

async function main() {
  console.log('========== 迁移开始 ==========');
  console.log('请确认已备份数据库且 users 表已包含司机字段。');
  await sequelize.authenticate();

  const t = await sequelize.transaction();
  try {
    const dbName = process.env.DB_NAME || 'mody_db';
    const tablesExist = await sequelize.query<{ n: number }>(
      `SELECT COUNT(*) as n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      { type: QueryTypes.SELECT, replacements: [dbName, DRIVERS_TABLE], transaction: t }
    );
    const driversTableExists = (tablesExist[0]?.n ?? 0) > 0;
    if (!driversTableExists) {
      await t.commit();
      console.log('drivers 表不存在，无需迁移。');
      await sequelize.close();
      return;
    }

    const fkRows = await sequelize.query<{ CONSTRAINT_NAME: string; TABLE_NAME: string }>(
      `SELECT CONSTRAINT_NAME, TABLE_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS 
       WHERE constraint_schema = ? AND REFERENCED_TABLE_NAME = ?`,
      { type: QueryTypes.SELECT, replacements: [dbName, DRIVERS_TABLE], transaction: t }
    );
    for (const row of fkRows ?? []) {
      await sequelize.query(
        `ALTER TABLE \`${row.TABLE_NAME}\` DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``,
        { transaction: t }
      );
      console.log(`已删除外键: ${row.TABLE_NAME}.${row.CONSTRAINT_NAME}`);
    }

    const driverRows = await sequelize.query<DriverRow>(
      `SELECT * FROM \`${DRIVERS_TABLE}\` ORDER BY id ASC`,
      { type: QueryTypes.SELECT, transaction: t }
    );
    const drivers = Array.isArray(driverRows) ? driverRows : [];
    const driverCount = drivers.length;
    console.log(`drivers 表行数: ${driverCount}`);

    const oldToNewId = new Map<number, number>();

    for (const d of drivers) {
      const phone = String(d.phone || '').trim();
      let user = await User.findOne({ where: { phone }, transaction: t });
      const driverFields = {
        driver_status: d.status,
        is_available: d.is_available,
        id_card: d.id_card ?? null,
        id_card_front: d.id_card_front ?? null,
        id_card_back: d.id_card_back ?? null,
        license_plate: d.license_plate ?? null,
        license_plate_photo: d.license_plate_photo ?? null,
        vehicle_type: d.vehicle_type ?? null,
        last_location_id: d.last_location_id ?? null,
      };
      if (user) {
        await user.update(driverFields, { transaction: t });
        oldToNewId.set(d.id, user.id);
      } else {
        const newUser = await User.create(
          {
            phone,
            password_hash: d.password_hash,
            name: d.name ?? undefined,
            avatar: d.avatar ?? undefined,
            status: 1,
            ...driverFields,
          },
          { transaction: t }
        );
        oldToNewId.set(d.id, newUser.id);
      }
    }

    if (oldToNewId.size !== driverCount) {
      throw new Error(`映射条数 ${oldToNewId.size} !== drivers 行数 ${driverCount}`);
    }

    for (const [oldId, newId] of oldToNewId) {
      await DriverLocation.update(
        { driver_id: newId },
        { where: { driver_id: oldId }, transaction: t }
      );
      await DriverNotification.update(
        { driver_id: newId },
        { where: { driver_id: oldId }, transaction: t }
      );
    }

    const locRows = await DriverLocation.findAll({
      attributes: ['driver_id'],
      transaction: t,
    });
    const notifRows = await DriverNotification.findAll({
      attributes: ['driver_id'],
      transaction: t,
    });
    const allReferencedIds = [
      ...new Set([
        ...locRows.map((r) => r.driver_id),
        ...notifRows.map((r) => r.driver_id),
      ]),
    ];
    const userIdsWithDriver = new Set(
      (
        await User.findAll({
          where: { driver_status: { [Op.ne]: null } },
          attributes: ['id'],
          transaction: t,
        })
      ).map((u) => u.id)
    );
    for (const id of allReferencedIds) {
      if (!userIdsWithDriver.has(id)) {
        throw new Error(`driver_id ${id} 在 users 中不存在或 driver_status 为 NULL`);
      }
    }

    await sequelize.query(`DROP TABLE IF EXISTS \`${DRIVERS_TABLE}\``, {
      transaction: t,
    });
    await t.commit();
    console.log(
      '========== 迁移完成：drivers 已合并入 users，关联表已更新，drivers 表已删除 =========='
    );
  } catch (e) {
    await t.rollback();
    console.error('迁移失败并已回滚:', e);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
