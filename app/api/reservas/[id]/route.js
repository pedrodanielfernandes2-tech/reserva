import { NextResponse } from "next/server";
import { sql } from "@/lib/sql";
import { ensureSchema } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";

export async function DELETE(request, { params }) {
  await ensureSchema();
  const { id } = params;

  const rows = await sql`SELECT * FROM reservas WHERE id = ${id};`;
  const reserva = rows[0];
  if (!reserva) {
    return NextResponse.json({ erro: "Reserva não encontrada." }, { status: 404 });
  }

  const admin = isAdminRequest();

  if (!admin) {
    const body = await request.json().catch(() => ({}));
    const nomeConfirmado = (body.nome || "").trim().toLowerCase();
    if (nomeConfirmado !== reserva.nome.trim().toLowerCase()) {
      return NextResponse.json(
        { erro: "Nome não corresponde ao solicitante desta reserva." },
        { status: 403 }
      );
    }
  }

  await sql`DELETE FROM reservas WHERE id = ${id};`;
  return NextResponse.json({ ok: true });
}
