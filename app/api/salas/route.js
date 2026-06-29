import { NextResponse } from "next/server";
import { sql } from "@/lib/sql";
import { ensureSchema } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import crypto from "crypto";

// Paleta fixa para as Salas — cada sala nova recebe a próxima cor da lista,
// na ordem em que é cadastrada, formando um ciclo. A Nave fica sempre com a
// cor dourada, já que é o ambiente principal e mantém identidade própria.
const COR_NAVE = "#E08C2B";
const PALETA_SALAS = ["#3F7FEA", "#46A35C", "#8C63D6", "#C85A86", "#2FA8A0", "#C97A3D"];

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

  let cor;
  if (tipo === "Nave") {
    cor = COR_NAVE;
  } else {
    const contagem = await sql`SELECT COUNT(*)::int AS total FROM salas WHERE tipo = 'Sala';`;
    cor = PALETA_SALAS[contagem[0].total % PALETA_SALAS.length];
  }

  const id = crypto.randomUUID();

  const rows = await sql`
    INSERT INTO salas (id, nome, tipo, cor)
    VALUES (${id}, ${nome}, ${tipo}, ${cor})
    RETURNING *;
  `;

  return NextResponse.json(rows[0], { status: 201 });
}
