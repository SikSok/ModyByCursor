import { Router } from 'express';
import driverController from '../controllers/driverController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 公开路由
router.post('/register', driverController.register.bind(driverController));
router.post('/login', driverController.login.bind(driverController));

// 需要认证的路由
router.get('/profile', authenticateToken, driverController.getProfile.bind(driverController));
router.put('/profile', authenticateToken, driverController.updateProfile.bind(driverController));
router.patch('/availability', authenticateToken, driverController.updateAvailability.bind(driverController));
router.post('/location', authenticateToken, driverController.reportLocation.bind(driverController));
router.post('/verification', authenticateToken, driverController.submitVerification.bind(driverController));

export default router;

