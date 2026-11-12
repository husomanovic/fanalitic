
import 'dotenv/config';
import snowflake from 'snowflake-sdk';

const connection = snowflake.createConnection({
  account: process.env.SNOWFLAKE_ACCOUNT,
  username: process.env.SNOWFLAKE_USERNAME,
  password: process.env.SNOWFLAKE_PASSWORD,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  database: process.env.SNOWFLAKE_DATABASE,
  schema: process.env.SNOWFLAKE_SCHEMA,
  role: process.env.SNOWFLAKE_ROLE
});

export function connectSnowflake() {
  return new Promise((resolve, reject) => {
    connection.connect((error, conn) => {
      if (error) {
        return reject(error);
      }

      console.log('Connected to Snowflake!');
      resolve(conn);
    });
  });
}

export function query(sqlText, binds = []) {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText,
      binds,
      complete: (error, statement, rows) => {
        if (error) {
          return reject(error);
        }

        resolve(rows || []);
      }
    });
  });
}
