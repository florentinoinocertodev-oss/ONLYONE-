import { Request, Response, NextFunction } from 'express';
import { SessionService, UserSessionPayload } from './session.service.ts';
import { UnauthorizedError } from '../core/errors.ts';
import { config } from '../core/config.ts';

declare global {
  namespace Express {
    interface Request {
      user?: UserSessionPayload['user'];
      sessionRecord?: UserSessionPayload['session'];
      rawToken?: string;
    }
  }
}

export function extractToken(req: Request): string | null {
  // 1. Verificar primeiro o Cookie HttpOnly
  if (req.cookies && req.cookies[config.session.cookieName]) {
    return req.cookies[config.session.cookieName];
  }

  // 2. Subsidiariamente verificar cabeçalho Authorization: Bearer
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    return next(new UnauthorizedError('Sessão não fornecida. É necessário iniciar sessão.'));
  }

  const payload = SessionService.validateSession(token);
  if (!payload) {
    // Se o token fornecido for inválido, limpa o cookie expirado
    res.clearCookie(config.session.cookieName, { path: '/' });
    return next(new UnauthorizedError('Sessão expirada ou revogada.'));
  }

  req.user = payload.user;
  req.sessionRecord = payload.session;
  req.rawToken = token;
  next();
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    const payload = SessionService.validateSession(token);
    if (payload) {
      req.user = payload.user;
      req.sessionRecord = payload.session;
      req.rawToken = token;
    }
  }
  next();
}
