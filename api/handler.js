import pg from 'pg';
import worker from '../backend/worker.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, idleTimeoutMillis: 10000, connectionTimeoutMillis: 5000, ssl: { rejectUnauthorized: false } });

function statement(sql, values = []) {
  let index = 0;
  const query = sql.replace(/\?/g, () => `$${++index}`);
  const execute = async () => pool.query(query, values);
  return {
    bind(...params) { return statement(sql, params); },
    async first() { return (await execute()).rows[0] ?? null; },
    async all() { return { results: (await execute()).rows }; },
    async run() {
      const result = await pool.query(/^\s*insert into users\b/i.test(query) ? `${query} RETURNING id` : query, values);
      return { meta: { last_row_id: result.rows[0]?.id, changes: result.rowCount } };
    }
  };
}
const DB = {
  prepare(sql) { return statement(sql); },
  async batch(statements) { return Promise.all(statements.map(item => item.run())); }
};

export default async function handler(req, res) {
  try {
    if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
      return res.status(503).json({ success: false, message: 'The live service is not configured yet. Try demo mode.' });
    }
    const base = `https://${req.headers.host || 'localhost'}`;
    const url = new URL(req.url, base);
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body ?? {});
    const request = new Request(url, { method: req.method, headers: req.headers, body });
    const response = await worker.fetch(request, { DB, ...process.env });
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.send(await response.text());
  } catch (error) {
    console.error('API error:', error);
    res.status(error.code === '23505' ? 409 : 500).json({ success: false, message: error.code === '23505' ? 'This time slot is already reserved.' : 'The request could not be completed.' });
  }
}
