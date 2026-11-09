import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../core/config.ts';
import { ForbiddenError } from '../core/errors.ts';
import { AuditService } from '../audit/audit.service.ts';

export class CsrfManager {
  public static generateToken(): string {
    return crypto.randomBytes(24).toString('hex');
  }

  public static middleware(req: Request, res: Response, next: NextFunction): void {
    // 1. Assegurar que o cookie CSRF está presente na resposta
    let currentCsrf = req.cookies?.[config.session.csrfCookieName];
    if (!currentCsrf) {
      currentCsrf = CsrfManager.generateToken();
      res.cookie(config.session.csrfCookieName, currentCsrf, {
        httpOnly: false, // O JavaScript no cliente precisa ler o token para enviá-lo no cabeçalho customizado
        secure: config.isProd,
        sameSite: 'strict',
        path: '/',
      });
    }

    // 2. Métodos de leitura são seguros
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
      return next();
    }

    // 3. Se for uma requisição mutadora autenticada puramente por Bearer Header (ex.: script de testes),
    // onde cookies de sessão do browser não estão presentes, o risco de CSRF é mitigado pela ausência de cookies ambientais.
    const hasSessionCookie = Boolean(req.cookies?.[config.session.cookieName]);
    const bearerHeader = req.headers['authorization'];
    if (!hasSessionCookie && bearerHeader && bearerHeader.startsWith('Bearer ')) {
      return next();
    }

    // 4. Para requisições do navegador ou com sessão baseada em cookie, o cabeçalho X-OnlyOne-CSRF é OBRIGATÓRIO
    const clientCsrfToken = req.headers[config.session.csrfHeaderName] as string | undefined;

    if (!clientCsrfToken || !currentCsrf || clientCsrfToken !== currentCsrf) {
      AuditService.log({
        action: 'SECURITY_CSRF_REJECT',
        resourceType: 'request',
        status: 'failure',
        ipAddress: req.ip,
        details: { path: req.path, method: req.method },
      });

      return next(new ForbiddenError('Validação CSRF falhou: Cabeçalho X-OnlyOne-CSRF ausente ou inválido.'));
    }

    next();
  }
}
