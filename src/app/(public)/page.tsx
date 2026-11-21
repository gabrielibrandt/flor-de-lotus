import Link from "next/link";
import { Clock, HeartHandshake, Leaf, ShieldCheck, CalendarClock } from "lucide-react";
import { Leaves, LotusIcon } from "@/components/ui/Logo";

export default function HomePage() {
  return (
    <div className="fade-in">
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-8 md:grid-cols-[1.15fr_0.85fr] md:pt-14">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-oliva-600">Yoga e Ayurveda para Mulheres</p>
            <h1 className="mt-4 text-4xl leading-tight sm:text-5xl md:text-6xl">
              Seja bem-vinda ao <span className="italic text-salvia-600">Flor de Lótus</span>
            </h1>
            <p className="mt-6 font-serif text-2xl text-oliva-700">Sua consulta começou!</p>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-salvia-700">
              Separe um momento do seu dia para responder à sua anamnese com atenção e carinho. Você está dando um passo em
              direção ao conhecimento de si mesma por meio de uma tradição milenar que pode transformar a forma como você se vê
              e se relaciona com o mundo.
            </p>
            <p className="mt-4 font-serif text-xl italic text-salvia-600">Feliz em compartilhar contigo o Ayurveda tradicional.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/entrar" className="btn-primary px-7 py-3 text-base">Acessar a área da paciente</Link>
              <Link href="/cadastro" className="btn-secondary px-7 py-3 text-base">Criar uma conta</Link>
            </div>
          </div>
          <div className="relative hidden items-center justify-center md:flex">
            <div className="absolute h-80 w-80 rounded-full bg-salvia-100/70 blur-2xl" />
            <div className="relative flex h-72 w-72 items-center justify-center rounded-full border border-salvia-200 bg-gradient-to-b from-white to-bege-100 shadow-suave">
              <LotusIcon className="h-40 w-52" />
            </div>
            <Leaves className="absolute -bottom-2 right-0 w-56 opacity-80" />
          </div>
        </div>
      </section>

      <section className="bg-bege-50/80 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-3xl">Como funciona a anamnese</h2>
          <p className="mt-2 max-w-2xl text-salvia-600">
            A anamnese é o primeiro encontro com a sua história. Ela ajuda a profissional a compreender seu corpo, sua rotina e
            seus hábitos antes do atendimento.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: HeartHandshake, title: "Crie sua conta", text: "Cadastre-se com seu nome, e-mail e uma senha. Sua primeira anamnese fica disponível na hora." },
              { icon: Clock, title: "Cerca de 30 minutos", text: "O questionário é dividido em etapas. Suas respostas são salvas automaticamente — você pode pausar e continuar depois." },
              { icon: CalendarClock, title: "Até 48 horas antes", text: "Envie a anamnese até 48 horas antes do seu atendimento, para que ela seja lida com calma." },
              { icon: ShieldCheck, title: "Com privacidade", text: "Suas informações são confidenciais e acessadas somente por você e pela profissional responsável." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="card p-6">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-salvia-100 text-salvia-700">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-xl">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-salvia-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16 text-center">
        <Leaf className="mx-auto h-6 w-6 text-oliva-500" aria-hidden />
        <p className="mt-4 font-serif text-2xl leading-relaxed text-salvia-700">
          “Responda com sinceridade e sem pressa. Não existem respostas certas ou erradas — existe a sua história.”
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/cadastro" className="btn-primary">Começar agora</Link>
          <Link href="/entrar" className="btn-ghost">Já tenho conta</Link>
        </div>
      </section>
    </div>
  );
}
