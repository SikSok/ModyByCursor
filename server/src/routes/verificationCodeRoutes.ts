import { Router } from 'express';
import verificationCodeController from '../controllers/verificationCodeController';

const router = Router();

router.post('/send', verificationCodeController.send.bind(verificationCodeController));

export default router;

