import 'dotenv/config';
import { connectSnowflake } from './config/snowflake.js';
import { createApp } from './app.js';

async function start() {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error('Set JWT_SECRET to a random secret of at least 32 bytes in backend/.env.');
  const origin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
  const port = Number(process.env.PORT || 5000);
  await connectSnowflake();
  const app = createApp({ secret, origin, production: process.env.NODE_ENV === 'production' });
  app.listen(port, () => console.log(`API listening on port ${port}`));
}

start().catch(error => {
  console.error('API startup failed:', error.message);
  process.exitCode = 1;
});
