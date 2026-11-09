import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../security/auth.middleware.ts';
import { ProfileService } from '../../profiles/profiles.service.ts';

const router = Router();

// Consultar perfil do utilizador autenticado
router.get('/me', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = ProfileService.getProfile(req.user!.id);
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

// Atualizar informações do perfil
router.patch('/me', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { displayName, locale, timezone, bio } = req.body;
    const updated = ProfileService.updateProfile(
      req.user!.id,
      { displayName, locale, timezone, bio },
      req.ip
    );
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export default router;
