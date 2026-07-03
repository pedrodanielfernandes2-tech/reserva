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
      observacao TEXT DEFAULT '',
      dia INTEGER NOT NULL,
      mes INTEGER NOT NULL,
      ano INTEGER NOT NULL,
      hora_inicio TEXT NOT NULL,
      hora_fim TEXT NOT NULL,
      recorrente BOOLEAN DEFAULT false,
      recorrencia TEXT DEFAULT 'nenhuma',
      recorrencia_fim TEXT DEFAULT '',
      criado_em TIMESTAMPTZ DEFAULT now()
    );
  `;

  await sql`ALTER TABLE reservas ADD COLUMN IF NOT EXISTS observacao TEXT DEFAULT '';`;
  await sql`ALTER TABLE reservas ADD COLUMN IF NOT EXISTS recorrente BOOLEAN DEFAULT false;`;
  await sql`ALTER TABLE reservas ADD COLUMN IF NOT EXISTS recorrencia TEXT DEFAULT 'nenhuma';`;
  await sql`ALTER TABLE reservas ADD COLUMN IF NOT EXISTS recorrencia_fim TEXT DEFAULT '';`;

  await sql`
    CREATE TABLE IF NOT EXISTS bloqueios (
      id TEXT PRIMARY KEY,
      sala_nome TEXT NOT NULL,
      dia_semana INTEGER NOT NULL,
      hora_inicio TEXT NOT NULL,
      hora_fim TEXT NOT NULL,
      descricao TEXT DEFAULT '',
      criado_em TIMESTAMPTZ DEFAULT now()
    );
  `;

  schemaReady = true;
}
