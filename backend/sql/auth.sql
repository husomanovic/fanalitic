-- Run in the database configured by SNOWFLAKE_DATABASE, using a role allowed to
-- create tables. Standard tables also work on Snowflake trial accounts.
-- UNIQUE/foreign keys are informational here. Registration is serialized in the
-- backend; use a single backend writer instance for this table setup.
-- These names intentionally avoid overwriting any existing PUBLIC_APP.USERS table.
CREATE SCHEMA IF NOT EXISTS PUBLIC_APP;

CREATE TABLE IF NOT EXISTS PUBLIC_APP.ADMIN_USERS (
  ID VARCHAR(36) NOT NULL PRIMARY KEY,
  EMAIL VARCHAR(254) NOT NULL UNIQUE,
  NAME VARCHAR(100) NOT NULL,
  PASSWORD_HASH VARCHAR(60) NOT NULL,
  ROLE VARCHAR(20) NOT NULL DEFAULT 'admin',
  CREATED_AT TIMESTAMP_TZ NOT NULL DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS PUBLIC_APP.ADMIN_SESSIONS (
  ID VARCHAR(36) NOT NULL PRIMARY KEY,
  USER_ID VARCHAR(36) NOT NULL REFERENCES PUBLIC_APP.ADMIN_USERS(ID),
  EXPIRES_AT TIMESTAMP_TZ NOT NULL,
  CREATED_AT TIMESTAMP_TZ NOT NULL DEFAULT CURRENT_TIMESTAMP()
);
