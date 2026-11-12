import 'dotenv/config';
import snowflake from 'snowflake-sdk';

let connection;

export async function connectSnowflake() {
  const required = ['ACCOUNT', 'USERNAME', 'PASSWORD', 'WAREHOUSE', 'DATABASE', 'SCHEMA', 'ROLE'];
  const missing = required.filter(key => !process.env[`SNOWFLAKE_${key}`]);
  if (missing.length) throw new Error(`Missing Snowflake settings: ${missing.map(key => `SNOWFLAKE_${key}`).join(', ')}`);
  connection = snowflake.createConnection({
    account: process.env.SNOWFLAKE_ACCOUNT,
    username: process.env.SNOWFLAKE_USERNAME,
    password: process.env.SNOWFLAKE_PASSWORD,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
    database: process.env.SNOWFLAKE_DATABASE,
    schema: process.env.SNOWFLAKE_SCHEMA,
    role: process.env.SNOWFLAKE_ROLE,
  });
  return new Promise((resolve, reject) => {
    connection.connect((error, conn) => error ? reject(error) : resolve(conn));
  });
}

export function query(sqlText, binds = []) {
  return new Promise((resolve, reject) => {
    if (!connection) return reject(new Error('Snowflake is not connected.'));
    connection.execute({
      sqlText, binds,
      complete: (error, statement, rows) => error ? reject(error) : resolve(rows || []),
    });
  });
}

export function disconnectSnowflake() {
  return new Promise((resolve, reject) => {
    if (!connection) return resolve();
    connection.destroy(error => error ? reject(error) : resolve());
  });
}
