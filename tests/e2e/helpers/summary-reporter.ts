import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

interface TestEntry {
  title: string;
  file: string;
  project: string;
  status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
  duration: number;
  error?: string;
  isLoginFailure?: boolean;
  videoPath?: string;
  screenshotPath?: string;
  tracePath?: string;
}

class SummaryReporter implements Reporter {
  private results: TestEntry[] = [];
  private startTime = 0;
  private outputDir = '';

  onBegin(config: FullConfig, suite: Suite) {
    this.startTime = Date.now();
    this.outputDir = config.projects[0]?.outputDir || 'test-results';
    console.log(`\n🚀 ShopMind E2E — Iniciando ${suite.allTests().length} testes...\n`);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const entry: TestEntry = {
      title: test.title,
      file: path.basename(test.location.file),
      project: test.parent?.project()?.name || 'default',
      status: result.status,
      duration: result.duration,
    };

    if (result.error) {
      entry.error = result.error.message || 'Erro desconhecido';
      const isLogin = result.error.message?.includes('Sessão E2E inválida') || 
                      result.error.message?.includes('login não concluído') ||
                      result.error.message?.includes('/login') ||
                      result.error.message?.includes('locator(\'aside\')');
      
      entry.isLoginFailure = isLogin;
      if (isLogin) {
        entry.title = `⚠️ [FALHA DE LOGIN / SESSÃO] ${entry.title}`;
      }
    }

    // Collect attachment paths
    for (const attachment of result.attachments) {
      if (attachment.name === 'video' && attachment.path) {
        entry.videoPath = attachment.path;
      }
      if (attachment.name === 'screenshot' && attachment.path) {
        entry.screenshotPath = attachment.path;
      }
      if (attachment.name === 'trace' && attachment.path) {
        entry.tracePath = attachment.path;
      }
    }

    const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
    console.log(`  ${icon} [${entry.project}] ${entry.file} → ${entry.title} (${(entry.duration / 1000).toFixed(1)}s)`);

    this.results.push(entry);
  }

  onEnd(result: FullResult) {
    const totalTime = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const passed = this.results.filter(r => r.status === 'passed');
    const failed = this.results.filter(r => r.status === 'failed' || r.status === 'timedOut');
    const skipped = this.results.filter(r => r.status === 'skipped');

    // Ensure output directories exist
    const dirs = [
      'test-results/reports',
      'test-results/videos',
      'test-results/screenshots',
      'test-results/traces',
      'test-results/logs',
    ];
    for (const dir of dirs) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Copy artifacts to organized folders
    for (const entry of this.results) {
      try {
        if (entry.videoPath && fs.existsSync(entry.videoPath)) {
          const dest = path.join('test-results/videos', `${entry.file.replace('.spec.ts', '')}-${entry.status}-${Date.now()}.webm`);
          fs.copyFileSync(entry.videoPath, dest);
          entry.videoPath = dest;
        }
        if (entry.screenshotPath && fs.existsSync(entry.screenshotPath)) {
          const dest = path.join('test-results/screenshots', `${entry.file.replace('.spec.ts', '')}-${entry.status}-${Date.now()}.png`);
          fs.copyFileSync(entry.screenshotPath, dest);
          entry.screenshotPath = dest;
        }
        if (entry.tracePath && fs.existsSync(entry.tracePath)) {
          const dest = path.join('test-results/traces', `${entry.file.replace('.spec.ts', '')}-trace-${Date.now()}.zip`);
          fs.copyFileSync(entry.tracePath, dest);
          entry.tracePath = dest;
        }
      } catch {
        // Ignore copy errors
      }
    }

    // Collect unique modules tested
    const modules = [...new Set(this.results.map(r => {
      const name = r.file.replace(/^\d+-/, '').replace('.spec.ts', '');
      return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ');
    }))];

    // Build summary.md
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    let md = `# 📊 ShopMind — Relatório de Homologação E2E\n\n`;
    md += `> Gerado automaticamente em **${now}**\n\n`;
    md += `---\n\n`;
    md += `## Resumo Geral\n\n`;
    md += `| Métrica | Valor |\n`;
    md += `|---------|-------|\n`;
    md += `| Total de testes | **${this.results.length}** |\n`;
    md += `| ✅ Aprovados | **${passed.length}** |\n`;
    md += `| ❌ Reprovados | **${failed.length}** |\n`;
    md += `| ⏭️ Ignorados | **${skipped.length}** |\n`;
    md += `| ⏱️ Tempo total | **${totalTime}s** |\n`;
    md += `| 📦 Módulos testados | **${modules.length}** |\n`;
    md += `| Status final | **${result.status === 'passed' ? '✅ APROVADO' : '❌ REPROVADO'}** |\n\n`;

    md += `## Módulos Testados\n\n`;
    for (const mod of modules) {
      md += `- ${mod}\n`;
    }
    md += `\n`;

    // Passed tests
    if (passed.length > 0) {
      md += `## ✅ Testes Aprovados (${passed.length})\n\n`;
      md += `| # | Spec | Teste | Projeto | Tempo | Vídeo |\n`;
      md += `|---|------|-------|---------|-------|-------|\n`;
      passed.forEach((t, i) => {
        const video = t.videoPath ? `[🎬 vídeo](${t.videoPath.replace(/\\/g, '/')})` : '-';
        md += `| ${i + 1} | \`${t.file}\` | ${t.title} | ${t.project} | ${(t.duration / 1000).toFixed(1)}s | ${video} |\n`;
      });
      md += `\n`;
    }

    // Failed tests
    if (failed.length > 0) {
      md += `## ❌ Testes Reprovados (${failed.length})\n\n`;
      for (const t of failed) {
        md += `### 🔴 ${t.title}\n\n`;
        md += `| Campo | Detalhe |\n`;
        md += `|-------|---------|\n`;
        md += `| **Spec Afetada** | \`${t.file}\` |\n`;
        md += `| **Projeto** | ${t.project} |\n`;
        md += `| **Tempo** | ${(t.duration / 1000).toFixed(1)}s |\n`;
        md += `| **Causa da Falha** | ${t.isLoginFailure ? '⚠️ FALHA CRÍTICA DE AUTENTICAÇÃO / LOGIN' : '⚙️ Erro de execução ou asserção falhada'} |\n`;
        
        if (t.videoPath) {
          md += `| **🎬 Vídeo** | [Abrir vídeo](../../${t.videoPath.replace(/\\/g, '/')}) |\n`;
        }
        if (t.screenshotPath) {
          md += `| **📸 Screenshot** | [Ver screenshot](../../${t.screenshotPath.replace(/\\/g, '/')}) |\n`;
        }
        if (t.tracePath) {
          md += `| **🔍 Trace** | [Abrir trace](../../${t.tracePath.replace(/\\/g, '/')}) — \`npx playwright show-trace ${t.tracePath}\` |\n`;
        }

        if (t.error) {
          md += `\n**Erro principal / Causa da falha:**\n\`\`\`\n${t.error.trim()}\n\`\`\`\n\n`;
        }
        md += `---\n\n`;
      }
    }

    md += `## 📂 Onde encontrar os arquivos\n\n`;
    md += `| Tipo | Caminho |\n`;
    md += `|------|---------|\n`;
    md += `| 📄 Relatório HTML | \`playwright-report/\` |\n`;
    md += `| 🎬 Vídeos | \`test-results/videos/\` |\n`;
    md += `| 📸 Screenshots | \`test-results/screenshots/\` |\n`;
    md += `| 🔍 Traces | \`test-results/traces/\` |\n`;
    md += `| 📝 Logs | \`test-results/logs/\` |\n`;
    md += `| 📊 Este relatório | \`test-results/reports/summary.md\` |\n\n`;

    md += `## Comandos Úteis\n\n`;
    md += `\`\`\`bash\n`;
    md += `# Abrir relatório HTML interativo\n`;
    md += `npm run test:e2e:report\n\n`;
    md += `# Reproduzir um trace específico\n`;
    md += `npx playwright show-trace test-results/traces/<arquivo>-trace.zip\n\n`;
    md += `# Re-executar apenas testes que falharam\n`;
    md += `npx playwright test --last-failed\n`;
    md += `\`\`\`\n`;

    // Write summary
    const summaryPath = path.join('test-results', 'reports', 'summary.md');
    fs.writeFileSync(summaryPath, md, 'utf-8');

    // Write log
    const logPath = path.join('test-results', 'logs', `run-${Date.now()}.log`);
    const logContent = this.results.map(r => 
      `[${r.status.toUpperCase()}] [${r.project}] ${r.file} — ${r.title} (${(r.duration / 1000).toFixed(1)}s)${r.error ? ` | ERRO: ${r.error.substring(0, 150)}` : ''}`
    ).join('\n');
    fs.writeFileSync(logPath, logContent, 'utf-8');

    // Console summary
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  📊 RELATÓRIO FINAL — ShopMind E2E`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`  ✅ Aprovados:  ${passed.length}`);
    console.log(`  ❌ Reprovados: ${failed.length}`);
    console.log(`  ⏭️  Ignorados:  ${skipped.length}`);
    console.log(`  ⏱️  Tempo:      ${totalTime}s`);
    console.log(`  📦 Módulos:    ${modules.length}`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`  📄 Relatório: test-results/reports/summary.md`);
    console.log(`  📂 Vídeos:    test-results/videos/`);
    console.log(`  📸 Prints:    test-results/screenshots/`);
    console.log(`  🔍 Traces:    test-results/traces/`);
    console.log(`${'═'.repeat(60)}\n`);
  }
}

export default SummaryReporter;
