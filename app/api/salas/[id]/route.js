import { NextResponse } from "next/server";
import { sql } from "@/lib/sql";
import { ensureSchema } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";

export async function DELETE(request, { params }) {
  await ensureSchema();

  if (!isAdminRequest()) {
    return NextResponse.json(
      { erro: "Apenas administradores podem excluir salas." },
      { status: 401 }
    );
  }

  const { id } = params;
  await sql`DELETE FROM salas WHERE id = ${id};`;

  return NextResponse.json({ ok: true });
}
