import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import env from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import projectRoutes from './routes/project.routes.js';
import grievanceRoutes from './routes/grievance.routes.js';
import alertRoutes from './routes/alert.routes.js';
import userRoutes from './routes/user.routes.js';
import errorHandler from './middleware/error.js';
import prisma from './config/db.js';

const app = express();
app.use(cors({ origin: process.env.Client_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.get('/health', async (req, res) => {
	const checks = {
		database: 'ok',
		migrations: existsSync(new URL('../../prisma/migrations', import.meta.url)) ? 'present' : 'missing',
	};

	try {
		await prisma.$queryRaw`SELECT 1`;
	} catch (error) {
		console.error('Health check database failure:', error);
		checks.database = 'failed';
	}

	const healthy = checks.database === 'ok' && checks.migrations === 'present';
	res.status(healthy ? 200 : 503).json({
		status: healthy ? 'ok' : 'degraded',
		checks,
	});
});
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