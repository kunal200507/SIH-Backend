import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'node:url';
import env from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import projectRoutes from './routes/project.routes.js';
import grievanceRoutes from './routes/grievance.routes.js';
import alertRoutes from './routes/alert.routes.js';
import userRoutes from './routes/user.routes.js';
import errorHandler from './middleware/error.js';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/users', userRoutes);
app.use(errorHandler);

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	app.listen(env.port, () => console.log(`API listening on port ${env.port}`));
}

export default app;