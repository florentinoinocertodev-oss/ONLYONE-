import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../security/auth.middleware.ts';
import { WorkspaceService } from '../../workspaces/workspaces.service.ts';

const router = Router();

// Consultar workspace pessoal do utilizador autenticado
router.get('/me', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspace = WorkspaceService.getPersonalWorkspace(req.user!.id);
    res.json(workspace);
  } catch (error) {
    next(error);
  }
});

// Consultar workspace por ID (com verificação estrita de membership)
router.get('/:id', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspace = WorkspaceService.getWorkspaceById(req.params.id, req.user!.id);
    res.json(workspace);
  } catch (error) {
    next(error);
  }
});

// Atualizar nome do workspace
router.patch('/:id', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    const updated = WorkspaceService.updateWorkspace(req.params.id, req.user!.id, name);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export default router;
