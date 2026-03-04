import { Router } from 'express';
import driverController from '../controllers/driverController';
import { authenticateToken, requireDriver } from '../middleware/auth';

const router = Router();

// 公开路由
router.post('/register', driverController.register.bind(driverController));
router.post('/login', driverController.login.bind(driverController));

// 需要认证 + 司机身份的路由（同一 token，req.user.id 即 driver_id）
router.get('/profile', authenticateToken, requireDriver, driverController.getProfile.bind(driverController));
router.put('/profile', authenticateToken, requireDriver, driverController.updateProfile.bind(driverController));
router.patch('/availability', authenticateToken, requireDriver, driverController.updateAvailability.bind(driverController));
router.post('/location', authenticateToken, requireDriver, driverController.reportLocation.bind(driverController));
router.post('/verification', authenticateToken, requireDriver, driverController.submitVerification.bind(driverController));
router.get('/me/notifications', authenticateToken, requireDriver, driverController.getNotifications.bind(driverController));
router.put('/me/notifications/read', authenticateToken, requireDriver, driverController.markNotificationsRead.bind(driverController));

export default router;

