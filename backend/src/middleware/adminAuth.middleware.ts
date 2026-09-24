import type { Request, Response, NextFunction } from 'express';

export const attachAdminContext = (req: Request, res: Response, next: NextFunction) => {
  // Frontend sends admin email in header
  const adminEmail = req.headers['x-admin-email'] as string;
  const adminId = req.headers['x-admin-id'] as string;

  if (adminEmail) {
    (req as any).adminEmail = adminEmail;
  }
  if (adminId) {
    (req as any).adminId = parseInt(adminId, 10) || null;
  }

  next();
};