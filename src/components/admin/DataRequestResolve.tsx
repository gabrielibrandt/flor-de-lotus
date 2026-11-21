"use client";
import { ActionForm, FormAction } from "@/components/ui/forms";

export function DataRequestResolve({ action }: { action: FormAction }) {
  return (
    <ActionForm action={action} className="mt-3 space-y-2">
      <textarea name="response" className="textarea min-h-[70px]" placeholder="Resposta para a paciente" />
      <div className="flex gap-2">
        <button name="status" value="DONE" className="btn-primary btn-sm">Marcar como atendida</button>
        <button name="status" value="REJECTED" className="btn-ghost btn-sm">Não atender (justifique)</button>
      </div>
    </ActionForm>
  );
}
