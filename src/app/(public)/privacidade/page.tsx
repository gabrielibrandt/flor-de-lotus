import { PRIVACY_VERSION } from "@/lib/constants";

export const metadata = { title: "Política de privacidade" };

export default function PrivacyPage() {
  const controller = process.env.PRIVACY_CONTROLLER_NAME || "Profissional responsável pela Flor de Lótus";
  const contact = process.env.PRIVACY_CONTACT || "o canal de contato informado no atendimento";
  const S = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="mt-8">
      <h2 className="text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-salvia-700">{children}</div>
    </section>
  );
  return (
    <article className="mx-auto max-w-3xl px-5 py-10 fade-in">
      <h1 className="text-4xl">Política de Privacidade</h1>
      <p className="mt-2 text-sm text-salvia-500">Versão {PRIVACY_VERSION}</p>
      <p className="mt-6 leading-relaxed text-salvia-700">
        Esta política explica como a Flor de Lótus – Yoga e Ayurveda para Mulheres trata os seus dados pessoais nesta
        plataforma, em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD).
      </p>
      <S title="1. Quem é a controladora">
        <p>A controladora dos dados é: <strong>{controller}</strong>. Contato para assuntos de privacidade: <strong>{contact}</strong>.</p>
      </S>
      <S title="2. Quais dados coletamos">
        <p>Dados de cadastro (nome completo, como gosta de ser chamada, e-mail e senha — armazenada apenas em formato criptográfico irreversível) e as respostas da anamnese, que incluem <strong>dados pessoais sensíveis</strong> relacionados à saúde, à saúde feminina, à vida íntima, hábitos e rotina.</p>
        <p>Também registramos dados técnicos mínimos de segurança (data de acesso, registros de ações importantes).</p>
      </S>
      <S title="3. Para que usamos">
        <p>Exclusivamente para preparar e realizar o seu atendimento em Yoga e Ayurveda, acompanhar seu histórico e organizar os atendimentos. Seus dados não são vendidos, compartilhados com terceiros para publicidade nem usados para decisões automatizadas.</p>
      </S>
      <S title="4. Base legal">
        <p>O tratamento dos dados sensíveis se apoia no seu <strong>consentimento específico e destacado</strong> (art. 11, I, da LGPD), registrado com data e versão desta política no momento do cadastro, e na tutela da saúde quando aplicável.</p>
      </S>
      <S title="5. Quem tem acesso">
        <p>Somente você (aos seus próprios dados) e a profissional responsável. A plataforma não envia e-mails ou SMS automáticos; todas as notificações ficam dentro da própria plataforma.</p>
      </S>
      <S title="6. Segurança">
        <p>Utilizamos conexão criptografada (HTTPS), senhas com hash seguro, controle de acesso por perfil, sessões com expiração, registros de auditoria, cópias de segurança e relatórios que nunca ficam disponíveis em endereços públicos.</p>
      </S>
      <S title="7. Por quanto tempo guardamos">
        <p>Enquanto houver relação de atendimento e pelo prazo necessário ao cumprimento de obrigações legais ou regulatórias. Após isso, os dados são eliminados ou anonimizados.</p>
      </S>
      <S title="8. Seus direitos">
        <p>Você pode, a qualquer momento: confirmar e acessar seus dados (há um botão de exportação na sua área), corrigir dados incompletos ou incorretos, solicitar a eliminação dos dados tratados com base no consentimento e revogar o consentimento. As solicitações podem ser feitas em <em>Minha conta → Privacidade e dados</em> e são respondidas pela profissional, respeitando obrigações legais de retenção.</p>
      </S>
      <S title="9. Alterações">
        <p>Se esta política mudar de forma relevante, você será avisada dentro da plataforma.</p>
      </S>
    </article>
  );
}
