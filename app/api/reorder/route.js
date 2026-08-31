import { NextResponse } from "next/server";
import { sql } from "@/lib/sql";
import { ensureSchema } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";

// POST /api/salas/reorder
// Body: { ids: ["id1","id2","id3",...] } — array de IDs na nova ordem desejada
export async function POST(request) {
  await ensureSchema();
  if (!isAdminRequest()) return NextResponse.json({ erro: "Apenas administradores." }, { status: 401 });
  const { ids } = await request.json();
  if (!Array.isArray(ids) || !ids.length) {
    return NextResponse.json({ erro: "Lista de IDs inválida." }, { status: 400 });
  }
  for (let i = 0; i < ids.length; i++) {
    await sql`UPDATE salas SET ordem = ${i} WHERE id = ${ids[i]};`;
  }
  return NextResponse.json({ ok: true });
}
