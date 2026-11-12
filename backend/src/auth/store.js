import { query } from '../config/snowflake.js';

export function createAuthStore(execute = query) {
  // Standard Snowflake tables do not enforce UNIQUE constraints. Keep account
  // creation serialized per email, and run only one backend writer instance.
  const registrations = new Map();

  async function withEmailLock(email, create) {
    const previous = registrations.get(email) || Promise.resolve();
    let release;
    const current = new Promise(resolve => { release = resolve; });
    registrations.set(email, current);
    await previous;
    try {
      return await create();
    } finally {
      release();
      if (registrations.get(email) === current) registrations.delete(email);
    }
  }

  return {
    async findByEmail(email) {
      const rows = await execute(
        'SELECT ID, EMAIL, NAME, PASSWORD_HASH, ROLE FROM PUBLIC_APP.ADMIN_USERS WHERE EMAIL = ?', [email],
      );
      if (rows.length > 1) throw new Error('Duplicate account records; refusing authentication.');
      return rows[0];
    },
    async createUser(user) {
      return withEmailLock(user.EMAIL, async () => {
        const existing = await execute('SELECT ID FROM PUBLIC_APP.ADMIN_USERS WHERE EMAIL = ?', [user.EMAIL]);
        if (existing.length) {
          throw Object.assign(new Error('Account already exists.'), { sqlState: '23505' });
        }
        await execute(`
          INSERT INTO PUBLIC_APP.ADMIN_USERS (ID, EMAIL, NAME, PASSWORD_HASH, ROLE)
          VALUES (?, ?, ?, ?, 'admin')
        `, [user.ID, user.EMAIL, user.NAME, user.PASSWORD_HASH]);
        return { ...user, ROLE: 'admin' };
      });
    },
    async createSession(id, userId, expiresAt) {
      await execute(`
        INSERT INTO PUBLIC_APP.ADMIN_SESSIONS (ID, USER_ID, EXPIRES_AT)
        VALUES (?, ?, TO_TIMESTAMP_TZ(?))
      `, [id, userId, expiresAt.toISOString()]);
    },
    async findSession(id, userId) {
      const rows = await execute(`
        SELECT U.ID, U.EMAIL, U.NAME, U.ROLE
        FROM PUBLIC_APP.ADMIN_SESSIONS S
        JOIN PUBLIC_APP.ADMIN_USERS U ON U.ID = S.USER_ID
        WHERE S.ID = ? AND S.USER_ID = ? AND S.EXPIRES_AT > CURRENT_TIMESTAMP()
      `, [id, userId]);
      if (rows.length > 1) throw new Error('Duplicate session records; refusing authentication.');
      return rows[0];
    },
    async deleteSession(id) {
      await execute('DELETE FROM PUBLIC_APP.ADMIN_SESSIONS WHERE ID = ?', [id]);
    },
  };
}

export const authStore = createAuthStore();
