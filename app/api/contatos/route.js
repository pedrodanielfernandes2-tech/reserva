import { NextResponse } from "next/server";
import { sql } from "@/lib/sql";
import { ensureSchema } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import crypto from "crypto";

export async function GET() {
  await ensureSchema();
  const rows = await sql`SELECT * FROM contatos_notificacao ORDER BY criado_em ASC;`;
  return NextResponse.json(rows);
}

export async function POST(request) {
  await ensureSchema();
  if (!isAdminRequest()) return NextResponse.json({ erro: "Apenas administradores." }, { status: 401 });

  const body = await request.json();
  const { nome, email, recebe_todas, recebe_som, recebe_projecao, recebe_fotografia, recebe_mesa_cadeira } = body;

  if (!nome?.trim() || !email?.trim()) {
    return NextResponse.json({ erro: "Nome e e-mail são obrigatórios." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const rows = await sql`
    INSERT INTO contatos_notificacao (id, nome, email, recebe_todas, recebe_som, recebe_projecao, recebe_fotografia, recebe_mesa_cadeira)
    VALUES (${id}, ${nome.trim()}, ${email.trim()},
      ${Boolean(recebe_todas)}, ${Boolean(recebe_som)}, ${Boolean(recebe_projecao)},
      ${Boolean(recebe_fotografia)}, ${Boolean(recebe_mesa_cadeira)})
    RETURNING *;
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
