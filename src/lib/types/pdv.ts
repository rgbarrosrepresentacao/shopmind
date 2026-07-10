import type { Product } from "./produtos";
import type { Cliente } from "./clientes";

export interface CartItem {
  produto: Product;
  quantidade: number;
  desconto: number; // Desconto em R$ (BRL) aplicado a este item específico
  total: number; // Valor calculado: (produto.preco_venda * quantidade) - desconto
}

export interface PDVCheckout {
  clienteId: string | null;
  descontoGeral: number; // Desconto em R$ (BRL) aplicado ao carrinho total
  formaPagamento: "dinheiro" | "pix" | "cartao_credito" | "cartao_debito" | "multiplo";
  detalhePagamento: Record<string, number> | null; // Detalhamento para múltiplos pagamentos (ex: { dinheiro: 20, pix: 30 })
  pagamentos?: Array<{ metodo: string; valor: number }> | null;
  valorPago: number; // Total recebido do cliente (para cálculo de troco)
  troco: number;
  recompensaId?: string | null;
  cashbackUsado?: number | null;
  tipoDocumento?: "recibo" | "pedido" | "orcamento" | "comprovante" | "venda" | "devolucao" | "cupom";
}

export interface SuspendedSale {
  id: string;
  items: CartItem[];
  cliente: Cliente | null;
  descontoGeral: number;
  created_at: string;
  identificador: string; // Identificador amigável (ex: "Mesa 4", "Cliente Casaco Azul")
}

/**
 * Helper para validar o desconto permitido baseado no perfil do usuário
 * @param precoOriginal Valor total original antes do desconto
 * @param valorDesconto Valor em R$ do desconto solicitado
 * @param userTipo Tipo do usuário logado ('caixa', 'gerente', 'dono')
 * @returns true se o desconto for permitido, false caso contrário
 */
export function validarLimiteDesconto(
  precoOriginal: number,
  valorDesconto: number,
  userTipo: string
): boolean {
  if (precoOriginal <= 0 || valorDesconto <= 0) return true;
  
  const percentual = (valorDesconto / precoOriginal) * 100;

  if (userTipo === "dono") return true;
  if (userTipo === "gerente") return percentual <= 30;
  return percentual <= 10; // Operador de caixa padrão
}

/**
 * Helper para checar se o desconto exige alerta de auditoria
 * @param precoOriginal Valor original antes do desconto
 * @param valorDesconto Valor do desconto em R$
 * @returns 'normal' | 'alerta' | 'critico'
 */
export function checarAuditoriaDesconto(
  precoOriginal: number,
  valorDesconto: number
): "normal" | "alerta" | "critico" {
  if (precoOriginal <= 0 || valorDesconto <= 0) return "normal";
  
  const percentual = (valorDesconto / precoOriginal) * 100;

  if (percentual > 30) return "critico";
  if (percentual > 20) return "alerta";
  return "normal";
}
