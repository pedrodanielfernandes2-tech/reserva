import { NextResponse } from "next/server";
import { sql } from "@/lib/sql";
import { ensureSchema } from "@/lib/db";
import crypto from "crypto";

export async function GET(request) {
  await ensureSchema();

  const { searchParams } = new URL(request.url);
  const sala = searchParams.get("sala");

  const rows = sala
    ? await sql`
        SELECT * FROM reservas
        WHERE sala_nome = ${sala}
        ORDER BY ano, mes, dia, hora_inicio;
      `
    : await sql`SELECT * FROM reservas ORDER BY ano, mes, dia, hora_inicio;`;

  return NextResponse.json(rows);
}

export async function POST(request) {
  await ensureSchema();

  const body = await request.json();
  const sala = (body.sala || "").trim();
  const nome = (body.nome || "").trim();
  const evento = (body.evento || "").trim();
  const dia = parseInt(body.dia, 10);
  const mes = parseInt(body.mes, 10);
  const ano = parseInt(body.ano, 10);
  const horaInicio = body.horaInicio;
  const horaFim = body.horaFim;

  if (!sala || !nome || !evento || !horaInicio || !horaFim || Number.isNaN(dia)) {
    return NextResponse.json({ erro: "Preencha todos os campos." }, { status: 400 });
  }
  if (horaFim <= horaInicio) {
    return NextResponse.json(
      { erro: "O horário de término precisa ser depois do horário de início." },
      { status: 400 }
    );
  }

  const id = crypto.randomUUID();

  // Inserção condicional em UMA única instrução: o próprio banco garante,
  // de forma atômica, que duas pessoas não consigam reservar o mesmo
  // horário/sala ao mesmo tempo (mesmo em requisições simultâneas).
  const rows = await sql`
    INSERT INTO reservas (id, sala_nome, nome, evento, dia, mes, ano, hora_inicio, hora_fim)
    SELECT ${id}, ${sala}, ${nome}, ${evento}, ${dia}, ${mes}, ${ano}, ${horaInicio}, ${horaFim}
    WHERE NOT EXISTS (
      SELECT 1 FROM reservas
      WHERE sala_nome = ${sala}
        AND dia = ${dia} AND mes = ${mes} AND ano = ${ano}
        AND hora_inicio < ${horaFim}
        AND hora_fim > ${horaInicio}
    )
    RETURNING *;
  `;

  if (rows.length === 0) {
    return NextResponse.json(
      {
        erro: `Já existe uma reserva para ${sala} nesse dia que conflita com o horário escolhido. Verifique o calendário e tente outro horário.`,
      },
      { status: 409 }
    );
  }

  return NextResponse.json(rows[0], { status: 201 });
}
