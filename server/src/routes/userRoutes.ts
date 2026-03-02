import { Router } from 'express';
import userController from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 公开路由
router.post('/register', userController.register.bind(userController));
router.post('/login', userController.login.bind(userController));
router.get('/nearby-drivers', userController.nearbyDrivers.bind(userController));

// 需要认证的路由
router.get('/profile', authenticateToken, userController.getProfile.bind(userController));
router.put('/profile', authenticateToken, userController.updateProfile.bind(userController));
router.put('/me/last-location', authenticateToken, userController.updateLastLocation.bind(userController));

export default router;

