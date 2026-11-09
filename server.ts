import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './backend/core/config.ts';
import { AppError } from './backend/core/errors.ts';
import { runMigrations } from './backend/database/migrator.ts';
import { CsrfManager } from './backend/security/csrf.ts';
import v1Router from './backend/api/v1/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // 1. Executar migrações da base de dados de forma garantida antes de receber requisições
  try {
    const applied = runMigrations();
    if (applied.length > 0) {
      console.log(`[OnlyOne Migrations] Migrações aplicadas com sucesso: ${applied.join(', ')}`);
    } else {
      console.log('[OnlyOne Migrations] Base de dados sincronizada com o esquema da Fase 0.');
    }
  } catch (err) {
    console.error('[OnlyOne Migrations] Falha crítica ao aplicar migrações:', err);
    process.exit(1);
  }

  const app = express();

  // Configuração para proxies reversos e HTTPS
  app.set('trust proxy', 1);

  // Middlewares essenciais
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Proteção CSRF global para chamadas de mutação
  app.use(CsrfManager.middleware);

  // Montagem do Roteador API v1
  app.use('/api/v1', v1Router);

  // Separação Estrita de Ambientes (Desenvolvimento vs Produção)
  if (config.isProd) {
    console.log('[OnlyOne Runtime] Modo Produção: Servindo assets estáticos pré-compilados de /dist');
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath, { maxAge: '1y', immutable: true }));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    } else {
      console.warn('[OnlyOne Runtime] Diretório dist/ não encontrado. Execute npm run build antes de iniciar em produção.');
    }
  } else {
    console.log('[OnlyOne Runtime] Modo Desenvolvimento: Integrando Vite Dev Server via vite.middlewares');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Middleware de Tratamento Central de Erros
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      });
      return;
    }

    // Tratamento de erros inesperados sem vazamento de stack trace
    console.error('[OnlyOne Unhandled Error]', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Ocorreu um erro interno no servidor.',
      },
    });
  });

  const port = config.port;
  app.listen(port, '0.0.0.0', () => {
    console.log(`[OnlyOne] Servidor unificado ativo na porta ${port} (Ambiente: ${config.env})`);
  });
}

startServer().catch(err => {
  console.error('[OnlyOne] Falha catastrófica ao inicializar servidor:', err);
  process.exit(1);
});
