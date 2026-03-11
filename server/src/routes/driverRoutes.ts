import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import driverController from '../controllers/driverController';
import { authenticateToken, requireDriver } from '../middleware/auth';

const router = Router();

// 司机证件图片上传：使用本地磁盘简单存储，路径基于项目根目录的 uploads/drivers/
// 说明：当前实现主要用于开发与早期上线，可根据后续需求替换为对象存储等方案。
const uploadRoot = path.resolve(process.cwd(), 'uploads', 'drivers');

const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    try {
      fs.mkdirSync(uploadRoot, { recursive: true });
    } catch {
      // 目录创建失败时交给后续保存逻辑报错
    }
    cb(null, uploadRoot);
  },
  filename: (req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname || '') || '.jpg';
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({ storage });

// 公开路由
router.post('/register', driverController.register.bind(driverController));
router.post('/login', driverController.login.bind(driverController));

// 需要认证 + 司机身份的路由（同一 token，req.user.id 即 driver_id）
router.get('/profile', authenticateToken, requireDriver, driverController.getProfile.bind(driverController));
router.put('/profile', authenticateToken, requireDriver, driverController.updateProfile.bind(driverController));
router.patch('/availability', authenticateToken, requireDriver, driverController.updateAvailability.bind(driverController));
router.post('/location', authenticateToken, requireDriver, driverController.reportLocation.bind(driverController));
router.post('/verification', authenticateToken, requireDriver, driverController.submitVerification.bind(driverController));
router.post(
  '/upload-image',
  authenticateToken,
  requireDriver,
  // 使用单文件字段 file 接收司机证件图片
  upload.single('file'),
  driverController.uploadImage.bind(driverController)
);
router.get('/me/notifications', authenticateToken, requireDriver, driverController.getNotifications.bind(driverController));
router.put('/me/notifications/read', authenticateToken, requireDriver, driverController.markNotificationsRead.bind(driverController));

export default router;

