import { Router } from 'express';
import userRoutes from './userRoutes';
import driverRoutes from './driverRoutes';
import passengerRoutes from './passengerRoutes';
import adminRoutes from './adminRoutes';
import verificationCodeRoutes from './verificationCodeRoutes';
import authRoutes from './authRoutes';
import { getRequestLog } from '../middleware/requestLogger';
import User from '../models/User';
import bcrypt from 'bcryptjs';

const router = Router();

// 调试：在浏览器打开此地址可查看最近 API 请求记录，便于排查登录/注册是否到达服务端
router.get('/debug/requests', (_req, res) => {
  res.json({ success: true, data: getRequestLog() });
});

// 临时调试：查看某手机号在 users 中的账号及密码校验情况（仅开发环境，单用户表后仅查 users）
router.get('/debug/password-check', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  const phone = String(req.query.phone || '').trim();
  if (!phone) {
    return res.json({ success: true, data: { error: '请传 phone 参数，如 ?phone=17710222617' } });
  }
  try {
    const user = await User.findOne({ where: { phone }, attributes: ['id', 'phone', 'password_hash', 'status', 'driver_status'] });
    const testPassword = '123456';
    const result: Record<string, unknown> = {
      phone,
      hasUser: !!user,
    };
    if (user) {
      const match = await bcrypt.compare(testPassword, user.password_hash);
      result.user = {
        id: user.id,
        status: user.status,
        driver_status: user.driver_status,
        passwordHashLength: user.password_hash?.length ?? 0,
        passwordHashPreview: user.password_hash ? `${user.password_hash.slice(0, 7)}...(${user.password_hash.length}字)` : null,
        passwordMatches123456: match,
      };
    } else {
      result.message = '该手机号未在 users 表注册';
    }
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || '查询失败' });
  }
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/drivers', driverRoutes);
router.use('/passenger', passengerRoutes);
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

