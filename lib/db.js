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
  await sql`ALTER TABLE reservas ADD COLUMN IF NOT EXISTS precisa_fotografia BOOLEAN DEFAULT false;`;
  await sql`ALTER TABLE reservas ADD COLUMN IF NOT EXISTS precisa_transmissao BOOLEAN DEFAULT false;`;
  await sql`ALTER TABLE reservas ADD COLUMN IF NOT EXISTS tipo_evento TEXT DEFAULT 'regular';`;
  await sql`ALTER TABLE reservas ADD COLUMN IF NOT EXISTS qtd_mesas INTEGER DEFAULT 0;`;
  await sql`ALTER TABLE reservas ADD COLUMN IF NOT EXISTS qtd_cadeiras INTEGER DEFAULT 0;`;

  await sql`
    CREATE TABLE IF NOT EXISTS contatos_notificacao (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL,
      recebe_todas BOOLEAN DEFAULT true,
      recebe_som BOOLEAN DEFAULT false,
      recebe_projecao BOOLEAN DEFAULT false,
      recebe_fotografia BOOLEAN DEFAULT false,
      recebe_mesa_cadeira BOOLEAN DEFAULT false,
      criado_em TIMESTAMPTZ DEFAULT now()
    );
  `;

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
      ('email_from',          'onboarding@resend.dev'),
      ('email_admin',         ''),
      ('limite_dias',         '60'),
      ('antecedencia_horas',  '0'),
      ('email_mensagem', 'Este é um aviso automático do Sistema de Reservas da Assembleia de Deus Louveira.')
    ON CONFLICT (chave) DO NOTHING;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS eventos_igreja (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL,
      congregacao TEXT DEFAULT '',
      dia INTEGER NOT NULL,
      mes INTEGER NOT NULL,
      ano INTEGER NOT NULL,
      hora_inicio TEXT DEFAULT '17:00',
      hora_fim TEXT DEFAULT '22:00',
      criado_em TIMESTAMPTZ DEFAULT now()
    );
  `;

  schemaReady = true;
}

export async function getConfig() {
  const rows = await sql`SELECT chave, valor FROM configuracoes;`;
  const c = {};
  for (const r of rows) c[r.chave] = r.valor;
  return c;
}
