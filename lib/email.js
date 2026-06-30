// Envia um e-mail avisando os administradores sobre uma nova reserva,
// usando a API REST do Resend diretamente (sem precisar instalar nenhum SDK).
//
// Se as variáveis de ambiente não estiverem configuradas, a função apenas
// registra um aviso no log — o site continua funcionando normalmente.
export async function notificarAdminEmail(reserva) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;            // ex: reservas@seudominio.com
  const to = process.env.EMAIL_ADMIN;             // ex: admin@igreja.com ou vários separados por vírgula

  if (!apiKey || !from || !to) {
    console.warn(
      "[email] Resend não configurado (faltam variáveis de ambiente) — aviso por e-mail não enviado."
    );
    return;
  }

  const { sala, nome, evento, dia, mes, ano, horaInicio, horaFim } = reserva;
  const dataFmt = `${String(dia).padStart(2, "0")}/${String(mes + 1).padStart(2, "0")}/${ano}`;
  const destinatarios = to.split(",").map((e) => e.trim()).filter(Boolean);

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;border:1px solid #ddd;border-radius:12px;overflow:hidden;">
      <div style="background:#0E8E89;padding:20px 24px;">
        <h2 style="color:#fff;margin:0;font-size:18px;">🗓️ Nova Reserva Cadastrada</h2>
        <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:13px;">Assembleia de Deus Louveira</p>
      </div>
      <div style="padding:24px;background:#fff;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px 0;color:#5C7976;width:110px;">Sala / Nave</td><td style="padding:8px 0;font-weight:700;">${sala}</td></tr>
          <tr><td style="padding:8px 0;color:#5C7976;">Data</td><td style="padding:8px 0;font-weight:700;">${dataFmt}</td></tr>
          <tr><td style="padding:8px 0;color:#5C7976;">Horário</td><td style="padding:8px 0;font-weight:700;">${horaInicio} – ${horaFim}</td></tr>
          <tr><td style="padding:8px 0;color:#5C7976;">Evento</td><td style="padding:8px 0;font-weight:700;">${evento}</td></tr>
          <tr><td style="padding:8px 0;color:#5C7976;">Solicitante</td><td style="padding:8px 0;font-weight:700;">${nome}</td></tr>
        </table>
      </div>
      <div style="padding:14px 24px;background:#F4F8F7;border-top:1px solid #ddd;text-align:center;font-size:12px;color:#5C7976;">
        Sistema de Reservas — Assembleia de Deus Louveira
      </div>
    </div>
  `;

  try {
    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: destinatarios,
        subject: `🗓️ Nova Reserva — ${sala} em ${dataFmt}`,
        html,
      }),
    });

    if (!resposta.ok) {
      const detalhes = await resposta.text();
      console.error("[email] Falha ao enviar e-mail via Resend:", resposta.status, detalhes);
    }
  } catch (erro) {
    // Um problema no envio do e-mail nunca deve impedir a reserva de ser salva.
    console.error("[email] Erro inesperado ao tentar enviar e-mail:", erro);
  }
}
