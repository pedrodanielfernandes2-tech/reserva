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
  await sql`ALTER TABLE reservas ADD COLUMN IF NOT EXISTS precisa_som BOOLEAN DEFAULT false;`;
  await sql`ALTER TABLE reservas ADD COLUMN IF NOT EXISTS precisa_projecao BOOLEAN DEFAULT false;`;

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

  await sql`
    CREATE TABLE IF NOT EXISTS configuracoes (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL,
      atualizado_em TIMESTAMPTZ DEFAULT now()
    );
  `;

  await sql`
    INSERT INTO configuracoes (chave, valor) VALUES
      ('email_from',     'onboarding@resend.dev'),
      ('email_admin',    ''),
      ('limite_dias',    '60'),
      ('email_mensagem', 'Este é um aviso automático do Sistema de Reservas da Assembleia de Deus Louveira.')
    ON CONFLICT (chave) DO NOTHING;
  `;

  schemaReady = true;
}

export async function getConfig() {
  const rows = await sql`SELECT chave, valor FROM configuracoes;`;
  const config = {};
  for (const r of rows) config[r.chave] = r.valor;
  return config;
}
