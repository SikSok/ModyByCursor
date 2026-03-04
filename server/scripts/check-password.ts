/**
 * 本地查库脚本：看某手机号在 users 里的密码及司机身份情况（单用户表后仅查 users）
 * 用法（在 server 目录下）：npx ts-node scripts/check-password.ts [手机号]
 * 例：npx ts-node scripts/check-password.ts 17710222617
 */
import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../src/config/database';
import '../src/models';
import User from '../src/models/User';
import bcrypt from 'bcryptjs';

const phone = process.argv[2]?.trim() || '17710222617';

async function main() {
  await sequelize.authenticate();
  console.log('数据库已连接，查询手机号:', phone);
  console.log('');

  const user = await User.findOne({
    where: { phone },
    attributes: ['id', 'phone', 'password_hash', 'status', 'driver_status'],
  });

  const testPwd = '123456';

  if (!user) {
    console.log('❌ 该手机号在 users 表中不存在');
    process.exit(1);
  }

  const match = await bcrypt.compare(testPwd, user.password_hash);
  console.log('【users 表】');
  console.log('  id:', user.id, ' status:', user.status, ' driver_status:', user.driver_status ?? '(未申请司机)');
  console.log('  密码哈希长度:', user.password_hash?.length, ' 前7位:', user.password_hash?.slice(0, 7));
  console.log('  用 123456 校验:', match ? '✅ 通过' : '❌ 不通过');
  console.log('');

  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
