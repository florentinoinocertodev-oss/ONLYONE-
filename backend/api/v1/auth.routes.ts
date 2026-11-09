import { Router, Request, Response, NextFunction } from 'express';
import { IdentityService } from '../../identity/identity.service.ts';
import { requireAuth } from '../../security/auth.middleware.ts';
import { CsrfManager } from '../../security/csrf.ts';
import { config } from '../../core/config.ts';

const router = Router();

// Emissão / Consulta do Token CSRF
router.get('/csrf', (req: Request, res: Response) => {
  let token = req.cookies?.[config.session.csrfCookieName];
  if (!token) {
    token = CsrfManager.generateToken();
    res.cookie(config.session.csrfCookieName, token, {
      httpOnly: false,
      secure: config.isProd,
      sameSite: 'strict',
      path: '/',
    });
  }
  res.json({ csrfToken: token });
});

// Registo de Conta (com criação atómica de perfil e workspace)
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, displayName } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await IdentityService.register({
      email,
      password,
      displayName,
      ipAddress,
      userAgent,
    });

    // Enviar cookie seguro HttpOnly
    res.cookie(config.session.cookieName, result.rawToken, {
      httpOnly: true,
      secure: config.isProd,
      sameSite: 'strict',
      maxAge: config.session.ttlSeconds * 1000,
      path: '/',
    });

    res.status(201).json({
      user: result.user,
      profile: result.profile,
      workspace: result.workspace,
      token: result.rawToken, // Fornecido também para interoperabilidade com clientes API/testes
    });
  } catch (error) {
    next(error);
  }
});

// Autenticação / Início de Sessão
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await IdentityService.login({
      email,
      password,
      ipAddress,
      userAgent,
    });

    // Enviar cookie seguro HttpOnly
    res.cookie(config.session.cookieName, result.rawToken, {
      httpOnly: true,
      secure: config.isProd,
      sameSite: 'strict',
      maxAge: config.session.ttlSeconds * 1000,
      path: '/',
    });

    res.json({
      user: result.user,
      profile: result.profile,
      workspace: result.workspace,
      token: result.rawToken,
    });
  } catch (error) {
    next(error);
  }
});

// Encerramento de Sessão (Logout)
router.post('/logout', requireAuth, (req: Request, res: Response) => {
  if (req.rawToken) {
    IdentityService.logout(req.rawToken, req.user?.id, req.ip);
  }

  res.clearCookie(config.session.cookieName, { path: '/' });
  res.json({ success: true, message: 'Sessão encerrada com sucesso.' });
});

export default router;
