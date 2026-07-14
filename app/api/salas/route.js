import { NextResponse } from "next/server";
import { sql } from "@/lib/sql";
import { ensureSchema } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import crypto from "crypto";

const CORES = ["#0E8E89","#E08C2B","#7C5CBF","#2B8FE0","#D6483A","#27856A","#C45AB3","#E0762B"];

export async function GET() {
  await ensureSchema();
  const rows = await sql`SELECT * FROM salas ORDER BY criado_em ASC;`;
  return NextResponse.json(rows);
}

export async function POST(request) {
  await ensureSchema();
  if (!isAdminRequest()) return NextResponse.json({ erro: "Apenas administradores." }, { status: 401 });
  const { nome, tipo, capacidade } = await request.json();
  if (!nome?.trim()) return NextResponse.json({ erro: "Nome obrigatório." }, { status: 400 });
  const existing = await sql`SELECT COUNT(*) as n FROM salas;`;
  const cor = CORES[parseInt(existing[0].n) % CORES.length];
  const id = crypto.randomUUID();
  const rows = await sql`
    INSERT INTO salas (id, nome, tipo, cor, capacidade)
    VALUES (${id}, ${nome.trim()}, ${tipo||"Sala"}, ${cor}, ${parseInt(capacidade)||0})
    RETURNING *;
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
