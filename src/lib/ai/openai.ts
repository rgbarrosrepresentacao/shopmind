// ============================================
// SHOPMIND — CLIENTE DE IA DA OPENAI (REST VIA FETCH)
// ============================================

import crypto from "crypto";

export interface OpenAIResponse {
  content: string;
  tokensEntrada: number;
  tokensSaida: number;
  tokensTotal: number;
  custoEstimado: number;
  modelo: string;
  error?: string;
}

/**
 * Retorna o preço unitário por token (em USD) para fins de estimativa administrativa.
 * Suporta múltiplos modelos configurados no ShopMind.
 */
function getModelPricing(model: string): { inputPrice: number; outputPrice: number } {
  const m = model.toLowerCase();
  
  if (m.includes("gpt-4o-mini")) {
    return {
      inputPrice: 0.15 / 1000000,  // $0.150 por 1M tokens
      outputPrice: 0.60 / 1000000, // $0.600 por 1M tokens
    };
  }
  
  if (m.includes("gpt-4o") && !m.includes("mini")) {
    return {
      inputPrice: 5.00 / 1000000,  // $5.000 por 1M tokens
      outputPrice: 15.00 / 1000000, // $15.000 por 1M tokens
    };
  }
  
  if (m.includes("gpt-3.5-turbo")) {
    return {
      inputPrice: 0.50 / 1000000,  // $0.500 por 1M tokens
      outputPrice: 1.50 / 1000000, // $1.500 por 1M tokens
    };
  }

  // Fallback padrão para gpt-4o-mini
  return {
    inputPrice: 0.15 / 1000000,
    outputPrice: 0.60 / 1000000,
  };
}

/**
 * Cria um identificador anônimo e seguro do usuário e loja (Safety Identifier)
 * para auditorias de segurança da OpenAI sem expor dados pessoais.
 */
export function generateSafetyUserHash(lojaId: string, usuarioId: string): string {
  const rawString = `${lojaId}:${usuarioId}`;
  return crypto.createHash("sha256").update(rawString).digest("hex");
}

/**
 * Dispara a chamada REST direta para a API de Chat Completions da OpenAI.
 */
export async function callOpenAI(params: {
  systemPrompt: string;
  userMessage: string;
  model?: string;
  temperature?: number;
  safetyUserHash?: string;
}): Promise<OpenAIResponse> {
  if (process.env.E2E_MOCK_AI === "true" || process.env.NODE_ENV === "test") {
    return {
      content: "Resposta simulada de teste E2E.",
      tokensEntrada: 10,
      tokensSaida: 20,
      tokensTotal: 30,
      custoEstimado: 0.0001,
      modelo: params.model || "gpt-4o-mini",
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    console.error("ERRO CRÍTICO: Chave de API da OpenAI (OPENAI_API_KEY) não está configurada no servidor.");
    return {
      content: "",
      tokensEntrada: 0,
      tokensSaida: 0,
      tokensTotal: 0,
      custoEstimado: 0,
      modelo: "",
      error: "A chave de API da OpenAI não está configurada no servidor. Contate o suporte do ShopMind.",
    };
  }

  const selectedModel = params.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const temp = params.temperature !== undefined ? params.temperature : 0.7;

  try {
    const payload = {
      model: selectedModel,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userMessage },
      ],
      temperature: temp,
      max_tokens: 1200,
      user: params.safetyUserHash || "anonymous_shopmind_user",
    };

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Erro na API da OpenAI (HTTP ${res.status}):`, errorText);
      return {
        content: "",
        tokensEntrada: 0,
        tokensSaida: 0,
        tokensTotal: 0,
        custoEstimado: 0,
        modelo: selectedModel,
        error: `Erro ao processar consulta com a inteligência artificial (Código HTTP: ${res.status}).`,
      };
    }

    const data = await res.json();
    
    const content = data.choices?.[0]?.message?.content || "";
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;
    const totalTokens = data.usage?.total_tokens || 0;

    // Calcular o custo financeiro estimado em USD baseado no modelo
    const pricing = getModelPricing(selectedModel);
    const custoUSD = (promptTokens * pricing.inputPrice) + (completionTokens * pricing.outputPrice);

    return {
      content,
      tokensEntrada: promptTokens,
      tokensSaida: completionTokens,
      tokensTotal: totalTokens,
      custoEstimado: parseFloat(custoUSD.toFixed(6)),
      modelo: selectedModel,
    };
  } catch (err: any) {
    console.error("Erro na chamada de rede à OpenAI:", err);
    return {
      content: "",
      tokensEntrada: 0,
      tokensSaida: 0,
      tokensTotal: 0,
      custoEstimado: 0,
      modelo: selectedModel,
      error: `Falha na conexão com a rede da inteligência artificial: ${err.message}`,
    };
  }
}
