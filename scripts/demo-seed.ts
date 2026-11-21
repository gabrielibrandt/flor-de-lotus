/**
 * Dados FICTÍCIOS para demonstração e testes manuais. Nunca use em produção.
 * Uso: npm run db:demo
 */
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";
import { seedQuestions } from "../prisma/seed";
import { registerPatient } from "../src/server/services/accounts";
import { getQuestions, releaseAnamnesis, saveAnswers, submitAnamnesis } from "../src/server/services/anamneses";
import { createAppointment } from "../src/server/services/appointments";
import { patientRequestCorrection } from "../src/server/services/corrections";
import { addDaysLocal, todayLocal } from "../src/lib/dates";

const DEMO_ADMIN = { email: "profissional@demo.flordelotus.test", password: "DemoLotus2026!", name: "Profissional Demo" };
const DEMO_PASSWORD = "paciente123";

const sample: Record<number, unknown> = {
  1: { nomeCompleto: "", comoGostaDeSerChamada: "" },
  2: { dataNascimento: "1988-04-12", localNascimento: "Belo Horizonte – MG", cidadeAtual: "Curitiba – PR", haQuantoTempo: "6 anos" },
  3: "Sinto muito cansaço ao acordar e inchaço depois das refeições. Também tenho ansiedade em dias de muito trabalho. Faz uns 2 anos.",
  4: { option: "Não", details: "" },
  5: "Tenho intolerância à lactose. Sou sensível a perfumes fortes.",
  6: "Menarca aos 12 anos. Ciclo de 28 a 30 dias, com cólica no primeiro dia e alguns coágulos. Sangue vermelho vivo, sem cheiro forte. Uso coletor menstrual.",
  7: "Nunca gestei e não pretendo nos próximos 12 meses.",
  8: { option: "Não", details: "" },
  9: "Às vezes seguro o xixi durante reuniões longas.",
  10: "Costumo segurar o choro e o sono quando estou trabalhando até tarde.",
  11: "Acordo às 6h30, tomo café preto e pão. Trabalho no computador a manhã toda.",
  12: "Almoço às 13h (arroz, feijão, salada e frango). À tarde, belisco biscoitos e tomo mais café.",
  13: "Janto por volta das 21h, algo rápido. Vejo séries até tarde.",
  14: "Durmo por volta da meia-noite. Acordo uma vez durante a noite e levanto cansada.",
  15: "Urino bem. O intestino funciona dia sim, dia não. Suo pouco nos exercícios.",
  16: "Caminho 2 vezes por semana, intensidade leve. Gosto, mas queria ser mais constante.",
  17: "Não gosto de quiabo e jiló. Não sou vegana nem vegetariana.",
  18: { option: "Sim", details: "" },
  19: { option: "Tenho dúvidas", details: "Gostaria de entender melhor antes." },
  20: { option: "Sim", details: "" },
};

async function fill(patientId: string, anamnesisId: string, fullName: string, preferred: string, upTo = 20) {
  const qs = await getQuestions();
  const items = qs.filter((q) => q.number <= upTo).map((q) => ({
    questionId: q.id,
    value: q.number === 1 ? { nomeCompleto: fullName, comoGostaDeSerChamada: preferred } : sample[q.number],
  }));
  await saveAnswers(patientId, anamnesisId, items);
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Não execute dados de demonstração em produção.");
  await seedQuestions();

  if (!(await prisma.user.findFirst({ where: { role: "ADMIN" } }))) {
    await prisma.user.create({ data: { email: DEMO_ADMIN.email, name: DEMO_ADMIN.name, role: "ADMIN", passwordHash: await bcrypt.hash(DEMO_ADMIN.password, 12) } });
  }
  const admin = (await prisma.user.findFirst({ where: { role: "ADMIN" } }))!;
  if (await prisma.patient.count()) {
    console.log("Já existem pacientes no banco; dados de demonstração não foram recriados.");
    return;
  }

  const today = todayLocal();
  const people = [
    { fullName: "Helena Fictícia Andrade", preferredName: "Helena", email: "helena@demo.flordelotus.test" },
    { fullName: "Marina Exemplo Souza", preferredName: "Mari", email: "marina@demo.flordelotus.test" },
    { fullName: "Júlia Teste Carvalho", preferredName: "Ju", email: "julia@demo.flordelotus.test" },
    { fullName: "Beatriz Modelo Lima", preferredName: "Bia", email: "beatriz@demo.flordelotus.test" },
  ];
  const created = [];
  for (const p of people) created.push(await registerPatient({ ...p, password: DEMO_PASSWORD }));

  // Helena: primeira anamnese enviada + nova liberada para daqui a 5 dias
  const [h, m, j, b] = created;
  await fill(h.patient.id, h.anamnesis.id, h.patient.fullName, h.patient.preferredName);
  await submitAnamnesis(h.patient.id, h.anamnesis.id);
  await releaseAnamnesis(admin.id, { patientId: h.patient.id, date: addDaysLocal(today, 5), time: "14:00", addToAgenda: true });
  await patientRequestCorrection(h.patient.id, h.anamnesis.id, null, "Na pergunta 16, na verdade caminho 3 vezes por semana.");

  // Marina: em andamento, consulta amanhã (prazo já vencido → atrasada)
  const mAn = await releaseAnamnesis(admin.id, { patientId: m.patient.id, date: addDaysLocal(today, 1), time: "10:00", addToAgenda: true });
  await fill(m.patient.id, mAn.id, m.patient.fullName, m.patient.preferredName, 9);

  // Júlia: primeira anamnese em andamento, sem prazo
  await fill(j.patient.id, j.anamnesis.id, j.patient.fullName, j.patient.preferredName, 5);

  // Beatriz: acabou de se cadastrar (não iniciada) + compromisso sem anamnese
  await createAppointment(admin.id, { title: "Primeira conversa", date: addDaysLocal(today, 3), time: "16:30", durationMin: 50, patientId: b.patient.id });
  await createAppointment(admin.id, { title: "Aula de yoga em grupo", date: addDaysLocal(today, 2), time: "07:00", durationMin: 75, description: "Turma da manhã" });

  console.log("✓ Dados fictícios criados.");
  console.log(`  Profissional: ${DEMO_ADMIN.email} / ${DEMO_ADMIN.password} (somente se não havia conta administrativa)`);
  console.log(`  Pacientes: ${people.map((p) => p.email).join(", ")} / senha ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
