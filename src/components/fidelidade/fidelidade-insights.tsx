"use client";

import * as React from "react";
import { Sparkles, Brain, Lightbulb } from "lucide-react";

interface FidelidadeInsightsProps {
  insights: string[];
  loading: boolean;
}

export const FidelidadeInsights: React.FC<FidelidadeInsightsProps> = ({ insights, loading }) => {
  return (
    <div className="bg-gradient-to-br from-violet-600/5 to-indigo-600/5 border border-violet-600/15 rounded-2xl p-5 space-y-4 select-none">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-violet-600/10 text-violet-600 flex items-center justify-center shadow-sm">
          <Brain className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-violet-700 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 fill-violet-600 text-violet-600" /> Insights Automáticos Locais (Grátis)
          </h4>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Dicas inteligentes de retenção baseadas no comportamento dos seus clientes da loja.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 py-2">
          <div className="h-6 bg-violet-200/20 animate-pulse rounded-lg" />
          <div className="h-6 bg-violet-200/20 animate-pulse rounded-lg" />
        </div>
      ) : (
        <div className="space-y-2">
          {insights.map((insight, idx) => (
            <div 
              key={idx} 
              className="flex items-start gap-3 bg-white/60 border border-violet-600/5 hover:border-violet-600/15 hover:bg-white/95 rounded-xl p-3.5 transition-all duration-300 shadow-sm leading-relaxed text-xs text-slate-700 font-semibold"
            >
              <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div dangerouslySetInnerHTML={{ 
                __html: insight
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="text-violet-700 font-extrabold">$1</strong>') 
              }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
