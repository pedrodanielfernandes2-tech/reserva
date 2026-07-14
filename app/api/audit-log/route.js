import { NextResponse } from "next/server";
import { sql } from "@/lib/sql";
import { ensureSchema } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";

export async function GET() {
  await ensureSchema();
  if (!isAdminRequest()) return NextResponse.json({ erro: "Apenas administradores." }, { status: 401 });
  const rows = await sql`SELECT * FROM audit_log ORDER BY executado_em DESC LIMIT 200;`;
  return NextResponse.json(rows);
}
