import { NextResponse } from "next/server";
import { setAdminCookie } from "@/lib/auth";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const senha = body.senha || "";

  if (senha !== (process.env.ADMIN_PASSWORD || "")) {
    return NextResponse.json({ erro: "Senha incorreta." }, { status: 401 });
  }

  setAdminCookie();
  return NextResponse.json({ ok: true });
}
