import { sql } from "@/lib/sql";

let schemaReady = false;

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

  await sql`
    INSERT INTO salas (id, nome, tipo, cor) VALUES
      ('sala-1', 'Sala 1', 'Sala', '#3F7FEA'),
      ('sala-2', 'Sala 2', 'Sala', '#46A35C'),
      ('nave', 'Nave', 'Nave', '#E08C2B')
    ON CONFLICT (id) DO NOTHING;
  `;

  schemaReady = true;
}
