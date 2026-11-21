import { prisma } from "@/lib/db";
import { AppError, NotFoundError } from "@/lib/errors";
import { audit } from "./audit";

/** Observações internas — acessíveis somente pela profissional. */
export async function addNote(adminId: string, input: { patientId: string; anamnesisId?: string | null; content: string }) {
  const content = input.content.trim();
  if (!content) throw new AppError("Escreva a observação.");
  if (content.length > 10000) throw new AppError("Observação muito longa.");
  if (input.anamnesisId) {
    const a = await prisma.anamnesis.findUnique({ where: { id: input.anamnesisId }, select: { patientId: true } });
    if (!a || a.patientId !== input.patientId) throw new NotFoundError();
  }
  const note = await prisma.practitionerNote.create({
    data: { patientId: input.patientId, anamnesisId: input.anamnesisId ?? null, authorId: adminId, content },
  });
  await audit({ actorId: adminId, action: "NOTE_ADDED", entityType: "PractitionerNote", entityId: note.id });
  return note;
}

export async function updateNote(adminId: string, id: string, content: string) {
  const c = content.trim();
  if (!c) throw new AppError("Escreva a observação.");
  await prisma.practitionerNote.update({ where: { id }, data: { content: c } });
  await audit({ actorId: adminId, action: "NOTE_UPDATED", entityType: "PractitionerNote", entityId: id });
}

export async function deleteNote(adminId: string, id: string) {
  await prisma.practitionerNote.delete({ where: { id } });
  await audit({ actorId: adminId, action: "NOTE_DELETED", entityType: "PractitionerNote", entityId: id });
}
