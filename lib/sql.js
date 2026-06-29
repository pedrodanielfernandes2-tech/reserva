import { neon } from "@neondatabase/serverless";

let _client = null;

function getClient() {
  if (_client) return _client;

  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    "";

  if (!connectionString) {
    // Isso só deve acontecer em build local sem banco configurado ou se
    // alguém esqueceu de conectar o Neon na Vercel. Lançamos o erro só
    // quando uma query é realmente executada (não na hora de importar o
    // módulo), para não derrubar o build do Next.js.
    throw new Error(
      "Nenhuma variável de conexão com o banco foi encontrada (DATABASE_URL). " +
        "Conecte um banco Neon ao projeto na Vercel (aba Storage) ou rode " +
        "`vercel env pull .env.local` para desenvolvimento local."
    );
  }

  _client = neon(connectionString);
  return _client;
}

// Função tag de template "preguiçosa": só conecta ao banco quando uma
// query é realmente disparada, nunca no momento em que o módulo é importado.
export function sql(strings, ...values) {
  return getClient()(strings, ...values);
}
