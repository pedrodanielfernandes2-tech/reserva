import { NextResponse } from "next/server";
import { sql } from "@/lib/sql";
import { ensureSchema } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";

export async function DELETE(request, context) {
  await ensureSchema();
  if (!isAdminRequest()) return NextResponse.json({ erro: "Apenas administradores." }, { status: 401 });
  const id = context.params.id;
  await sql`DELETE FROM eventos_igreja WHERE id = ${id};`;
  return NextResponse.json({ ok: true });
}
