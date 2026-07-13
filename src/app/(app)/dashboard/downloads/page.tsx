'use client';

import * as React from 'react';
import { Laptop, Download, FileCode, CheckCircle, Info, ChevronRight, Monitor, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';

export default function DownloadsPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center animate-fade-in">
      <div className="max-w-4xl w-full space-y-8">
        
        {/* Header Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-2xl mb-2">
            <Laptop className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            ShopMind PDV <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Desktop</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Instale o ShopMind diretamente no seu computador com Windows e desfrute de maior desempenho, velocidade e estabilidade para gerenciar o seu ponto de venda.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Card 1: Setup EXE */}
          <div className="bg-card/50 border border-border/80 rounded-2xl p-6 flex flex-col justify-between hover:border-violet-500/30 hover:bg-card/80 transition-all duration-300 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-violet-400 group-hover:scale-110 transition-transform duration-300">
              <Cpu size={120} />
            </div>
            
            <div className="space-y-4 relative z-10">
              <div className="inline-flex p-2.5 bg-violet-500/10 text-violet-400 rounded-xl">
                <Monitor className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Instalador Completo (.exe)</h3>
                <p className="text-xs text-muted-foreground mt-1">Recomendado para a maioria dos computadores.</p>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Instalação rápida e automática no perfil do usuário atual com criação de atalho na Área de Trabalho e suporte a atualizações integradas.
              </p>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 bg-muted/30 p-2 rounded-lg">
                <Info size={12} className="text-violet-400 shrink-0" />
                <span>Compatível com Windows 10 e Windows 11 (64-bit).</span>
              </div>
            </div>
            
            <div className="mt-8 pt-4 border-t border-border/40 relative z-10">
              <a
                href="/downloads/ShopMind PDV_1.0.0_x64-setup.exe"
                download
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-violet-600/20 transition-all cursor-pointer"
              >
                <Download size={14} />
                <span>Baixar Instalador Setup (.exe)</span>
              </a>
              <div className="text-center text-[10px] text-muted-foreground mt-2">
                Tamanho: ~2.0 MB • Versão 1.0.0 (x64)
              </div>
            </div>
          </div>

          {/* Card 2: Setup MSI */}
          <div className="bg-card/50 border border-border/80 rounded-2xl p-6 flex flex-col justify-between hover:border-indigo-500/30 hover:bg-card/80 transition-all duration-300 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-indigo-400 group-hover:scale-110 transition-transform duration-300">
              <FileCode size={120} />
            </div>

            <div className="space-y-4 relative z-10">
              <div className="inline-flex p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Pacote Corporativo (.msi)</h3>
                <p className="text-xs text-muted-foreground mt-1">Ideal para redes e instalações em lote.</p>
              </div>
              <p className="text-xs text-slate-350 leading-relaxed">
                Facilita a implantação silenciosa ou automatizada por administradores de sistema em redes corporativas com suporte a múltiplos perfis locais.
              </p>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 bg-muted/30 p-2 rounded-lg">
                <Info size={12} className="text-indigo-400 shrink-0" />
                <span>Perfeito para implantação via GPO no Active Directory.</span>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-border/40 relative z-10">
              <a
                href="/downloads/ShopMind PDV_1.0.0_x64_en-US.msi"
                download
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Download size={14} />
                <span>Baixar Instalador MSI (.msi)</span>
              </a>
              <div className="text-center text-[10px] text-muted-foreground mt-2">
                Tamanho: ~3.0 MB • Versão 1.0.0 (x64)
              </div>
            </div>
          </div>

        </div>

        {/* Quick Guide Block */}
        <div className="bg-card/30 border border-border/50 rounded-2xl p-6 space-y-4 shadow-md">
          <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-violet-400" />
            <span>Guia Rápido de Instalação</span>
          </h3>
          <div className="grid sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <div className="font-bold text-violet-400 flex items-center gap-1.5">
                <span>01. Baixar</span>
                <ArrowRight size={10} className="hidden sm:inline" />
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Escolha o formato e clique no botão de download. Salve o instalador no seu computador.
              </p>
            </div>
            <div className="space-y-1">
              <div className="font-bold text-violet-400 flex items-center gap-1.5">
                <span>02. Executar</span>
                <ArrowRight size={10} className="hidden sm:inline" />
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Dê duplo clique no arquivo baixado e siga as instruções simples na tela do Windows.
              </p>
            </div>
            <div className="space-y-1">
              <div className="font-bold text-violet-400">
                <span>03. Operar</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Um atalho será criado no seu Desktop. Abra e faça login com seu e-mail e senha para começar!
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
