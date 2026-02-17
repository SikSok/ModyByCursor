import { Router } from 'express';
import userRoutes from './userRoutes';
import driverRoutes from './driverRoutes';
import adminRoutes from './adminRoutes';
import verificationCodeRoutes from './verificationCodeRoutes';

const router = Router();

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

