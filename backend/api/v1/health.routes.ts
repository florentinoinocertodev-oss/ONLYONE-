import { Router, Request, Response } from 'express';
import { getDatabase } from '../../database/connection.ts';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  try {
    // Verificação de integridade mínima da base de dados sem expor detalhes
    const db = getDatabase();
    db.prepare('SELECT 1').get();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
