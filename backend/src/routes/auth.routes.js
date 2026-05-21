import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  loginSchema,
  registerSchema,
  validate,
} from '../middleware/validate.middleware.js';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authenticate, authController.logout);

export default router;
