import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import corsMiddleware from './middleware/cors';
import requestLogger from './middleware/requestLogger';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import sequelize from './config/database';
import './models'; // 加载全部模型，保证 sync 时建表完整
import { Admin } from './models';
import { cleanDuplicateIndexes } from './utils/cleanDuplicateIndexes';
import bcrypt from 'bcryptjs';
import os from 'os';
import WebSocket from 'ws';
import { verifyToken } from './utils/jwt';
import * as driverWs from './ws/driverWs';
import * as driverNotificationService from './services/driverNotificationService';
import User from './models/User';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// 中间件
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志：每次 API 请求会在终端打印，并可在浏览器访问 /api/debug/requests 查看
app.use('/api', requestLogger);

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

    // 先清理重复索引，避免 sync({ alter: true }) 时触发 MySQL「Too many keys; max 64」
    await cleanDuplicateIndexes(sequelize);

    // 同步数据库模型：开发环境始终同步；生产环境也同步（alter: true 只增列/改列，不删表不删数据）
    await sequelize.sync({ alter: true });
    console.log('✅ 数据库模型同步完成');
    
    if (process.env.NODE_ENV === 'development') {
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

// 启动服务器（HTTP + WebSocket 同端口）
const startServer = async () => {
  await connectDatabase();

  // 将 notification 推送注入到 service，供 contact-driver 使用
  driverNotificationService.setPushToDriver((driverId, payload) =>
    driverWs.sendToDriver(driverId, payload)
  );

  const httpServer = http.createServer(app);
  const wss = new WebSocket.Server({ server: httpServer, path: '/ws/driver' });

  wss.on('connection', (ws, req) => {
    const url = req.url || '';
    const tokenMatch = url.match(/[?&]token=([^&]+)/);
    const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : '';
    if (!token) {
      ws.close(4000, 'missing token');
      return;
    }
    let driverId: number;
    try {
      const decoded = verifyToken(token);
      if (decoded.role !== 'driver' && decoded.role !== 'user') {
        ws.close(4001, 'not driver');
        return;
      }
      driverId = decoded.id;
    } catch {
      ws.close(4002, 'invalid token');
      return;
    }

    void (async () => {
      const user = await User.findByPk(driverId, { attributes: ['id', 'driver_status'] });
      if (!user || user.driver_status == null) {
        ws.close(4003, 'not a driver account');
        return;
      }
      driverWs.registerDriverWs(driverId, ws);
      ws.on('close', () => driverWs.unregisterDriverWs(driverId));

      // 补发未推送通知：一次性发 PENDING_LIST，不逐条弹条幅
      driverNotificationService.getPendingNotifications(driverId).then((list) => {
        if (list.length === 0) return;
        const sent = driverWs.sendToDriver(driverId, { type: 'PENDING_LIST', list });
        if (sent) {
          driverNotificationService.markNotificationsDelivered(list.map((x) => x.id));
        }
      });
    })();
  });

  const host = '0.0.0.0';
  httpServer.listen(PORT, host, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log(`🔌 司机 WebSocket: ws://localhost:${PORT}/ws/driver?token=...`);
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets || {})) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`📱 手机/局域网访问: http://${net.address}:${PORT}/api`);
          break;
        }
      }
    }
    console.log(`📝 健康检查: http://localhost:${PORT}/api/health`);
    console.log(`📋 请求日志(调试): http://localhost:${PORT}/api/debug/requests`);
  });
};

startServer().catch((error) => {
  console.error('❌ 服务器启动失败:', error);
  process.exit(1);
});

export default app;

