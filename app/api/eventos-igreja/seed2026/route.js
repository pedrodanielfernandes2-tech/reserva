import { NextResponse } from "next/server";
import { sql } from "@/lib/sql";

// Endpoint temporário para importar os eventos do calendário 2026
// Acesse UMA VEZ em: reservasalas.vercel.app/api/eventos-igreja/seed2026
// Após confirmar que os eventos aparecem no calendário, pode deletar este arquivo.

const EVENTOS = [
  // JANEIRO (mes=0)
  ['Oração + Sede Reservada Ensaio Jovens','sede','',5,0,2026,'17:00','22:00'],
  ['Culto de Oração e Ensino','sede','',6,0,2026,'17:00','22:00'],
  ['Sede Reservada para Ensaio Teens','sede','',7,0,2026,'17:00','22:00'],
  ['Sede Reservada para Ensaio Jovens','sede','',8,0,2026,'17:00','22:00'],
  ['Santa Ceia','sede','',11,0,2026,'17:00','22:00'],
  ['Semana Recover','sede','',12,0,2026,'09:00','22:00'],
  ['Semana Recover','sede','',13,0,2026,'09:00','22:00'],
  ['Semana Recover','sede','',14,0,2026,'09:00','22:00'],
  ['Semana Recover','sede','',15,0,2026,'09:00','22:00'],
  ['Assembleia Geral Ordinária','sede','',19,0,2026,'17:00','22:00'],
  ['Sede Reservada para Ensaio Teens','sede','',21,0,2026,'17:00','22:00'],
  ['Sede Reservada para Ensaio de Casamento','sede','',26,0,2026,'17:00','22:00'],
  ['Sede Reservada para Ensaio Teens','sede','',28,0,2026,'17:00','22:00'],
  // FEVEREIRO (mes=1)
  ['Culto Família no Altar','sede','',1,1,2026,'17:00','22:00'],
  ['Sede Reservada – Casamento e Ensaio Teens','sede','',7,1,2026,'09:00','22:00'],
  ['Santa Ceia','sede','',8,1,2026,'17:00','22:00'],
  ['Congresso Teens','sede','',13,1,2026,'09:00','22:00'],
  ['Congresso Teens','sede','',14,1,2026,'09:00','22:00'],
  ['Congresso Teens','sede','',15,1,2026,'09:00','22:00'],
  ['Culto Reunião de Obreiros','sede','',23,1,2026,'17:00','22:00'],
  ['Sede Reservada – Casamento','sede','',28,1,2026,'09:00','22:00'],
  // MARÇO (mes=2)
  ['Culto Família no Altar','sede','',1,2,2026,'17:00','22:00'],
  ['Celebração Kids','congregacao','Colinas',3,2,2026,'09:00','21:00'],
  ['Chá entre Mulheres – Dia Internacional','sede','',4,2,2026,'17:00','22:00'],
  ['Santa Ceia','sede','',8,2,2026,'17:00','22:00'],
  ['Culto Administrativo','sede','',9,2,2026,'17:00','22:00'],
  ['Celebração Jovem – Sede','sede','',21,2,2026,'17:00','22:00'],
  ['Culto Reunião de Obreiros','sede','',23,2,2026,'17:00','22:00'],
  ['Festividade Cavalli','congregacao','CAVALLI',27,2,2026,'17:00','22:00'],
  ['Festividade Cavalli','congregacao','CAVALLI',28,2,2026,'09:00','22:00'],
  ['Festividade Cavalli','congregacao','CAVALLI',29,2,2026,'09:00','22:00'],
  // ABRIL (mes=3)
  ['EBD Parque – Teens','sede','',4,3,2026,'09:00','17:00'],
  ['Culto Família no Altar','sede','',5,3,2026,'17:00','22:00'],
  ['Santa Ceia','sede','',12,3,2026,'17:00','22:00'],
  ['Culto Administrativo','sede','',13,3,2026,'17:00','22:00'],
  ['Celebração Jovem – Sede','sede','',18,3,2026,'17:00','22:00'],
  ['Aniversário Irmã Marilda','sede','',27,3,2026,'17:00','22:00'],
  ['Encontro Feminino','sede','',30,3,2026,'17:00','22:00'],
  // MAIO (mes=4)
  ['Encontro Feminino','sede','',1,4,2026,'09:00','22:00'],
  ['EBD Parque – Teens','sede','',2,4,2026,'09:00','17:00'],
  ['Culto Família no Altar','sede','',3,4,2026,'17:00','22:00'],
  ['Jantar Dia dos Namorados','sede','',8,4,2026,'17:00','22:00'],
  ['Encontro Teens','congregacao','Estiva',9,4,2026,'09:00','21:00'],
  ['Santa Ceia','sede','',10,4,2026,'17:00','22:00'],
  ['Culto Administrativo','sede','',11,4,2026,'17:00','22:00'],
  ['Celebração Jovem – Sede','sede','',16,4,2026,'17:00','22:00'],
  ['Culto Reunião de Obreiros','sede','',25,4,2026,'17:00','22:00'],
  ['Ensaio Geral Jovens','sede','',30,4,2026,'17:00','22:00'],
  // JUNHO (mes=5)
  ['Culto Família no Altar','sede','',7,5,2026,'17:00','22:00'],
  ['Jantar Dia dos Namorados','sede','',12,5,2026,'17:00','22:00'],
  ['Encontro Teens','congregacao','Estiva',13,5,2026,'09:00','21:00'],
  ['Santa Ceia','sede','',14,5,2026,'17:00','22:00'],
  ['Conferência Missionária','sede','',18,5,2026,'09:00','22:00'],
  ['Conferência Missionária','sede','',19,5,2026,'09:00','22:00'],
  ['Conferência Missionária','sede','',20,5,2026,'09:00','22:00'],
  ['Conferência Missionária','sede','',21,5,2026,'09:00','22:00'],
  ['Culto Reunião de Obreiros','sede','',22,5,2026,'17:00','22:00'],
  ['Ensaio Geral Jovens','sede','',27,5,2026,'17:00','22:00'],
  ['EBF – Escola Bíblica de Férias','sede','',29,5,2026,'09:00','22:00'],
  ['EBF – Escola Bíblica de Férias','sede','',30,5,2026,'09:00','22:00'],
  // JULHO (mes=6)
  ['Culto Família no Altar','sede','',5,6,2026,'17:00','22:00'],
  ['Culto Administrativo','sede','',6,6,2026,'17:00','22:00'],
  ['EBF – Escola Bíblica de Férias','sede','',8,6,2026,'09:00','22:00'],
  ['EBF – Escola Bíblica de Férias','sede','',9,6,2026,'09:00','22:00'],
  ['Santa Ceia','sede','',12,6,2026,'17:00','22:00'],
  ['Ensaio Geral Jovens','sede','',13,6,2026,'17:00','22:00'],
  ['Congresso Jovem','sede','',17,6,2026,'09:00','22:00'],
  ['Congresso Jovem','sede','',18,6,2026,'09:00','22:00'],
  ['Congresso Jovem','sede','',19,6,2026,'09:00','22:00'],
  ['Evento de Férias – Ministério Teens','sede','',20,6,2026,'09:00','22:00'],
  ['Evento de Férias – Ministério Teens','sede','',21,6,2026,'09:00','22:00'],
  ['Evento de Férias – Ministério Teens','sede','',22,6,2026,'09:00','22:00'],
  ['Culto Reunião de Obreiros','sede','',23,6,2026,'17:00','22:00'],
  ['EBF – Escola Bíblica de Férias','sede','',24,6,2026,'09:00','22:00'],
  ['EBF – Escola Bíblica de Férias','sede','',25,6,2026,'09:00','22:00'],
  // AGOSTO (mes=7)
  ['Culto Família no Altar','sede','',1,7,2026,'17:00','22:00'],
  ['Celebração Kids','congregacao','Monterrey',4,7,2026,'09:00','21:00'],
  ['Encontro Teens','congregacao','CAVALLI',8,7,2026,'09:00','21:00'],
  ['Santa Ceia','sede','',9,7,2026,'17:00','22:00'],
  ['Culto entre Mulheres','sede','',10,7,2026,'17:00','22:00'],
  ['Seminário da Família','sede','',17,7,2026,'09:00','22:00'],
  ['Seminário da Família','sede','',18,7,2026,'09:00','22:00'],
  ['Treinamento Prof – Todo Campo','congregacao','Lago Azul',20,7,2026,'09:00','21:00'],
  ['Culto Reunião de Obreiros','sede','',24,7,2026,'17:00','22:00'],
  ['Festividade Estiva','congregacao','Estiva',28,7,2026,'17:00','22:00'],
  ['Festividade Estiva','congregacao','Estiva',29,7,2026,'09:00','22:00'],
  ['Festividade Estiva','congregacao','Estiva',30,7,2026,'09:00','22:00'],
  // SETEMBRO (mes=8)
  ['EBD Parque – Teens','sede','',5,8,2026,'09:00','17:00'],
  ['Culto Família no Altar','sede','',6,8,2026,'17:00','22:00'],
  ['Culto Administrativo','sede','',7,8,2026,'17:00','22:00'],
  ['Celebração Kids','congregacao','Lago Azul',8,8,2026,'09:00','21:00'],
  ['Celebração Jovem – Sede','sede','',12,8,2026,'17:00','22:00'],
  ['Santa Ceia','sede','',13,8,2026,'17:00','22:00'],
  ['EBOM','sede','',17,8,2026,'09:00','22:00'],
  ['EBOM','sede','',18,8,2026,'09:00','22:00'],
  ['EBOM','sede','',19,8,2026,'09:00','22:00'],
  ['EBOM','sede','',20,8,2026,'09:00','22:00'],
  ['Culto Reunião de Obreiros','sede','',21,8,2026,'17:00','22:00'],
  ['Festividade Colinas','congregacao','Colinas',25,8,2026,'17:00','22:00'],
  ['Festividade Colinas','congregacao','Colinas',26,8,2026,'09:00','22:00'],
  ['Festividade Colinas','congregacao','Colinas',27,8,2026,'09:00','22:00'],
  // OUTUBRO (mes=9)
  ['Congresso Kids','sede','',3,9,2026,'09:00','22:00'],
  ['Congresso Kids + Culto Família no Altar','sede','',4,9,2026,'09:00','22:00'],
  ['Encontro Teens','congregacao','Monterrey',10,9,2026,'09:00','21:00'],
  ['Santa Ceia','sede','',11,9,2026,'17:00','22:00'],
  ['Culto Ação de Graças + Aniv. Pr. Gaetano','sede','',18,9,2026,'17:00','22:00'],
  ['Culto Reunião de Obreiros','sede','',19,9,2026,'17:00','22:00'],
  ['Festividade Lago Azul','congregacao','Lago Azul',30,9,2026,'17:00','22:00'],
  ['Festividade Lago Azul','congregacao','Lago Azul',31,9,2026,'09:00','22:00'],
  // NOVEMBRO (mes=10)
  ['Festividade Lago Azul','congregacao','Lago Azul',1,10,2026,'09:00','22:00'],
  ['Culto Família no Altar','sede','',1,10,2026,'17:00','22:00'],
  ['Celebração Kids','congregacao','CAVALLI',3,10,2026,'09:00','21:00'],
  ['Santa Ceia','sede','',8,10,2026,'17:00','22:00'],
  ['Ensaio Geral Irmãs','sede','',9,10,2026,'17:00','22:00'],
  ['Congresso Círculo de Oração','sede','',13,10,2026,'09:00','22:00'],
  ['Congresso Círculo de Oração','sede','',14,10,2026,'09:00','22:00'],
  ['Congresso Círculo de Oração','sede','',15,10,2026,'09:00','22:00'],
  ['Culto Administrativo','sede','',16,10,2026,'17:00','22:00'],
  ['Celebração Jovem – Gratidão','sede','',21,10,2026,'17:00','22:00'],
  ['Culto Reunião de Obreiros','sede','',23,10,2026,'17:00','22:00'],
  ['Reservado','sede','',28,10,2026,'09:00','22:00'],
  ['Reservado','sede','',30,10,2026,'09:00','22:00'],
  // DEZEMBRO (mes=11)
  ['Reservado','sede','',5,11,2026,'09:00','22:00'],
  ['Culto Especial de Natal','sede','',6,11,2026,'17:00','22:00'],
  ['Acampa Teens – Ibiúna','sede','',8,11,2026,'09:00','22:00'],
  ['Acampa Teens – Ibiúna','sede','',9,11,2026,'09:00','22:00'],
  ['Acampa Teens – Ibiúna','sede','',10,11,2026,'09:00','22:00'],
  ['Acampa Teens – Ibiúna','sede','',11,11,2026,'09:00','22:00'],
  ['Reservado','sede','',12,11,2026,'09:00','22:00'],
  ['Santa Ceia','sede','',13,11,2026,'17:00','22:00'],
  ['Reservado','sede','',14,11,2026,'09:00','22:00'],
  ['Apresentação Cantata','sede','',19,11,2026,'17:00','22:00'],
  ['Culto de Louvor e Adoração','sede','',27,11,2026,'17:00','22:00'],
  ['Culto Gratidão','sede','',31,11,2026,'17:00','22:00'],
];

export async function GET() {
  try {
    // Remove eventos 2026 existentes
    await sql`DELETE FROM eventos_igreja WHERE ano = 2026`;

    let inseridos = 0;
    for (const [nome, tipo, congregacao, dia, mes, ano, h_ini, h_fim] of EVENTOS) {
      await sql`
        INSERT INTO eventos_igreja (id, nome, tipo, congregacao, dia, mes, ano, hora_inicio, hora_fim)
        VALUES (gen_random_uuid(), ${nome}, ${tipo}, ${congregacao}, ${dia}, ${mes}, ${ano}, ${h_ini}, ${h_fim})
      `;
      inseridos++;
    }

    return NextResponse.json({
      ok: true,
      mensagem: `✅ ${inseridos} eventos importados com sucesso!`,
      sede: EVENTOS.filter(e=>e[1]==='sede').length,
      congregacao: EVENTOS.filter(e=>e[1]==='congregacao').length,
    });
  } catch(e) {
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
