import { NextResponse } from "next/server";
import { sql } from "@/lib/sql";
import { ensureSchema } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";

export async function DELETE(request, context) {
  await ensureSchema();
  if (!isAdminRequest()) return NextResponse.json({ erro: "Apenas administradores." }, { status: 401 });
  await sql`DELETE FROM salas WHERE id = ${context.params.id};`;
  return NextResponse.json({ ok: true });
}

export async function PATCH(request, context) {
  await ensureSchema();
  if (!isAdminRequest()) return NextResponse.json({ erro: "Apenas administradores." }, { status: 401 });
  const body = await request.json();
  const { cor, foto_url } = body;
  if (cor !== undefined) {
    await sql`UPDATE salas SET cor = ${cor} WHERE id = ${context.params.id};`;
  }
  if (foto_url !== undefined) {
    await sql`UPDATE salas SET foto_url = ${foto_url} WHERE id = ${context.params.id};`;
  }
  const rows = await sql`SELECT * FROM salas WHERE id = ${context.params.id};`;
  return NextResponse.json(rows[0]);
}
