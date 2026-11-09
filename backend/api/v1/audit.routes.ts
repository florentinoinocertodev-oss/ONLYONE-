import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../security/auth.middleware.ts';
import { AuditService } from '../../audit/audit.service.ts';

const router = Router();

// Consultar o próprio histórico de auditoria sanitizado
router.get('/me', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const logs = AuditService.getUserLogs(req.user!.id, Math.min(limit, 100));
    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

export default router;
