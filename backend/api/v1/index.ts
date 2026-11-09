import { Router } from 'express';
import authRoutes from './auth.routes.ts';
import userRoutes from './user.routes.ts';
import workspaceRoutes from './workspace.routes.ts';
import auditRoutes from './audit.routes.ts';
import healthRoutes from './health.routes.ts';

const v1Router = Router();

v1Router.use('/', healthRoutes);
v1Router.use('/auth', authRoutes);
v1Router.use('/users', userRoutes);
v1Router.use('/workspaces', workspaceRoutes);
v1Router.use('/audit', auditRoutes);

export default v1Router;
