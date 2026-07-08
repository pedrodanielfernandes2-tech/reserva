import { NextResponse } from "next/server";
import { sql } from "@/lib/sql";
import { ensureSchema } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";

export async function GET() {
  await ensureSchema();
  const rows = await sql`SELECT chave, valor FROM configuracoes ORDER BY chave;`;
  const config = {};
  for (const r of rows) config[r.chave] = r.valor;
  return NextResponse.json(config);
}

export async function POST(request) {
  await ensureSchema();

  if (!isAdminRequest()) {
    return NextResponse.json({ erro: "Apenas administradores podem alterar configurações." }, { status: 401 });
  }

  const body = await request.json();
  const chaves = ["email_from", "email_admin", "limite_dias", "email_mensagem"];

  for (const chave of chaves) {
    if (body[chave] !== undefined) {
      await sql`
        INSERT INTO configuracoes (chave, valor, atualizado_em)
        VALUES (${chave}, ${String(body[chave])}, now())
        ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = now();
      `;
    }
  }

  return NextResponse.json({ ok: true });
}
