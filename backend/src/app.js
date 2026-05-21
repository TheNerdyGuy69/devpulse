import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import routes from './routes/index.js';

const app = express();

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'DevPulse API is running' });
});

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
