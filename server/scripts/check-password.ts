/**
 * 本地查库脚本：看某手机号在 users/drivers 里的密码情况，以及 123456 能否通过校验
 * 用法（在 server 目录下）：npx ts-node scripts/check-password.ts [手机号]
 * 例：npx ts-node scripts/check-password.ts 17710222617
 */
import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../src/config/database';
import '../src/models';
import User from '../src/models/User';
import Driver from '../src/models/Driver';
import bcrypt from 'bcryptjs';

const phone = process.argv[2]?.trim() || '17710222617';

async function main() {
  await sequelize.authenticate();
  console.log('数据库已连接，查询手机号:', phone);
  console.log('');

  const [user, driver] = await Promise.all([
    User.findOne({ where: { phone }, attributes: ['id', 'phone', 'password_hash', 'status'] }),
    Driver.findOne({ where: { phone }, attributes: ['id', 'phone', 'password_hash', 'status'] }),
  ]);

  const testPwd = '123456';

  if (!user && !driver) {
    console.log('❌ 该手机号在 users 和 drivers 表里都不存在');
    process.exit(1);
  }

  if (user) {
    const match = await bcrypt.compare(testPwd, user.password_hash);
    console.log('【用户端 users 表】');
    console.log('  id:', user.id, ' status:', user.status);
    console.log('  密码哈希长度:', user.password_hash?.length, ' 前7位:', user.password_hash?.slice(0, 7));
    console.log('  用 123456 校验:', match ? '✅ 通过' : '❌ 不通过');
    console.log('');
  } else {
    console.log('【用户端】该手机号未在 users 表注册');
    console.log('');
  }

  if (driver) {
    const match = await bcrypt.compare(testPwd, driver.password_hash);
    console.log('【司机端 drivers 表】');
    console.log('  id:', driver.id, ' status:', driver.status);
    console.log('  密码哈希长度:', driver.password_hash?.length, ' 前7位:', driver.password_hash?.slice(0, 7));
    console.log('  用 123456 校验:', match ? '✅ 通过' : '❌ 不通过');
    if (driver.status !== 'approved') {
      console.log('');
      console.log('  ⚠️ 司机状态不是 approved，统一登录会直接报「司机未通过审核」，不会校验密码，但接口目前返回的是「密码错误」。');
    }
    console.log('');
  } else {
    console.log('【司机端】该手机号未在 drivers 表注册');
    console.log('');
  }

  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
