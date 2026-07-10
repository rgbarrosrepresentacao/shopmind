# 📊 ShopMind — Relatório de Homologação E2E

> Gerado automaticamente em **01/07/2026, 19:12:10**

---

## Resumo Geral

| Métrica | Valor |
|---------|-------|
| Total de testes | **2** |
| ✅ Aprovados | **0** |
| ❌ Reprovados | **2** |
| ⏭️ Ignorados | **0** |
| ⏱️ Tempo total | **106.0s** |
| 📦 Módulos testados | **1** |
| Status final | **❌ REPROVADO** |

## Módulos Testados

- Global.setup.ts

## ❌ Testes Reprovados (2)

### 🔴 ⚠️ [FALHA DE LOGIN / SESSÃO] Seeding and authenticating users

| Campo | Detalhe |
|-------|---------|
| **Spec Afetada** | `global.setup.ts` |
| **Projeto** | setup |
| **Tempo** | 51.2s |
| **Causa da Falha** | ⚠️ FALHA CRÍTICA DE AUTENTICAÇÃO / LOGIN |
| **📸 Screenshot** | [Ver screenshot](../../test-results/screenshots/global.setup.ts-failed-1782943930489.png) |
| **🔍 Trace** | [Abrir trace](../../test-results/traces/global.setup.ts-trace-1782943930490.zip) — `npx playwright show-trace test-results\traces\global.setup.ts-trace-1782943930490.zip` |

**Erro principal / Causa da falha:**
```
Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

Locator: locator('aside')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
[2m  - Expect "toBeVisible" with timeout 5000ms[22m
[2m  - waiting for locator('aside')[22m
```

---

### 🔴 ⚠️ [FALHA DE LOGIN / SESSÃO] Seeding and authenticating users

| Campo | Detalhe |
|-------|---------|
| **Spec Afetada** | `global.setup.ts` |
| **Projeto** | setup |
| **Tempo** | 49.5s |
| **Causa da Falha** | ⚠️ FALHA CRÍTICA DE AUTENTICAÇÃO / LOGIN |
| **📸 Screenshot** | [Ver screenshot](../../test-results/screenshots/global.setup.ts-failed-1782943930492.png) |
| **🔍 Trace** | [Abrir trace](../../test-results/traces/global.setup.ts-trace-1782943930494.zip) — `npx playwright show-trace test-results\traces\global.setup.ts-trace-1782943930494.zip` |

**Erro principal / Causa da falha:**
```
Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

Locator: locator('aside')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
[2m  - Expect "toBeVisible" with timeout 5000ms[22m
[2m  - waiting for locator('aside')[22m
```

---

## 📂 Onde encontrar os arquivos

| Tipo | Caminho |
|------|---------|
| 📄 Relatório HTML | `playwright-report/` |
| 🎬 Vídeos | `test-results/videos/` |
| 📸 Screenshots | `test-results/screenshots/` |
| 🔍 Traces | `test-results/traces/` |
| 📝 Logs | `test-results/logs/` |
| 📊 Este relatório | `test-results/reports/summary.md` |

## Comandos Úteis

```bash
# Abrir relatório HTML interativo
npm run test:e2e:report

# Reproduzir um trace específico
npx playwright show-trace test-results/traces/<arquivo>-trace.zip

# Re-executar apenas testes que falharam
npx playwright test --last-failed
```
