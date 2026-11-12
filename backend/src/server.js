
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { connectSnowflake } from './config/snowflake.js';

import ticketRoutes from './routes/tickets.js';
import reviewRoutes from './routes/reviews.js';
import analyticsRoutes from './routes/analytics.js';
import catalogRoutes from './routes/catalog.js';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000'
}));

app.use(express.json());

app.use('/api/tickets', ticketRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/catalog', catalogRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 5000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

async function start() {
  console.log(`Backend port: ${PORT}`);
  console.log(`Backend URL: http://localhost:${PORT}`);
  console.log(`Allowed frontend origin: ${FRONTEND_ORIGIN}`);

  try {
    await connectSnowflake();

    app.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
    });

  } catch (error) {
    console.error('Snowflake connection failed:', error);
    process.exit(1);
  }
}

start();
