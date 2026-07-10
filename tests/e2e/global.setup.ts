import { test as setup } from '@playwright/test';
import { login } from './helpers/login';
import { Selectors } from './helpers/selectors';
import { SEED_DATA } from './helpers/seed';
import { cleanupE2EData } from './helpers/cleanup';
import * as fs from 'fs';
import * as path from 'path';

setup('Seeding and authenticating users', async ({ browser }) => {
  // 1. Validar variáveis de ambiente do .env
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Sessão E2E inválida ou login não concluído - Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes.');
  }

  // Limpar flag de aborto anterior se existir
  const flagPath = path.join(process.cwd(), 'tests', 'e2e', '.auth', 'auth-failed.flag');
  if (fs.existsSync(flagPath)) {
    try {
      fs.unlinkSync(flagPath);
    } catch (e) {
      console.warn('Erro ao limpar flag de autenticação:', e);
    }
  }

  console.log('Iniciando limpeza de dados antigos do E2E...');
  // Clean up any old E2E data first
  await cleanupE2EData();

  // 2. Garantir que o diretório de autenticação existe
  const authDir = path.join(process.cwd(), 'tests', 'e2e', '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // === 1. LOGIN DONO & SEEDING ===
  console.log('Autenticando Dono...');
  const donoContext = await browser.newContext({ viewport: null });
  const donoPage = await donoContext.newPage();
  
  await login(donoPage, SEED_DATA.owner.email, SEED_DATA.owner.password);
  await donoPage.waitForURL('**/dashboard');
  
  // Esperar o cookie ser gravado e salvar o estado de autenticação
  await donoPage.waitForTimeout(2000);
  await donoContext.storageState({ path: path.join(authDir, 'dono.json') });

  // Garantir que a Filial existe no sistema (Multi-loja)
  console.log('Acessando aba Multi-lojas...');
  await donoPage.click(Selectors.sidebar.multilojas);
  await donoPage.waitForURL('**/dashboard/multilojas');
  
  const filiaisTab = donoPage.locator('button:has-text("Filiais (CRUD)")');
  if (await filiaisTab.isVisible()) {
    await filiaisTab.click();
  }

  const filialExistente = donoPage.locator('td:has-text("Loja Filial Centro")').or(donoPage.locator('div:has-text("Loja Filial Centro")')).first();
  const existeFilial = await filialExistente.isVisible();

  if (!existeFilial) {
    console.log('Criando filial de teste "Loja Filial Centro"...');
    await donoPage.click('button:has-text("Nova Filial")');
    await donoPage.fill('input[placeholder*="Ex: Filial Centro"]', 'Loja Filial Centro');
    await donoPage.fill('input[placeholder*="Ex: filial-centro"]', 'loja-filial-centro');
    await donoPage.fill('input[placeholder*="Ex: Cód Interno"]', 'loja-filial-centro');
    await donoPage.fill('input[placeholder*="Ex: João Silva"]', 'Gerente Teste');
    await donoPage.fill('input[placeholder*="Ex: São Paulo"]', 'Cidade Teste');
    await donoPage.fill('input[placeholder*="Ex: (11)"]', '11999999999');
    await donoPage.click('button:has-text("Salvar Filial")');
    await donoPage.waitForTimeout(2000);
  }

  // Garantir que os colaboradores / usuários operacionais existem
  console.log('Acessando aba Usuários...');
  await donoPage.click(Selectors.sidebar.usuarios);
  await donoPage.waitForURL('**/dashboard/usuarios');

  const colaboradores = [
    { nome: SEED_DATA.users.gerente.nome, email: SEED_DATA.users.gerente.email, cargo: SEED_DATA.users.gerente.cargo },
    { nome: SEED_DATA.users.caixa.nome, email: SEED_DATA.users.caixa.email, cargo: SEED_DATA.users.caixa.cargo },
    { nome: SEED_DATA.users.estoquista.nome, email: SEED_DATA.users.estoquista.email, cargo: SEED_DATA.users.estoquista.cargo },
    { nome: SEED_DATA.users.financeiro.nome, email: SEED_DATA.users.financeiro.email, cargo: SEED_DATA.users.financeiro.cargo }
  ];

  for (const colab of colaboradores) {
    const colabExistente = donoPage.locator(`td:has-text("${colab.email}")`).first();
    const existe = await colabExistente.isVisible();
    if (!existe) {
      console.log(`Criando colaborador operacional: ${colab.nome} (${colab.cargo})...`);
      await donoPage.click('button:has-text("Adicionar Colaborador")');
      await donoPage.fill('input[placeholder*="Ex: João Silva"]', colab.nome);
      await donoPage.fill('input[placeholder*="Ex: joao@email.com"]', colab.email);
      await donoPage.fill('input[placeholder*="Ex: (11)"]', '11999999999');
      await donoPage.fill('input[type="password"]', '17269405');
      
      const cargoSelect = donoPage.locator('select').first();
      await cargoSelect.selectOption(colab.cargo);

      const filialSelect = donoPage.locator('select').nth(1);
      await filialSelect.selectOption({ label: 'Loja Filial Centro' });

      await donoPage.click('button[type="submit"]:has-text("Cadastrar")');
      await donoPage.waitForTimeout(1500);
    }
  }

  // Fecha o contexto do dono (sem dar logout no Supabase!)
  await donoContext.close();

  // === 2. LOGIN CAIXA ===
  console.log('Autenticando Caixa...');
  const caixaContext = await browser.newContext({ viewport: null });
  const caixaPage = await caixaContext.newPage();
  await login(caixaPage, SEED_DATA.users.caixa.email, SEED_DATA.users.caixa.password);
  await caixaPage.waitForURL('**/dashboard');
  await caixaPage.waitForTimeout(2000);
  await caixaContext.storageState({ path: path.join(authDir, 'caixa.json') });
  await caixaContext.close();

  // === 3. LOGIN ESTOQUISTA ===
  console.log('Autenticando Estoquista...');
  const estoqContext = await browser.newContext({ viewport: null });
  const estoqPage = await estoqContext.newPage();
  await login(estoqPage, SEED_DATA.users.estoquista.email, SEED_DATA.users.estoquista.password);
  await estoqPage.waitForURL('**/dashboard');
  await estoqPage.waitForTimeout(2000);
  await estoqContext.storageState({ path: path.join(authDir, 'estoquista.json') });
  await estoqContext.close();

  // === 4. LOGIN GERENTE ===
  console.log('Autenticando Gerente...');
  const gerenteContext = await browser.newContext({ viewport: null });
  const gerentePage = await gerenteContext.newPage();
  await login(gerentePage, SEED_DATA.users.gerente.email, SEED_DATA.users.gerente.password);
  await gerentePage.waitForURL('**/dashboard');
  await gerentePage.waitForTimeout(2000);
  await gerenteContext.storageState({ path: path.join(authDir, 'gerente.json') });
  await gerenteContext.close();

  // === 5. LOGIN FINANCEIRO ===
  console.log('Autenticando Financeiro...');
  const finContext = await browser.newContext({ viewport: null });
  const finPage = await finContext.newPage();
  await login(finPage, SEED_DATA.users.financeiro.email, SEED_DATA.users.financeiro.password);
  await finPage.waitForURL('**/dashboard');
  await finPage.waitForTimeout(2000);
  await finContext.storageState({ path: path.join(authDir, 'financeiro.json') });
  await finContext.close();

  console.log('Todos os 5 estados de autenticação gerados com sucesso!');
});
