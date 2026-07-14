import { NextResponse } from "next/server";
import { sql } from "@/lib/sql";
import { ensureSchema } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import crypto from "crypto";

export async function DELETE(request, context) {
  await ensureSchema();
  const { id } = context.params;
  const body = await request.json().catch(() => ({}));
  const { nome } = body;

  const rows = await sql`SELECT * FROM reservas WHERE id = ${id} LIMIT 1;`;
  if (!rows.length) return NextResponse.json({ erro: "Reserva não encontrada." }, { status: 404 });
  const r = rows[0];

  const isAdmin = isAdminRequest();

  if (!isAdmin) {
    if (!nome || nome.trim().toLowerCase() !== r.nome.trim().toLowerCase()) {
      return NextResponse.json({ erro: "Nome não confere com o solicitante da reserva." }, { status: 403 });
    }
  }

  await sql`DELETE FROM reservas WHERE id = ${id};`;

  // ✅ Registra no histórico de alterações
  try {
    await sql`
      INSERT INTO audit_log (id, acao, sala_nome, evento, nome_solicitante, dia, mes, ano, hora_inicio, hora_fim, executado_por)
      VALUES (
        ${crypto.randomUUID()}, 'exclusao',
        ${r.sala_nome}, ${r.evento}, ${r.nome},
        ${r.dia}, ${r.mes}, ${r.ano}, ${r.hora_inicio}, ${r.hora_fim},
        ${isAdmin ? 'admin' : r.nome}
      );
    `;
  } catch(e) { console.error("audit_log error:", e.message); }

  return NextResponse.json({ ok: true });
}
