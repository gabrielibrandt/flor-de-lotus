import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { registerPatient } from "@/server/services/accounts";
import { getQuestions, saveAnswers } from "@/server/services/anamneses";

let counter = 0;
export function uniqueEmail(prefix = "paciente") {
  counter += 1;
  return `${prefix}.${Date.now()}.${counter}@exemplo.test`;
}

export async function ensureAdmin() {
  const existing = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (existing) return existing;
  return prisma.user.create({
    data: { email: "profissional@exemplo.test", name: "Profissional Teste", role: "ADMIN", passwordHash: await bcrypt.hash("SenhaAdmin123!", 4) },
  });
}

export async function newPatient(name = "Maria Fictícia") {
  return registerPatient({ fullName: name, preferredName: name.split(" ")[0], email: uniqueEmail(), password: "senhaSegura1" });
}

/** Preenche todas as perguntas obrigatórias com respostas fictícias válidas. */
export async function fillAll(patientId: string, anamnesisId: string) {
  const qs = await getQuestions();
  const items = qs.map((q) => {
    if (q.fieldType === "composite") {
      const cfg = JSON.parse(q.config!);
      return { questionId: q.id, value: Object.fromEntries(cfg.fields.map((f: any) => [f.key, f.type === "date" ? "1990-05-10" : `Resposta ${q.number} ${f.key}`])) };
    }
    if (q.fieldType === "choice") return { questionId: q.id, value: { option: "Não", details: "" } };
    return { questionId: q.id, value: `Resposta fictícia da pergunta ${q.number}.` };
  });
  await saveAnswers(patientId, anamnesisId, items);
  return qs;
}
