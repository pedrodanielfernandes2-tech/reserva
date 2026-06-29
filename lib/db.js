import { sql } from "@/lib/sql";

let schemaReady = false;

/**
 * Garante que as tabelas existem e que há pelo menos as salas padrão
 * cadastradas. É seguro chamar isso em toda requisição: os comandos usam
 * IF NOT EXISTS / verificação de contagem, então não duplicam nada.
 */
export async function ensureSchema() {
  if (schemaReady) return;

  await sql`
    CREATE TABLE IF NOT EXISTS salas (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL,
      cor TEXT NOT NULL,
      criado_em TIMESTAMPTZ DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS reservas (
      id TEXT PRIMARY KEY,
      sala_nome TEXT NOT NULL,
      nome TEXT NOT NULL,
      evento TEXT NOT NULL,
      dia INTEGER NOT NULL,
      mes INTEGER NOT NULL,
      ano INTEGER NOT NULL,
      hora_inicio TEXT NOT NULL,
      hora_fim TEXT NOT NULL,
      criado_em TIMESTAMPTZ DEFAULT now()
    );
  `;

  const contagem = await sql`SELECT COUNT(*)::int AS total FROM salas;`;
  if (contagem[0].total === 0) {
    await sql`
      INSERT INTO salas (id, nome, tipo, cor) VALUES
        ('sala-1', 'Sala 1', 'Sala', 'var(--sala1)'),
        ('sala-2', 'Sala 2', 'Sala', 'var(--sala2)'),
        ('nave', 'Nave', 'Nave', 'var(--nave)');
    `;
  }

  schemaReady = true;
}
