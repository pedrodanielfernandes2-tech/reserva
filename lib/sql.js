import { neon } from "@neondatabase/serverless";

let _client = null;

function getClient() {
  if (_client) return _client;
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    "";
  if (!url) throw new Error("DATABASE_URL não configurada.");
  _client = neon(url);
  return _client;
}

export function sql(strings, ...values) {
  return getClient()(strings, ...values);
}
