import Link from "next/link";
import { LotusIcon } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-5 py-24 text-center">
      <LotusIcon className="mx-auto h-12 w-16" />
      <h1 className="mt-4 text-3xl">Página não encontrada</h1>
      <p className="mt-2 text-salvia-600">O endereço não existe ou você não tem acesso a este conteúdo.</p>
      <Link href="/" className="btn-primary mt-6">Voltar ao início</Link>
    </div>
  );
}
