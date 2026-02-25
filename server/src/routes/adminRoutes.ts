import { Router } from 'express';
import adminController from '../controllers/adminController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// 公开路由
router.post('/register', adminController.register.bind(adminController));
router.post('/login', adminController.login.bind(adminController));

// 需要认证的路由
router.get('/profile', authenticateToken, adminController.getProfile.bind(adminController));
router.put('/profile', authenticateToken, adminController.updateProfile.bind(adminController));

// 需要管理员权限的路由
router.get('/all', authenticateToken, authorizeRoles('admin', 'super_admin'), adminController.getAllAdmins.bind(adminController));
router.get('/users', authenticateToken, authorizeRoles('operator', 'admin', 'super_admin'), adminController.getUserList.bind(adminController));
router.get('/stats', authenticateToken, authorizeRoles('operator', 'admin', 'super_admin'), adminController.getStats.bind(adminController));

// 司机审核（管理端网页使用）
router.get(
  '/drivers/pending',
  authenticateToken,
  authorizeRoles('operator', 'admin', 'super_admin'),
  adminController.getPendingDrivers.bind(adminController)
);
router.patch(
  '/drivers/:id/approve',
  authenticateToken,
  authorizeRoles('operator', 'admin', 'super_admin'),
  adminController.approveDriver.bind(adminController)
);
router.patch(
  '/drivers/:id/reject',
  authenticateToken,
  authorizeRoles('operator', 'admin', 'super_admin'),
  adminController.rejectDriver.bind(adminController)
);
router.patch(
  '/drivers/:id/disable',
  authenticateToken,
  authorizeRoles('operator', 'admin', 'super_admin'),
  adminController.disableDriver.bind(adminController)
);

export default router;

