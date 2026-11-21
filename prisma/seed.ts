/**
 * Seed obrigatório: cadastra/atualiza as 20 perguntas originais.
 * Idempotente — pode ser executado quantas vezes for necessário.
 * Não cria pacientes nem a conta administrativa.
 */
import { prisma } from "../src/lib/db";
import { CATEGORY_ORDER, QUESTIONS } from "../src/lib/questions";


export async function seedQuestions(client: typeof prisma = prisma) {
  for (const q of QUESTIONS) {
    const data = {
      code: q.code,
      text: q.text,
      helpText: q.helpText ?? null,
      category: q.category,
      categoryOrder: CATEGORY_ORDER[q.category],
      summaryCategory: q.summaryCategory,
      fieldType: q.fieldType,
      config: q.config ? JSON.stringify(q.config) : null,
      required: q.required,
      allowNotApplicable: !!q.allowNotApplicable,
      allowPreferNot: !!q.allowPreferNot,
      isActive: true,
    };
    await client.question.upsert({ where: { number: q.number }, create: { number: q.number, ...data }, update: data });
  }
}

if (require.main === module) {
  seedQuestions()
    .then(() => console.log(`✓ ${QUESTIONS.length} perguntas cadastradas.`))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
