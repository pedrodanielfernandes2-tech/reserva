import { NextResponse } from "next/server";
import { sql } from "@/lib/sql";
import { ensureSchema } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import crypto from "crypto";

const DIAS = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];

export async function GET() {
  await ensureSchema();
  const rows = await sql`SELECT * FROM bloqueios ORDER BY sala_nome, dia_semana, hora_inicio;`;
  return NextResponse.json(rows);
}

export async function POST(request) {
  await ensureSchema();

  if (!isAdminRequest()) {
    return NextResponse.json({ erro: "Apenas administradores podem criar bloqueios." }, { status: 401 });
  }

  const body = await request.json();
  const sala_nome = (body.sala_nome || "").trim();
  const dia_semana = parseInt(body.dia_semana, 10);
  const hora_inicio = body.hora_inicio;
  const hora_fim = body.hora_fim;
  const descricao = (body.descricao || "").trim();

  if (!sala_nome || isNaN(dia_semana) || !hora_inicio || !hora_fim) {
    return NextResponse.json({ erro: "Preencha todos os campos." }, { status: 400 });
  }
  if (hora_fim <= hora_inicio) {
    return NextResponse.json({ erro: "Término precisa ser depois do início." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const rows = await sql`
    INSERT INTO bloqueios (id, sala_nome, dia_semana, hora_inicio, hora_fim, descricao)
    VALUES (${id}, ${sala_nome}, ${dia_semana}, ${hora_inicio}, ${hora_fim}, ${descricao})
    RETURNING *;
  `;

  return NextResponse.json(rows[0], { status: 201 });
}
