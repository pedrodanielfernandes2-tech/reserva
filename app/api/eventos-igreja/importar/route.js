import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth";

export async function POST(request) {
  if (!isAdminRequest()) return NextResponse.json({ erro: "Apenas administradores." }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ erro: "ANTHROPIC_API_KEY não configurada na Vercel." }, { status: 500 });

  const body = await request.json();
  const { pdfBase64, ano } = body;
  if (!pdfBase64) return NextResponse.json({ erro: "PDF não enviado." }, { status: 400 });

  const congregacoes = ["CAVALLI", "Estiva", "Monterrey", "Lago Azul", "Colinas"];

  const prompt = `Analise este calendário da Igreja Assembleia de Deus Louveira ${ano||2026} e extraia TODOS os eventos listados.

Para cada evento retorne um objeto JSON com estes campos:
- "nome": nome do evento (em português, limpo)
- "tipo": "sede" se acontece na igreja sede/principal, "congregacao" se é numa congregação/campo
- "congregacao": se tipo for "congregacao", o nome da congregação (${congregacoes.join(", ")}, ou outra identificada). Se tipo for "sede", deixe ""
- "dia": número do dia (inteiro)
- "mes": número do mês com base 0 (Janeiro=0, Fevereiro=1, ..., Dezembro=11)
- "ano": ${ano||2026}
- "hora_inicio": para tipo "sede" use "17:00" como padrão. Para "congregacao" use "09:00"
- "hora_fim": para tipo "sede" use "22:00" como padrão. Para "congregacao" use "21:00"

Regras importantes:
- Congregações conhecidas: ${congregacoes.join(", ")}
- Se o nome do evento contiver uma dessas congregações (ex: "FESTIVIDADE CAVALLI", "CELEBRAÇÃO KIDS COLINAS") → tipo "congregacao"
- Eventos com "SEDE RESERVADA", "RESERVADO", cultos, conferências, congressos, EBF, EBOM → tipo "sede"
- Eventos que durem múltiplos dias (ex: sexta, sábado e domingo) → gere um registro para CADA dia
- NÃO inclua eventos de outros anos
- Ignore datas que sejam de meses adjacentes mostradas no grid mas que não pertençam ao mês da página

Retorne APENAS um array JSON válido e nada mais. Sem markdown, sem explicação, sem texto extra.
Exemplo: [{"nome":"Culto Família no Altar","tipo":"sede","congregacao":"","dia":4,"mes":0,"ano":2026,"hora_inicio":"17:00","hora_fim":"22:00"}]`;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
            { type: "text", text: prompt }
          ]
        }]
      })
    });

    const data = await resp.json();
    if (!resp.ok) return NextResponse.json({ erro: data.error?.message || "Erro na API Claude." }, { status: 500 });

    const text = (data.content[0]?.text || "").replace(/```json|```/g, "").trim();
    const eventos = JSON.parse(text);

    return NextResponse.json({ eventos, total: eventos.length });
  } catch(e) {
    console.error("[importar]", e);
    return NextResponse.json({ erro: "Erro ao processar PDF: " + e.message }, { status: 500 });
  }
}
