import { Router } from 'express';
import authController from '../controllers/authController';

const router = Router();

router.post('/login', authController.login.bind(authController));
router.post('/reset-password', authController.resetPassword.bind(authController));
router.post('/wechat-login', authController.wechatLogin.bind(authController));

export default router;
