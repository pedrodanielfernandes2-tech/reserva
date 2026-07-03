import { neon } from "@neondatabase/serverless";

let _sql = null;

function getSQL() {
  if (_sql) return _sql;
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    "";
  if (!url) throw new Error("DATABASE_URL não configurada.");
  _sql = neon(url);
  return _sql;
}

export const sql = new Proxy(Object.create(null), {
  apply(_, __, args) {
    return getSQL()(...args);
  },
  get(_, prop) {
    return getSQL()[prop];
  },
});
