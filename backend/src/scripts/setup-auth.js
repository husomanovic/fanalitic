import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { connectSnowflake, disconnectSnowflake, query } from '../config/snowflake.js';

try {
  await connectSnowflake();
  const sql = await readFile(new URL('../../sql/auth.sql', import.meta.url), 'utf8');
  for (const statement of sql.replace(/--[^\n]*/g, '').split(';').filter(part => part.trim())) {
    await query(statement);
  }
  console.log('Admin account and session tables are ready.');
} catch (error) {
  console.error('Auth table setup failed:', error.message);
  process.exitCode = 1;
} finally {
  await disconnectSnowflake();
}
