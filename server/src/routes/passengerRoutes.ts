import { Router } from 'express';
import passengerController from '../controllers/passengerController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

router.post(
  '/contact-driver',
  authenticateToken,
  authorizeRoles('user', 'driver'),
  passengerController.contactDriver.bind(passengerController)
);

export default router;
