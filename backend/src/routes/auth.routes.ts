import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

// Wrap async functions to handle errors
const wrap = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};


// Public routes (no auth required)
router.post('/auth/register', wrap(authController.register));
router.post('/auth/login', wrap(authController.login));
router.post('/auth/verify', wrap(authController.verifyToken));
router.post('/auth/logout', wrap(authController.logout));
router.post('/auth/debug-password', wrap(authController.debugPassword));

// ✅ Email verification routes (public) - THESE ARE CORRECT
router.post('/auth/send-verification', wrap(authController.sendVerificationEmail));
router.post('/auth/verify-email', wrap(authController.verifyEmail));
router.post('/auth/resend-verification', wrap(authController.resendVerificationCode));
router.get('/auth/check-verified/:email', wrap(authController.checkEmailVerified));

// Password reset routes (public)
router.post('/auth/password-reset', wrap(authController.sendPasswordResetEmail));

// Protected routes (auth required)
router.get('/auth/me', authMiddleware, wrap(authController.getCurrentUser));

// Placeholder routes
router.post('/auth/oauth', wrap(authController.oauthLogin));
router.post('/auth/refresh-token', wrap(authController.refreshToken));

export default router;