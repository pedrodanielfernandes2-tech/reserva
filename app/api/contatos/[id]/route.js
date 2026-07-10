import { NextResponse } from "next/server";
import { sql } from "@/lib/sql";
import { ensureSchema } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";

export async function DELETE(request, context) {
  await ensureSchema();
  if (!isAdminRequest()) return NextResponse.json({ erro: "Apenas administradores." }, { status: 401 });
  await sql`DELETE FROM contatos_notificacao WHERE id = ${context.params.id};`;
  return NextResponse.json({ ok: true });
}
