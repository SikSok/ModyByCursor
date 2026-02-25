import { Router } from 'express';
import userRoutes from './userRoutes';
import driverRoutes from './driverRoutes';
import adminRoutes from './adminRoutes';
import verificationCodeRoutes from './verificationCodeRoutes';
import authRoutes from './authRoutes';
import { getRequestLog } from '../middleware/requestLogger';
import User from '../models/User';
import Driver from '../models/Driver';
import bcrypt from 'bcryptjs';

const router = Router();

// 调试：在浏览器打开此地址可查看最近 API 请求记录，便于排查登录/注册是否到达服务端
router.get('/debug/requests', (_req, res) => {
  res.json({ success: true, data: getRequestLog() });
});

// 临时调试：查看某手机号在库中的账号及密码校验情况（仅开发环境）
router.get('/debug/password-check', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  const phone = String(req.query.phone || '').trim();
  if (!phone) {
    return res.json({ success: true, data: { error: '请传 phone 参数，如 ?phone=17710222617' } });
  }
  try {
    const [user, driver] = await Promise.all([
      User.findOne({ where: { phone }, attributes: ['id', 'phone', 'password_hash', 'status'] }),
      Driver.findOne({ where: { phone }, attributes: ['id', 'phone', 'password_hash', 'status'] }),
    ]);
    const testPassword = '123456';
    const result: Record<string, unknown> = {
      phone,
      hasUser: !!user,
      hasDriver: !!driver,
    };
    if (user) {
      const match = await bcrypt.compare(testPassword, user.password_hash);
      result.user = {
        id: user.id,
        status: user.status,
        passwordHashLength: user.password_hash?.length ?? 0,
        passwordHashPreview: user.password_hash ? `${user.password_hash.slice(0, 7)}...(${user.password_hash.length}字)` : null,
        passwordMatches123456: match,
      };
    }
    if (driver) {
      const match = await bcrypt.compare(testPassword, driver.password_hash);
      result.driver = {
        id: driver.id,
        status: driver.status,
        passwordHashLength: driver.password_hash?.length ?? 0,
        passwordHashPreview: driver.password_hash ? `${driver.password_hash.slice(0, 7)}...(${driver.password_hash.length}字)` : null,
        passwordMatches123456: match,
      };
    }
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || '查询失败' });
  }
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/drivers', driverRoutes);
router.use('/admins', adminRoutes);
router.use('/verification-codes', verificationCodeRoutes);

// 健康检查
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '服务运行正常',
    timestamp: new Date().toISOString()
  });
});

export default router;

