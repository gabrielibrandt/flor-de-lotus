/**
 * Teste ponta a ponta (navegador real) dos fluxos principais.
 * Pré-requisitos: servidor rodando (npm run build && npm start), banco com perguntas e
 * dados de demonstração (npm run db:demo), Chrome instalado.
 * Uso: BASE_URL=http://localhost:3000 CHROME_PATH=/caminho/chrome node e2e/smoke.mjs
 */
import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import fs from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const SHOTS = process.env.SHOTS_DIR || "";
const ADMIN = { email: process.env.E2E_ADMIN_EMAIL || "profissional@demo.flordelotus.test", password: process.env.E2E_ADMIN_PASSWORD || "DemoLotus2026!" };
const results = [];
const step = async (name, fn) => {
  try { await fn(); results.push(["✓", name]); console.log("✓", name); }
  catch (e) { results.push(["✗", name]); console.error("✗", name, "\n   ", e.message.split("\n")[0]); process.exitCode = 1; }
};
const shot = async (page, name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }); } };

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const email = `e2e.${Date.now()}@exemplo.test`;
let anamnesisUrl = "";

// ------------------------------------------------------------------ Paciente
const pctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
pctx.setDefaultTimeout(10000);
const p = await pctx.newPage();

await step("landing page apresenta a Flor de Lótus e orientações", async () => {
  await p.goto(BASE);
  await p.getByText("Sua consulta começou!").waitFor();
  assert.ok(await p.getByText("Cerca de 30 minutos", { exact: true }).isVisible());
  assert.ok(await p.getByText("Até 48 horas antes", { exact: true }).isVisible());
  assert.ok(await p.getByRole("link", { name: "Acesso profissional" }).isVisible());
  await shot(p, "01-landing");
});

await step("cadastro valida campos e impede e-mail duplicado", async () => {
  await p.goto(`${BASE}/cadastro`);
  await p.getByRole("button", { name: "Criar minha conta" }).click();
  await p.getByText("Revise os campos destacados.").waitFor();
  await p.getByLabel("Nome completo").fill("Ana Teste E2E");
  await p.getByLabel("Como gosta de ser chamada").fill("Aninha");
  await p.getByLabel("E-mail").fill("helena@demo.flordelotus.test");
  await p.locator("#f-password").fill("senhaSegura1");
  await p.getByLabel("Confirmação de senha").fill("senhaSegura1");
  await p.locator("input[name=consent]").check();
  await p.getByRole("button", { name: "Criar minha conta" }).click();
  await p.getByText("Já existe uma conta com este e-mail", { exact: false }).first().waitFor();
});

await step("cadastro cria a conta e convida para a primeira anamnese", async () => {
  await p.getByLabel("E-mail").fill(email);
  await p.locator("#f-password").fill("senhaSegura1");
  await p.getByLabel("Confirmação de senha").fill("senhaSegura1");
  await p.locator("input[name=consent]").check();
  await p.getByRole("button", { name: "Criar minha conta" }).click();
  await p.waitForURL("**/paciente/boas-vindas");
  await p.getByText("Que bom ter você aqui, Aninha!").waitFor();
  await shot(p, "02-boas-vindas");
});

await step("paciente preenche parte, sai e continua depois (salvamento automático)", async () => {
  await p.getByRole("link", { name: "Começar agora" }).click();
  await p.waitForURL("**/paciente/anamneses/**");
  anamnesisUrl = p.url().split("?")[0];
  // Etapa 1: nome já pré-preenchido; preencher pergunta 2
  assert.equal(await p.locator("#q1-nomeCompleto").inputValue(), "Ana Teste E2E");
  await p.locator("#q2-dataNascimento").fill("1992-03-15");
  await p.locator("#q2-localNascimento").fill("Recife – PE");
  await p.locator("#q2-cidadeAtual").fill("Curitiba – PR");
  await p.locator("#q2-haQuantoTempo").fill("3 anos");
  await p.getByText(/Salvo às/).waitFor({ timeout: 10000 });
  await shot(p, "03-questionario-etapa1");
  await p.getByRole("button", { name: /Avançar/ }).click();
  await p.locator("#q3").fill("Sinto cansaço e inchaço há cerca de um ano.");
  await p.getByRole("button", { name: /Salvar e continuar depois/ }).click();
  await p.waitForURL(`${BASE}/paciente`);
  await p.getByRole("link", { name: "Continuar de onde parei" }).click();
  await p.waitForURL("**/paciente/anamneses/**");
  await p.getByRole("button", { name: /2\. Saúde e queixas/ }).click();
  assert.equal(await p.locator("#q3").inputValue(), "Sinto cansaço e inchaço há cerca de um ano.");
});

await step("paciente responde as 20 perguntas, revisa e confirma o envio", async () => {
  const byStep = {
    2: { 5: "Intolerância à lactose." }, 3: { 7: "Nunca gestei." }, 4: { 9: "Não.", 10: "Seguro o sono às vezes." },
    5: { 11: "Acordo às 7h.", 12: "Almoço às 12h30.", 13: "Janto às 20h." }, 6: { 14: "Durmo às 23h.", 15: "Funciona bem.", 16: "Yoga 2x por semana." },
    7: { 17: "Não gosto de jiló." },
  };
  const names = { 2: "Saúde e queixas", 3: "Saúde feminina", 4: "Hábitos", 5: "Rotina", 6: "Sono e corpo", 7: "Alimentação" };
  for (const [st, qs] of Object.entries(byStep)) {
    await p.getByRole("button", { name: new RegExp(`${st}\\. ${names[st]}`) }).click();
    await p.getByText(`Etapa ${st} de 8`).waitFor();
    for (const [n, t] of Object.entries(qs)) await p.locator(`#q${n}`).fill(t);
  }
  // escolhas e "Não se aplica"
  await p.getByRole("button", { name: /2\. Saúde e queixas/ }).click();
  await p.getByText("Etapa 2 de 8").waitFor();
  await p.locator("fieldset").filter({ hasText: "alopático" }).locator("label", { hasText: /^Não$/ }).click();
  await p.getByRole("button", { name: /3\. Saúde feminina/ }).click();
  await p.getByText("Etapa 3 de 8").waitFor();
  await p.locator("fieldset").filter({ hasText: "menarca" }).getByLabel("Prefiro não responder").check();
  await p.locator("fieldset").filter({ hasText: "DIU" }).locator("label", { hasText: /^Não$/ }).click();
  await shot(p, "04-questionario-feminina");
  await p.getByRole("button", { name: /7\. Alimentação/ }).click();
  await p.getByText("Etapa 7 de 8").waitFor();
  await p.locator("fieldset").filter({ hasText: "vegetariana por um curto" }).locator("label", { hasText: /^Sim$/ }).click();
  await p.getByRole("button", { name: /8\. Tratamento/ }).click();
  await p.getByText("Etapa 8 de 8").waitFor();
  for (const fs_ of await p.locator("fieldset").all()) await fs_.locator("label", { hasText: /^Sim$/ }).click();
  await p.getByRole("button", { name: /Revisar respostas/ }).click();
  await p.waitForURL("**/revisao");
  assert.equal(await p.getByText("Ainda faltam").count(), 0, "não deveria faltar resposta");
  await p.getByText("Prefiro não responder").first().waitFor();
  await shot(p, "05-revisao");
  await p.getByRole("button", { name: "Enviar anamnese" }).click();
  await p.getByRole("dialog").getByText("Tem certeza").waitFor();
  await p.getByRole("button", { name: "Sim, enviar agora" }).click();
  await p.waitForURL("**enviada=1**");
  await p.getByText("Anamnese enviada com sucesso").first().waitFor();
});

await step("anamnese enviada é registro fechado (sem edição direta)", async () => {
  await p.goto(anamnesisUrl);
  await p.getByText("Esta anamnese é um registro fechado").waitFor();
  assert.equal(await p.locator("#q3").count(), 0);
  await p.goto(`${anamnesisUrl}/revisao`);
  await p.waitForURL(anamnesisUrl);
  await shot(p, "06-anamnese-enviada");
});

await step("paciente solicita correção", async () => {
  await p.locator("#cr-msg").fill("Na pergunta 16, pratico yoga 3 vezes por semana.");
  await p.getByRole("button", { name: "Enviar solicitação" }).click();
  await p.getByText("Solicitação enviada à profissional").waitFor();
});

await step("paciente não acessa o painel administrativo nem dados de outra paciente", async () => {
  await p.goto(`${BASE}/admin`);
  await p.waitForURL(`${BASE}/paciente`);
  await p.goto(`${BASE}/admin/pacientes`);
  await p.waitForURL(`${BASE}/paciente`);
  const r = await p.request.get(`${BASE}/api/admin/relatorios/qualquer`);
  assert.equal(r.status(), 401);
  const other = await p.goto(`${BASE}/paciente/anamneses/id-de-outra-paciente`);
  assert.equal(other.status(), 404);
});

await step("notificações da paciente: contador e marcar como lidas", async () => {
  await p.goto(`${BASE}/paciente`);
  const badge = p.getByTestId("unread-count").first();
  await badge.waitFor();
  assert.ok(Number(await badge.innerText()) >= 2);
  await shot(p, "07-dashboard-paciente");
  await p.getByRole("button", { name: /Notificações/ }).first().click();
  await p.getByRole("button", { name: "Marcar todas como lidas" }).click();
  await p.waitForFunction(() => !document.querySelector('[data-testid="unread-count"]'));
});

await step("download do PDF pela paciente", async () => {
  const r = await p.request.get(`${anamnesisUrl.replace("/paciente/", "/api/paciente/")}/pdf`);
  assert.equal(r.status(), 200);
  assert.equal(r.headers()["content-type"], "application/pdf");
});

await step("logout encerra a sessão", async () => {
  await p.getByRole("button", { name: "Sair" }).click();
  await p.waitForURL("**/entrar");
  await p.goto(`${BASE}/paciente`);
  await p.waitForURL("**/entrar**");
});

// ------------------------------------------------------------------ Profissional
const actx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "pt-BR", timezoneId: "America/Sao_Paulo", acceptDownloads: true });
actx.setDefaultTimeout(10000);
const a = await actx.newPage();

await step("login de paciente na área profissional é recusado", async () => {
  await a.goto(`${BASE}/acesso-profissional`);
  await a.getByLabel("E-mail").fill(email);
  await a.getByLabel("Senha").fill("senhaSegura1");
  await a.getByRole("button", { name: "Entrar" }).click();
  await a.getByText("E-mail ou senha incorretos.").waitFor();
});

await step("profissional entra e vê o painel", async () => {
  await a.getByLabel("E-mail").fill(ADMIN.email);
  await a.getByLabel("Senha").fill(ADMIN.password);
  await a.getByRole("button", { name: "Entrar" }).click();
  await a.waitForURL(`${BASE}/admin`);
  await a.getByText("Pacientes cadastradas").waitFor();
  await shot(a, "10-admin-dashboard");
});

await step("nova paciente aparece automaticamente na listagem e na busca", async () => {
  await a.goto(`${BASE}/admin/pacientes?q=${encodeURIComponent("E2E")}`);
  await a.getByRole("link", { name: "Ana Teste E2E" }).waitFor();
  await shot(a, "11-admin-pacientes");
  await a.getByRole("link", { name: "Ana Teste E2E" }).click();
  await a.getByText("Histórico de anamneses").waitFor();
  await shot(a, "12-admin-ficha");
});

await step("profissional abre a anamnese, adiciona observação privada e marca como revisada", async () => {
  await a.getByRole("link", { name: "Abrir" }).first().click();
  await a.waitForURL("**/admin/anamneses/**");
  await a.getByText("Respostas por categoria").waitFor();
  await a.locator("#note").fill("OBS-PRIVADA-E2E: observar padrão de sono.");
  await a.getByRole("button", { name: "Salvar observação" }).click();
  await a.getByText("OBS-PRIVADA-E2E").first().waitFor();
  await a.getByRole("button", { name: "Marcar como revisada" }).click();
  await a.locator("span.badge", { hasText: "Revisada" }).first().waitFor();
  await shot(a, "13-admin-anamnese");
});

await step("profissional corrige uma resposta preservando o histórico", async () => {
  const art = a.locator("article").filter({ hasText: "16. Você pratica alguma atividade" });
  await art.getByText("Corrigir resposta").click();
  await art.locator("textarea[name=value]").fill("Yoga 3x por semana.");
  await art.locator("input[name=reason]").fill("Pedido da paciente");
  await art.getByRole("button", { name: "Salvar correção" }).click();
  await a.getByText("Resposta corrigida. A versão anterior foi preservada").waitFor();
  await art.getByText(/Histórico de alterações \(1\)/).click();
  await art.getByText("Yoga 2x por semana.").waitFor();
});

await step("relatórios completo e resumido sem observações privadas; PDF gerado", async () => {
  const id = a.url().split("/admin/anamneses/")[1].split(/[?#]/)[0];
  await a.goto(`${BASE}/admin/anamneses/${id}/relatorio?tipo=completo`);
  await a.getByText("Relatório completo da anamnese").waitFor();
  assert.equal(await a.getByText("OBS-PRIVADA-E2E").count(), 0);
  assert.ok(await a.getByText("Qual seu nome completo e como você gosta de ser chamada?").isVisible());
  await shot(a, "14-relatorio-completo");
  await a.goto(`${BASE}/admin/anamneses/${id}/relatorio?tipo=resumido`);
  await a.getByText("Abertura para tratamentos").first().waitFor();
  await shot(a, "15-relatorio-resumido");
  const dl = a.waitForEvent("download");
  await a.getByRole("button", { name: "Gerar PDF resumido" }).click();
  const d = await dl;
  const path = await d.path();
  assert.ok(fs.readFileSync(path).subarray(0, 4).toString() === "%PDF");
  if (SHOTS) fs.copyFileSync(path, `${SHOTS}/relatorio-resumido.pdf`);
});

await step("liberação de nova anamnese com prazo de 48h", async () => {
  await a.goto(`${BASE}/admin/liberar`);
  await a.getByLabel(/1\. Paciente/).selectOption({ label: "Ana Teste E2E" });
  await a.getByLabel(/2\. Data da consulta/).fill("2026-11-20");
  await a.getByLabel(/3\. Horário/).fill("14:00");
  await a.getByText("18/11/2026 às 14h00").waitFor();
  await shot(a, "16-liberar");
  await a.getByRole("button", { name: /Confirmar liberação/ }).click();
  await a.getByRole("button", { name: "Liberar anamnese" }).click();
  await a.waitForURL("**liberada=1");
  await a.getByText("Anamnese liberada.").waitFor();
  await a.getByText("18/11/2026 às 14h00").first().waitFor();
});

await step("agenda: visões dia, semana e mês e cadastro de compromisso", async () => {
  await a.goto(`${BASE}/admin/agenda/novo?data=2026-11-25`);
  await a.getByLabel("Título").fill("Retorno E2E");
  await a.getByLabel("Horário").fill("09:15");
  await a.getByLabel("Paciente (opcional)").selectOption({ label: "Ana Teste E2E" });
  await a.getByRole("button", { name: "Salvar compromisso" }).click();
  await a.waitForURL("**vista=dia**");
  await a.getByText("Retorno E2E").waitFor();
  await shot(a, "17-agenda-dia");
  await a.goto(`${BASE}/admin/agenda?vista=semana&data=2026-11-25`);
  await a.getByText(/Ana|Retorno/).first().waitFor();
  await shot(a, "18-agenda-semana");
  await a.goto(`${BASE}/admin/agenda?vista=mes&data=2026-11-25`);
  await a.getByText("09:15", { exact: false }).first().waitFor();
  await shot(a, "19-agenda-mes");
  await a.getByText("09:15", { exact: false }).first().click();
  await a.getByRole("button", { name: "Marcar como realizado" }).click();
  await a.getByText("Realizado").first().waitFor();
});

await step("profissional recebe notificações de nova paciente e envio", async () => {
  await a.goto(`${BASE}/admin/notificacoes`);
  await a.getByText("Ana Teste E2E (Aninha) criou uma conta.").waitFor();
  await a.getByText("Ana Teste E2E enviou a anamnese nº 1.").waitFor();
  await a.getByText("Solicitação de correção").first().waitFor();
});

await step("versão mobile da área da paciente", async () => {
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "pt-BR" });
  const mp = await m.newPage();
  await mp.goto(`${BASE}/entrar`);
  await mp.getByLabel("E-mail").fill("marina@demo.flordelotus.test");
  await mp.getByLabel("Senha").fill("paciente123");
  await mp.getByRole("button", { name: "Entrar" }).click();
  await mp.waitForURL(`${BASE}/paciente`);
  await shot(mp, "20-mobile-dashboard");
  await mp.getByRole("link", { name: "Continuar de onde parei" }).click();
  await mp.getByText("Etapa 1 de 8").waitFor();
  await shot(mp, "21-mobile-questionario");
  await mp.goto(`${BASE}/`);
  await shot(mp, "22-mobile-landing");
  await m.close();
});

await browser.close();
console.log(`\n${results.filter((r) => r[0] === "✓").length}/${results.length} fluxos aprovados.`);
