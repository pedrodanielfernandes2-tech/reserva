import { NextResponse } from "next/server";
import { sql } from "@/lib/sql";
import { ensureSchema } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import crypto from "crypto";

export async function GET() {
  await ensureSchema();
  const rows = await sql`SELECT * FROM eventos_igreja ORDER BY ano, mes, dia;`;
  return NextResponse.json(rows);
}

export async function POST(request) {
  await ensureSchema();
  if (!isAdminRequest()) return NextResponse.json({ erro: "Apenas administradores." }, { status: 401 });

  const body = await request.json();
  const eventos = Array.isArray(body) ? body : [body];
  const criados = [];

  for (const ev of eventos) {
    const id = crypto.randomUUID();
    const rows = await sql`
      INSERT INTO eventos_igreja (id, nome, tipo, congregacao, dia, mes, ano, hora_inicio, hora_fim)
      VALUES (${id}, ${ev.nome}, ${ev.tipo}, ${ev.congregacao||''}, ${parseInt(ev.dia)}, ${parseInt(ev.mes)}, ${parseInt(ev.ano)}, ${ev.hora_inicio||'17:00'}, ${ev.hora_fim||'22:00'})
      RETURNING *;
    `;
    criados.push(rows[0]);
  }

  return NextResponse.json(criados, { status: 201 });
}
