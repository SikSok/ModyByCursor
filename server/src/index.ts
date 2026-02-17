import express from 'express';
import dotenv from 'dotenv';
import corsMiddleware from './middleware/cors';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import sequelize from './config/database';
import './models'; // 加载全部模型，保证 sync 时建表完整
import { Admin } from './models';
import bcrypt from 'bcryptjs';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use('/api', routes);

// 错误处理
app.use(notFoundHandler);
app.use(errorHandler);

// 数据库连接测试
const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    const dialect = (sequelize.getDialect && sequelize.getDialect()) || 'database';
    console.log(`✅ 数据库连接成功 (${dialect})`);
    
    // 同步数据库模型（开发环境）
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ 数据库模型同步完成');
      // 无管理员时创建默认管理员，便于本地登录
      const adminCount = await Admin.count();
      if (adminCount === 0) {
        const passwordHash = await bcrypt.hash('123456', 10);
        await Admin.create({
          username: 'admin',
          password_hash: passwordHash,
          role: 'super_admin',
          status: 'active'
        });
        console.log('✅ 已创建默认管理员: 用户名 admin, 密码 123456');
      }
    }
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
};

// 启动服务器
const startServer = async () => {
  await connectDatabase();
  
  app.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log(`📝 API 文档: http://localhost:${PORT}/api/health`);
  });
};

startServer().catch((error) => {
  console.error('❌ 服务器启动失败:', error);
  process.exit(1);
});

export default app;

