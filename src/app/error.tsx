"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-5 py-24 text-center">
      <h1 className="text-3xl">Algo não saiu como esperado</h1>
      <p className="mt-2 text-salvia-600">Não foi possível carregar esta página. Suas respostas salvas não foram afetadas.</p>
      <button onClick={reset} className="btn-primary mt-6">Tentar novamente</button>
    </div>
  );
}
