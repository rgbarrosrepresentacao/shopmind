# 🧪 ShopMind — Suíte de Testes E2E (Playwright)

Suíte completa de homologação automatizada do ShopMind ERP.  
Simula uma operação real de loja, validando todos os módulos de ponta a ponta.

---

## 🚀 Como Executar

### Modo Headless (segundo plano)
```bash
npm run test:e2e
```

### Modo Visual (navegador aberto)
```bash
npm run test:e2e:headed
```

### Modo Visual Lento (500ms entre ações)
```bash
npm run test:e2e:slow
```

### Modo Visual Lento — Apenas Críticos
```bash
npm run test:e2e:slow:critical
```

### Modo Debug (DevTools aberto)
```bash
npm run test:e2e:debug
```

### Modo UI Interativo
```bash
npm run test:e2e:ui
```

---

## 📊 Relatórios

### Abrir relatório HTML interativo
```bash
npm run test:e2e:report
```

### Relatório resumo em markdown
Gerado automaticamente após cada execução:
```
test-results/reports/summary.md
```

---

## 📂 Onde Ficam os Arquivos

| Tipo | Caminho |
|------|---------|
| 📄 Relatório HTML | `playwright-report/` |
| 📊 Resumo Markdown | `test-results/reports/summary.md` |
| 🎬 Vídeos | `test-results/videos/` |
| 📸 Screenshots | `test-results/screenshots/` |
| 🔍 Traces | `test-results/traces/` |
| 📝 Logs | `test-results/logs/` |

---

## 🔍 Como Reproduzir um Trace

```bash
npx playwright show-trace test-results/traces/<nome>-trace.zip
```

---

## 🎯 Como Rodar um Teste Específico

```bash
# Por arquivo
npx playwright test tests/e2e/06-pdv-caixa.spec.ts

# Por nome do teste
npx playwright test -g "Deve abrir o caixa"

# Por projeto
npx playwright test --project=critical
npx playwright test --project=full
```

---

## 🔄 Re-executar Testes que Falharam

```bash
npx playwright test --last-failed
```

---

## 📋 Módulos Testados

| # | Módulo | Spec |
|---|--------|------|
| 01 | Autenticação | `01-auth.spec.ts` |
| 02 | Multi-Lojas | `02-multilojas.spec.ts` |
| 03 | Usuários/RBAC | `03-usuarios.spec.ts` |
| 04 | Produto Mestre | `04-produto-mestre.spec.ts` |
| 05 | Clientes/Fidelidade | `05-cliente.spec.ts` |
| 06 | PDV/Caixa | `06-pdv-caixa.spec.ts` |
| 07 | Pagamento Múltiplo | `07-pdv-pagamento-multiplo.spec.ts` |
| 08 | Estoque | `08-estoque.spec.ts` |
| 09 | Transferências | `09-transferencias.spec.ts` |
| 10 | Compras | `10-compras.spec.ts` |
| 11 | Fiscal/XML/Lotes | `11-fiscal-xml-lotes.spec.ts` |
| 12 | Financeiro | `12-financeiro.spec.ts` |
| 13 | Centro de Comando CEO | `13-centro-comando.spec.ts` |
| 14 | IA Gerente | `14-ia.spec.ts` |
| 15 | RBAC/Segurança | `15-rbac-seguranca.spec.ts` |
| 16 | Relatórios/Exportações | `16-relatorios-exportacoes.spec.ts` |
| 17 | Regressão Geral | `17-regressao-geral.spec.ts` |

---

## ⚙️ Comportamento em Caso de Falha

Quando executado em modo **headed** (`--headed` ou `--slow-mo`):

1. O navegador **para exatamente no erro**
2. O DevTools abre com `page.pause()`
3. Você pode inspecionar o estado da página manualmente
4. Pressione "Resume" no DevTools para continuar
5. Screenshot, vídeo e trace são salvos automaticamente

---

## 🏗️ Estrutura

```
tests/e2e/
├── .auth/                    # Estados de autenticação salvos
│   ├── dono.json
│   ├── caixa.json
│   ├── estoquista.json
│   └── gerente.json
├── helpers/
│   ├── custom-test.ts        # Fixture com pause-on-failure
│   ├── login.ts              # Helpers de login/logout
│   ├── seed-data.ts          # Dados de seed para testes
│   ├── selectors.ts          # Seletores centralizados
│   └── summary-reporter.ts   # Reporter customizado
├── 01-auth.spec.ts
├── ...
├── 17-regressao-geral.spec.ts
├── global.setup.ts           # Setup global (seed + auth)
└── README.md                 # Este arquivo
```
