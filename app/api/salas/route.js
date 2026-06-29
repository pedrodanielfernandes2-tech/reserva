import { NextResponse } from "next/server";
import { sql } from "@/lib/sql";
import { ensureSchema } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import crypto from "crypto";

export async function GET() {
  await ensureSchema();
  const rows = await sql`SELECT * FROM salas ORDER BY criado_em ASC;`;
  return NextResponse.json(rows);
}

export async function POST(request) {
  await ensureSchema();

  if (!isAdminRequest()) {
    return NextResponse.json(
      { erro: "Apenas administradores podem cadastrar salas." },
      { status: 401 }
    );
  }

  const body = await request.json();
  const nome = (body.nome || "").trim();
  const tipo = body.tipo === "Nave" ? "Nave" : "Sala";

  if (!nome) {
    return NextResponse.json({ erro: "Informe um nome para a sala." }, { status: 400 });
  }

  let cor = "var(--primary)";
  if (tipo === "Nave") cor = "var(--nave)";
  else if (/1/.test(nome)) cor = "var(--sala1)";
  else if (/2/.test(nome)) cor = "var(--sala2)";

  const id = crypto.randomUUID();

  const rows = await sql`
    INSERT INTO salas (id, nome, tipo, cor)
    VALUES (${id}, ${nome}, ${tipo}, ${cor})
    RETURNING *;
  `;

  return NextResponse.json(rows[0], { status: 201 });
}
