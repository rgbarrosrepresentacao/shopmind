"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { BusinessEngine } from "@/lib/business-engine";
import type {
  TransferenciaEstoque,
  TransferenciaEstoqueItem,
  TransferenciaStatus,
  DivergenciaMotivo,
  SmartSuggestion,
  CorporateStockMatrixRow,
  CorporateStockKPIs,
  PrevisaoRuptura,
} from "@/lib/types/transferencias";
import type { Product } from "@/lib/types/produtos";

// ============================================
// AUDITORIA: EXTRAÇÃO DE IP, BROWSER E SO DOS HEADERS
// ============================================
async function parseClientMetadata() {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || headersList.get("x-real-ip") || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "";
  
  // Detecção simples de SO
  let os = "Desconhecido";
  if (userAgent.includes("Windows")) os = "Windows";
  else if (userAgent.includes("Macintosh")) os = "macOS";
  else if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";
  else if (userAgent.includes("Linux")) os = "Linux";

  // Detecção simples de Browser
  let browser = "Desconhecido";
  if (userAgent.includes("Firefox")) browser = "Firefox";
  else if (userAgent.includes("Chrome")) browser = "Chrome";
  else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) browser = "Safari";
  else if (userAgent.includes("Edge")) browser = "Edge";

  return { ip, browser, os };
}

// ============================================
// VALIDAÇÃO DE PERMISSÕES E RBAC NO SERVIDOR
// ============================================
async function validateTransferenciaRBAC(
  action: "create" | "approve" | "send" | "receive" | "cancel" | "view",
  lojaOrigemId?: string,
  lojaDestinoId?: string
) {
  const context = await BusinessEngine.getContext();
  
  // 1. Validar permissão utilizando o Core Engine
  let engineAction = 'transferencia:solicitar';
  if (action === 'approve') engineAction = 'transferencia:aprovar';
  else if (action === 'send') engineAction = 'transferencia:enviar';
  else if (action === 'receive') engineAction = 'transferencia:receber';
  else if (action === 'view') engineAction = 'venda:listar'; // Visualização geral usa listar

  const dec = BusinessEngine.permissions.check(context, engineAction);
  if (!dec.allowed && action !== "view") {
    throw new Error(dec.reason || "Acesso negado: Permissão de transferência insuficiente.");
  }

  const tipo = context.actor.tipo;
  const userLojaId = context.tenant.lojaId;

  // 2. Vendedores e Caixas não têm acesso a transferências
  if (tipo === "caixa" || tipo === "vendedor") {
    throw new Error("Acesso negado: Seu cargo não possui permissão para gerenciar transferências.");
  }

  // 3. Financeiro possui acesso de visualização apenas
  if (tipo === "financeiro" && action !== "view") {
    throw new Error("Acesso negado: Financeiro possui acesso apenas para visualização de transferências.");
  }

  // 4. Validação de filiais permitidas para cargos locais
  if (tipo !== "dono" && action !== "view") {
    // Gerente, Supervisor e Estoquista só operam se sua loja for origem ou destino
    const isLojaValida = 
      (lojaOrigemId && userLojaId === lojaOrigemId) || 
      (lojaDestinoId && userLojaId === lojaDestinoId) ||
      (userLojaId === context.tenant.lojaId);

    if (!isLojaValida) {
      throw new Error("Acesso negado: Você só pode gerenciar transferências que envolvem a sua própria filial.");
    }

    // Estoquista não pode aprovar transferências
    if (tipo === "estoquista" && action === "approve") {
      throw new Error("Acesso negado: Estoquistas não possuem permissão para aprovar solicitações.");
    }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado.");

  return { 
    user, 
    profile: { 
      loja_id: userLojaId, 
      tipo, 
      nome: context.actor.nome 
    } 
  };
}

// Helper: obter ou criar categoria equivalente na filial
async function obterOuCriarCategoriaEquivalente(
  categoriaNome: string | null | undefined,
  lojaDestinoId: string,
  supabase: any
): Promise<string | null> {
  if (!categoriaNome) return null;

  const { data: catDestino } = await supabase
    .from("categorias")
    .select("id")
    .eq("loja_id", lojaDestinoId)
    .eq("nome", categoriaNome)
    .maybeSingle();

  if (catDestino) {
    return catDestino.id;
  }

  const { data: novaCat, error: insertError } = await supabase
    .from("categorias")
    .insert({
      loja_id: lojaDestinoId,
      nome: categoriaNome,
      status: "ativo"
    })
    .select("id")
    .single();

  if (insertError || !novaCat) {
    console.error("Erro ao sincronizar categoria para transferência:", insertError);
    return null;
  }

  return novaCat.id;
}

// ============================================
// CRIAR SOLICITAÇÃO DE TRANSFERÊNCIA
// ============================================
export async function createTransferencia(input: {
  lojaOrigemId: string;
  lojaDestinoId: string;
  observacao?: string;
  status?: "rascunho" | "solicitada";
  itens: {
    produtoMestreId: string;
    quantidadeSolicitada: number;
    observacao?: string;
  }[];
  
  // Novos Campos Corporativos e Logísticos
  motivo?: string;
  prioridade?: string;
  transportadora?: string;
  motorista?: string;
  placa?: string;
  valorFrete?: number;
  peso?: number;
  volumes?: number;
  dataPrevista?: string;
  observacoesLogistica?: string;
  numeroConhecimento?: string;
}) {
  try {
    const { user, profile } = await validateTransferenciaRBAC("create", input.lojaOrigemId, input.lojaDestinoId);
    const supabase = await createClient();

    if (input.lojaOrigemId === input.lojaDestinoId) {
      return { data: null, error: "A loja de origem não pode ser igual à loja de destino." };
    }

    if (!input.itens || input.itens.length === 0) {
      return { data: null, error: "Selecione pelo menos um item para transferência." };
    }

    // Obter o grupo_id da loja de origem
    const { data: lojaOrigem } = await supabase
      .from("lojas")
      .select("grupo_id")
      .eq("id", input.lojaOrigemId)
      .single();

    if (!lojaOrigem) {
      return { data: null, error: "Loja de origem não encontrada." };
    }

    // Consultar configuração de fluxo
    const { data: fluxoConfig } = await supabase
      .from("transferencias_fluxos")
      .select("aprovacao_automatica")
      .eq("grupo_id", lojaOrigem.grupo_id)
      .maybeSingle();

    let status: TransferenciaStatus = input.status || "solicitada";
    let autoApprove = false;
    if (status === "solicitada" && fluxoConfig?.aprovacao_automatica) {
      status = "aprovada";
      autoApprove = true;
    }

    const { ip, browser, os } = await parseClientMetadata();

    // 1. Inserir cabeçalho
    const { data: transf, error: headError } = await supabase
      .from("transferencias_estoque")
      .insert({
        grupo_id: lojaOrigem.grupo_id,
        loja_origem_id: input.lojaOrigemId,
        loja_destino_id: input.lojaDestinoId,
        status,
        solicitado_por: user.id,
        data_solicitacao: new Date().toISOString(),
        observacao: input.observacao || null,
        
        // Novos Campos
        motivo: input.motivo || "Reposição",
        prioridade: input.prioridade || "Normal",
        transportadora: input.transportadora || null,
        motorista: input.motorista || null,
        placa: input.placa || null,
        valor_frete: input.valorFrete || 0,
        peso: input.peso || 0,
        volumes: input.volumes || 0,
        data_prevista: input.dataPrevista || null,
        observacoes_logistica: input.observacoesLogistica || null,
        numero_conhecimento: input.numeroConhecimento || null,
        status_entrega: input.transportadora ? "em_coleta" : "pendente",
        
        // Se for automático, já assina como aprovado pelo dono
        aprovado_por: autoApprove ? user.id : null,
        data_aprovacao: autoApprove ? new Date().toISOString() : null,
        aprovado_dono_por: autoApprove ? user.id : null,
        data_aprovacao_dono: autoApprove ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (headError) {
      return { data: null, error: `Erro ao criar transferência: ${headError.message}` };
    }

    // 2. Inserir itens
    for (const item of input.itens) {
      if (item.quantidadeSolicitada <= 0) {
        return { data: null, error: "A quantidade solicitada deve ser maior que zero." };
      }

      // Buscar o produto local na origem
      const { data: prodOrigem } = await supabase
        .from("produtos")
        .select("id, preco_custo, estoque_reservado")
        .eq("loja_id", input.lojaOrigemId)
        .eq("produto_mestre_id", item.produtoMestreId)
        .is("deleted_at", null)
        .maybeSingle();

      if (!prodOrigem) {
        return { data: null, error: `Produto não localizado na filial de origem.` };
      }

      // Buscar o produto local no destino (pode não existir ainda)
      const { data: prodDestino } = await supabase
        .from("produtos")
        .select("id")
        .eq("loja_id", input.lojaDestinoId)
        .eq("produto_mestre_id", item.produtoMestreId)
        .is("deleted_at", null)
        .maybeSingle();

      const { error: itemError } = await supabase
        .from("transferencia_estoque_itens")
        .insert({
          transferencia_id: transf.id,
          produto_mestre_id: item.produtoMestreId,
          produto_origem_id: prodOrigem.id,
          produto_destino_id: prodDestino?.id || null, // Nullable se não existir
          quantidade_solicitada: item.quantidadeSolicitada,
          custo_unitario: prodOrigem.preco_custo || 0,
          observacao: item.observacao || null,
        });

      if (itemError) {
        // Exclui cabeçalho em caso de falha de consistência
        await supabase.from("transferencias_estoque").delete().eq("id", transf.id);
        return { data: null, error: `Erro ao adicionar item: ${itemError.message}` };
      }

      // Se aprovado automaticamente, realiza a reserva física de estoque imediatamente
      if (autoApprove) {
        await supabase
          .from("produtos")
          .update({
            estoque_reservado: Number(prodOrigem.estoque_reservado || 0) + Number(item.quantidadeSolicitada)
          })
          .eq("id", prodOrigem.id);
      }
    }

    // 3. Registrar auditoria
    await supabase.from("logs_atividade").insert({
      loja_id: profile.loja_id,
      usuario_id: user.id,
      acao: "criar_transferencia",
      entidade: "transferencias_estoque",
      entidade_id: transf.id,
      dados_novos: { 
        transf_id: transf.id, 
        status, 
        itens_count: input.itens.length,
        ip, browser, os 
      },
    });

    revalidatePath("/dashboard/estoque/transferencias");
    return { data: transf as TransferenciaEstoque, error: null };
  } catch (error: any) {
    console.error("Erro no createTransferencia:", error);
    return { data: null, error: error.message || "Erro desconhecido." };
  }
}

// ============================================
// APROVAR SOLICITAÇÃO (Reserva Estoque)
// ============================================
export async function approveTransferencia(id: string) {
  try {
    const supabase = await createClient();

    // 1. Carregar transferência
    const { data: transf } = await supabase
      .from("transferencias_estoque")
      .select("*")
      .eq("id", id)
      .single();

    if (!transf) return { error: "Transferência não encontrada." };

    if (transf.status !== "solicitada") {
      return { error: `Transferência em status "${transf.status}" não pode ser aprovada.` };
    }

    // 2. Validar permissão (RBAC)
    const { user, profile } = await validateTransferenciaRBAC("approve", transf.loja_origem_id, transf.loja_destino_id);

    // 3. Consultar regras de workflow da holding
    const { data: fluxoConfig } = await supabase
      .from("transferencias_fluxos")
      .select("*")
      .eq("grupo_id", transf.grupo_id)
      .maybeSingle();

    let approvedSupervisor = transf.aprovado_supervisor_por;
    let approvedFinanceiro = transf.aprovado_financeiro_por;
    let approvedDono = transf.aprovado_dono_por;
    let dateSupervisor = transf.data_aprovacao_supervisor;
    let dateFinanceiro = transf.data_aprovacao_financeiro;
    let dateDono = transf.data_aprovacao_dono;

    const userTipo = profile.tipo;
    const userId = user.id;

    // Aplicar assinaturas baseadas no cargo
    if (fluxoConfig) {
      if (fluxoConfig.exige_supervisor && (userTipo === "gerente" || userTipo === "dono")) {
        approvedSupervisor = userId;
        dateSupervisor = new Date().toISOString();
      }
      if (fluxoConfig.exige_financeiro && (userTipo === "financeiro" || userTipo === "dono")) {
        approvedFinanceiro = userId;
        dateFinanceiro = new Date().toISOString();
      }
      if (fluxoConfig.exige_dono && userTipo === "dono") {
        approvedDono = userId;
        dateDono = new Date().toISOString();
      }
    } else {
      // Sem workflow personalizado, dono assina tudo diretamente
      approvedDono = userId;
      dateDono = new Date().toISOString();
    }

    const isSupervisorOk = !fluxoConfig?.exige_supervisor || approvedSupervisor !== null;
    const isFinanceiroOk = !fluxoConfig?.exige_financeiro || approvedFinanceiro !== null;
    const isDonoOk = !fluxoConfig?.exige_dono || approvedDono !== null;

    const distinctApprovers = new Set([approvedSupervisor, approvedFinanceiro, approvedDono].filter(Boolean));
    const isDuplaOk = !fluxoConfig?.exige_dupla_aprovacao || distinctApprovers.size >= 2;

    const isWorkflowComplete = isSupervisorOk && isFinanceiroOk && isDonoOk && isDuplaOk;

    const { ip, browser, os } = await parseClientMetadata();

    if (!isWorkflowComplete) {
      // Workflow incompleto, apenas salva as assinaturas colhidas
      const { error: updateSigsError } = await supabase
        .from("transferencias_estoque")
        .update({
          aprovado_supervisor_por: approvedSupervisor,
          data_aprovacao_supervisor: dateSupervisor,
          aprovado_financeiro_por: approvedFinanceiro,
          data_aprovacao_financeiro: dateFinanceiro,
          aprovado_dono_por: approvedDono,
          data_aprovacao_dono: dateDono,
        })
        .eq("id", id);

      if (updateSigsError) return { error: updateSigsError.message };

      // Registrar auditoria da assinatura intermediária
      await supabase.from("logs_atividade").insert({
        loja_id: profile.loja_id,
        usuario_id: user.id,
        acao: "assinatura_intermediaria_transferencia",
        entidade: "transferencias_estoque",
        entidade_id: id,
        dados_novos: { id, cargo: userTipo, ip, browser, os },
      });

      revalidatePath("/dashboard/estoque/transferencias");
      return { error: null, info: "Assinatura registrada. Aguardando demais assinaturas de governança." };
    }

    // 4. Carregar itens para efetivar a reserva física (Workflow concluído)
    const { data: itens } = await supabase
      .from("transferencia_estoque_itens")
      .select("*")
      .eq("transferencia_id", id);

    if (!itens || itens.length === 0) {
      return { error: "Transferência não possui itens para aprovação." };
    }

    // Validar e aplicar reservas físicas de estoque
    for (const item of itens) {
      const { data: prodOrigem } = await supabase
        .from("produtos")
        .select("nome, estoque_atual, estoque_reservado")
        .eq("id", item.produto_origem_id)
        .single();

      if (!prodOrigem) {
        return { error: "Um dos produtos de origem não foi localizado." };
      }

      const estoqueDisponivel = Number(prodOrigem.estoque_atual) - Number(prodOrigem.estoque_reservado || 0);
      if (estoqueDisponivel < Number(item.quantidade_solicitada)) {
        return { 
          error: `Estoque insuficiente para o produto "${prodOrigem.nome}" na origem. Disponível: ${estoqueDisponivel}, Solicitado: ${item.quantidade_solicitada}.` 
        };
      }

      const { error: reserveError } = await supabase
        .from("produtos")
        .update({ 
          estoque_reservado: Number(prodOrigem.estoque_reservado || 0) + Number(item.quantidade_solicitada) 
        })
        .eq("id", item.produto_origem_id);

      if (reserveError) {
        return { error: `Erro ao aplicar reserva de estoque: ${reserveError.message}` };
      }
    }

    // 5. Concluir a aprovação no cabeçalho
    const { error: updateError } = await supabase
      .from("transferencias_estoque")
      .update({
        status: "aprovada",
        aprovado_por: user.id,
        data_aprovacao: new Date().toISOString(),
        aprovado_supervisor_por: approvedSupervisor,
        data_aprovacao_supervisor: dateSupervisor,
        aprovado_financeiro_por: approvedFinanceiro,
        data_aprovacao_financeiro: dateFinanceiro,
        aprovado_dono_por: approvedDono,
        data_aprovacao_dono: dateDono,
      })
      .eq("id", id);

    if (updateError) {
      return { error: updateError.message };
    }

    // 6. Log de Auditoria
    await supabase.from("logs_atividade").insert({
      loja_id: profile.loja_id,
      usuario_id: user.id,
      acao: "aprovar_transferencia",
      entidade: "transferencias_estoque",
      entidade_id: id,
      dados_novos: { id, status: "aprovada", ip, browser, os },
    });

    revalidatePath("/dashboard/estoque/transferencias");
    return { error: null };
  } catch (error: any) {
    console.error("Erro no approveTransferencia:", error);
    return { error: error.message || "Erro desconhecido." };
  }
}

// ============================================
// ENVIAR TRANSFERÊNCIA (Baixa Física e Liberação da Reserva)
// ============================================
export async function sendTransferencia(id: string, itensEnviados?: { itemId: string; quantidadeEnviada: number }[]) {
  try {
    const supabase = await createClient();

    // 1. Carregar transferência
    const { data: transf } = await supabase
      .from("transferencias_estoque")
      .select("*")
      .eq("id", id)
      .single();

    if (!transf) return { error: "Transferência não encontrada." };

    if (transf.status !== "aprovada" && transf.status !== "solicitada") {
      return { error: `Transferência em status "${transf.status}" não pode ser enviada.` };
    }

    // 2. Validar RBAC
    const { user, profile } = await validateTransferenciaRBAC("send", transf.loja_origem_id, transf.loja_destino_id);

    // Se estiver em solicitada, aprova automaticamente se o usuário tiver cargo
    if (transf.status === "solicitada") {
      const appResult = await approveTransferencia(id);
      if (appResult.error) return { error: `Não foi possível aprovar para envio: ${appResult.error}` };
    }

    // 3. Carregar itens
    const { data: itens } = await supabase
      .from("transferencia_estoque_itens")
      .select("*")
      .eq("transferencia_id", id);

    if (!itens || itens.length === 0) {
      return { error: "Nenhum item localizado para envio." };
    }

    // 4. Processar baixa física e liberação de reserva de cada item
    for (const item of itens) {
      const config = itensEnviados?.find(c => c.itemId === item.id);
      const qtyEnviada = config ? Number(config.quantidadeEnviada) : Number(item.quantidade_solicitada);

      // Carregar produto de origem
      const { data: prodOrigem } = await supabase
        .from("produtos")
        .select("nome, estoque_atual, estoque_reservado")
        .eq("id", item.produto_origem_id)
        .single();

      if (!prodOrigem) {
        return { error: `Produto de origem não encontrado no estoque.` };
      }

      if (Number(prodOrigem.estoque_atual) < qtyEnviada) {
        return { error: `Estoque insuficiente para enviar o produto "${prodOrigem.nome}". Disponível físico: ${prodOrigem.estoque_atual}, Enviado: ${qtyEnviada}.` };
      }

      // Baixa física no estoque e desconto na reserva
      const novoEstoque = Number(prodOrigem.estoque_atual) - qtyEnviada;
      const novaReserva = Math.max(0, Number(prodOrigem.estoque_reservado || 0) - Number(item.quantidade_solicitada));

      const { error: updateError } = await supabase
        .from("produtos")
        .update({ 
          estoque_atual: novoEstoque, 
          estoque_reservado: novaReserva 
        })
        .eq("id", item.produto_origem_id);

      if (updateError) return { error: `Erro ao baixar estoque na origem: ${updateError.message}` };

      // Criar movimentação de estoque física de saída
      await supabase.from("movimentacoes_estoque").insert({
        loja_id: transf.loja_origem_id,
        produto_id: item.produto_origem_id,
        tipo: "saida",
        quantidade: qtyEnviada,
        motivo: "ajuste", // Ajuste no banco, no histórico rastreamos como transferência
        usuario_id: user.id,
      });

      // Atualizar item com a quantidade enviada
      await supabase
        .from("transferencia_estoque_itens")
        .update({ quantidade_enviada: qtyEnviada })
        .eq("id", item.id);
    }

    // 5. Atualizar cabeçalho da transferência
    const { ip, browser, os } = await parseClientMetadata();
    const { error: headError } = await supabase
      .from("transferencias_estoque")
      .update({
        status: "em_transito",
        enviado_por: user.id,
        data_envio: new Date().toISOString()
      })
      .eq("id", id);

    if (headError) return { error: headError.message };

    // 6. Gravar log
    await supabase.from("logs_atividade").insert({
      loja_id: profile.loja_id,
      usuario_id: user.id,
      acao: "enviar_transferencia",
      entidade: "transferencias_estoque",
      entidade_id: id,
      dados_novos: { id, status: "em_transito", ip, browser, os },
    });

    revalidatePath("/dashboard/estoque/transferencias");
    return { error: null };
  } catch (error: any) {
    console.error("Erro no sendTransferencia:", error);
    return { error: error.message || "Erro desconhecido." };
  }
}

// ============================================
// RECEBER TRANSFERÊNCIA (Entrada no Destino e Criação On-the-fly)
// ============================================
export async function receiveTransferencia(
  id: string, 
  itensRecebidos: { itemId: string; quantidadeRecebida: number; divergenciaMotivo?: DivergenciaMotivo; observacao?: string }[]
) {
  try {
    const supabase = await createClient();

    // 1. Carregar transferência
    const { data: transf } = await supabase
      .from("transferencias_estoque")
      .select("*")
      .eq("id", id)
      .single();

    if (!transf) return { error: "Transferência não encontrada." };

    if (transf.status !== "em_transito" && transf.status !== "parcialmente_recebida") {
      return { error: `Transferência em status "${transf.status}" não está em trânsito.` };
    }

    // 2. Validar RBAC
    const { user, profile } = await validateTransferenciaRBAC("receive", transf.loja_origem_id, transf.loja_destino_id);

    // 3. Carregar itens da transferência
    const { data: itens } = await supabase
      .from("transferencia_estoque_itens")
      .select("*")
      .eq("transferencia_id", id);

    if (!itens || itens.length === 0) {
      return { error: "Itens da transferência não encontrados." };
    }

    let possuiDivergencia = false;

    // 4. Processar entrada física de cada item no destino
    for (const item of itens) {
      const config = itensRecebidos.find(c => c.itemId === item.id);
      if (!config) continue;

      const qtyRecebida = Number(config.quantidadeRecebida);
      if (qtyRecebida < 0) return { error: "A quantidade recebida não pode ser menor que zero." };

      if (qtyRecebida < Number(item.quantidade_enviada)) {
        possuiDivergencia = true;
      }

      let destProdId = item.produto_destino_id;

      // A) CRIAÇÃO AUTOMÁTICA ON-THE-FLY NO DESTINO SE NÃO EXISTIR
      if (!destProdId) {
        // Carregar o mestre e as configurações de origem do produto
        const { data: mestre } = await supabase
          .from("produtos_mestres")
          .select("*")
          .eq("id", item.produto_mestre_id)
          .single();

        const { data: prodOrigem } = await supabase
          .from("produtos")
          .select("*")
          .eq("id", item.produto_origem_id)
          .single();

        if (!mestre || !prodOrigem) {
          return { error: "Erro ao recuperar dados mestre ou de origem para replicação." };
        }

        // Mapear categoria para a filial destino pelo nome
        const mappedCatId = await obterOuCriarCategoriaEquivalente(mestre.categoria_nome, transf.loja_destino_id, supabase);

        // Criar o produto local na filial destino
        const { data: newDestProd, error: createError } = await supabase
          .from("produtos")
          .insert({
            loja_id: transf.loja_destino_id,
            produto_mestre_id: item.produto_mestre_id,
            produto_grupo_id: item.produto_mestre_id,
            categoria_id: mappedCatId,
            nome: mestre.nome,
            sku: prodOrigem.sku ? `${prodOrigem.sku}-F` : null, // SKU local
            codigo_barras: mestre.codigo_barras,
            marca: mestre.marca,
            descricao: mestre.descricao,
            foto_url: mestre.foto_url,
            unidade: mestre.unidade,
            favorito: mestre.favorito,
            destaque: mestre.destaque,
            ncm: mestre.ncm,
            cest: mestre.cest,
            origem_fiscal: mestre.origem_fiscal,
            
            // Copiar preços e custos da origem como padrão (Decisão do Plano)
            preco_custo: prodOrigem.preco_custo,
            preco_venda: prodOrigem.preco_venda,
            preco_promocional: prodOrigem.preco_promocional,
            estoque_atual: 0, // Será incrementado abaixo
            estoque_minimo: prodOrigem.estoque_minimo,
            status: "ativo",
            permitir_venda: true,
            permitir_compra: true,
            permitir_transferencia: true
          })
          .select()
          .single();

        if (createError || !newDestProd) {
          return { error: `Erro ao criar produto na filial de destino: ${createError?.message}` };
        }

        destProdId = newDestProd.id;

        // Registrar atividade da criação
        await supabase.from("logs_atividade").insert({
          loja_id: transf.loja_destino_id,
          usuario_id: user.id,
          acao: "criacao",
          entidade: "produto",
          entidade_id: destProdId,
          dados_novos: newDestProd,
        });
      }

      // B) INCREMENTAR ESTOQUE LOCAL DA FILIAL DESTINO
      const { data: prodDest } = await supabase
        .from("produtos")
        .select("estoque_atual")
        .eq("id", destProdId)
        .single();

      const novoEstoqueDest = Number(prodDest?.estoque_atual || 0) + qtyRecebida;
      await supabase
        .from("produtos")
        .update({ estoque_atual: novoEstoqueDest })
        .eq("id", destProdId);

      // Criar movimentação de estoque física de entrada
      if (qtyRecebida > 0) {
        await supabase.from("movimentacoes_estoque").insert({
          loja_id: transf.loja_destino_id,
          produto_id: destProdId,
          tipo: "entrada",
          quantidade: qtyRecebida,
          motivo: "ajuste", // Ajuste para consistência, auditável na transferência
          usuario_id: user.id,
        });
      }

      // C) ATUALIZAR ITEM DA TRANSFERÊNCIA
      await supabase
        .from("transferencia_estoque_itens")
        .update({
          quantidade_recebida: qtyRecebida,
          produto_destino_id: destProdId,
          divergencia_motivo: config.divergenciaMotivo || null,
          observacao: config.observacao || null
        })
        .eq("id", item.id);
    }

    // 5. Atualizar cabeçalho da transferência
    const finalStatus: TransferenciaStatus = possuiDivergencia ? "parcialmente_recebida" : "recebida";
    const { ip, browser, os } = await parseClientMetadata();
    
    const { error: headError } = await supabase
      .from("transferencias_estoque")
      .update({
        status: finalStatus,
        recebido_por: user.id,
        data_recebimento: new Date().toISOString()
      })
      .eq("id", id);

    if (headError) return { error: headError.message };

    // 6. Registrar log
    await supabase.from("logs_atividade").insert({
      loja_id: profile.loja_id,
      usuario_id: user.id,
      acao: "receber_transferencia",
      entidade: "transferencias_estoque",
      entidade_id: id,
      dados_novos: { id, status: finalStatus, possuiDivergencia, ip, browser, os },
    });

    revalidatePath("/dashboard/estoque/transferencias");
    return { error: null };
  } catch (error: any) {
    console.error("Erro no receiveTransferencia:", error);
    return { error: error.message || "Erro desconhecido." };
  }
}

// ============================================
// FLUXO DE RESOLUÇÃO DE RECEBIMENTO PARCIAL (PENDÊNCIAS)
// ============================================
export async function resolveTransferenciaPendencia(
  id: string,
  opcao: "receber_restante" | "cancelar_restante" | "perda_definitiva",
  motivo: string
) {
  try {
    const supabase = await createClient();

    // 1. Carregar transferência
    const { data: transf } = await supabase
      .from("transferencias_estoque")
      .select("*")
      .eq("id", id)
      .single();

    if (!transf) return { error: "Transferência não encontrada." };
    if (transf.status !== "parcialmente_recebida") {
      return { error: "Esta transferência não possui pendências de recebimento parcial." };
    }

    // 2. Validar RBAC
    const { user, profile } = await validateTransferenciaRBAC("receive", transf.loja_origem_id, transf.loja_destino_id);

    // 3. Carregar itens
    const { data: itens } = await supabase
      .from("transferencia_estoque_itens")
      .select("*")
      .eq("transferencia_id", id);

    if (!itens || itens.length === 0) {
      return { error: "Itens da transferência não encontrados." };
    }

    const { ip, browser, os } = await parseClientMetadata();

    // 4. Tratar conforme opção do usuário
    if (opcao === "receber_restante") {
      // Retorna para em trânsito para aguardar o resto dos itens
      await supabase
        .from("transferencias_estoque")
        .update({ status: "em_transito", observacao: motivo })
        .eq("id", id);
    } 
    else if (opcao === "cancelar_restante") {
      // Estorna a diferença de volta para a filial de origem
      for (const item of itens) {
        const diferenca = Number(item.quantidade_enviada) - Number(item.quantidade_recebida);
        if (diferenca > 0) {
          const { data: prodOrigem } = await supabase
            .from("produtos")
            .select("estoque_atual")
            .eq("id", item.produto_origem_id)
            .single();

          if (prodOrigem) {
            await supabase
              .from("produtos")
              .update({ estoque_atual: Number(prodOrigem.estoque_atual) + diferenca })
              .eq("id", item.produto_origem_id);

            // Gravar entrada de estorno na origem
            await supabase.from("movimentacoes_estoque").insert({
              loja_id: transf.loja_origem_id,
              produto_id: item.produto_origem_id,
              type: "entrada",
              quantidade: diferenca,
              motivo: "ajuste",
              usuario_id: user.id,
            });
          }
        }
      }

      // Finaliza a transferência como recebida
      await supabase
        .from("transferencias_estoque")
        .update({ status: "recebida", observacao: `Diferença cancelada/estornada. Motivo: ${motivo}` })
        .eq("id", id);
    } 
    else if (opcao === "perda_definitiva") {
      // Grava a perda definitiva contábil (não estorna estoque, apenas finaliza)
      await supabase
        .from("transferencias_estoque")
        .update({ status: "recebida", observacao: `Perda definitiva registrada. Motivo: ${motivo}` })
        .eq("id", id);
    }

    // 5. Log de atividade
    await supabase.from("logs_atividade").insert({
      loja_id: profile.loja_id,
      usuario_id: user.id,
      acao: "resolver_pendencia_transferencia",
      entidade: "transferencias_estoque",
      entidade_id: id,
      dados_novos: { id, opcao, motivo, ip, browser, os },
    });

    revalidatePath("/dashboard/estoque/transferencias");
    return { error: null };
  } catch (error: any) {
    console.error("Erro no resolveTransferenciaPendencia:", error);
    return { error: error.message || "Erro desconhecido." };
  }
}

// ============================================
// CANCELAR TRANSFERÊNCIA (Libera Reserva ou Estorna Físico)
// ============================================
export async function cancelTransferencia(id: string, motivo: string) {
  try {
    const supabase = await createClient();

    // 1. Carregar transferência
    const { data: transf } = await supabase
      .from("transferencias_estoque")
      .select("*")
      .eq("id", id)
      .single();

    if (!transf) return { error: "Transferência não encontrada." };

    const statusBloqueados: TransferenciaStatus[] = ["recebida", "cancelada", "recusada"];
    if (statusBloqueados.includes(transf.status as TransferenciaStatus)) {
      return { error: `Transferência finalizada com status "${transf.status}" não pode ser cancelada.` };
    }

    // 2. Validar RBAC (Dono, Gerente da origem/destino)
    const { user, profile } = await validateTransferenciaRBAC("cancel", transf.loja_origem_id, transf.loja_destino_id);

    // 3. Carregar itens
    const { data: itens } = await supabase
      .from("transferencia_estoque_itens")
      .select("*")
      .eq("transferencia_id", id);

    if (!itens || itens.length === 0) {
      return { error: "Itens não localizados." };
    }

    // 4. Desfazer impactos de estoque com base no status anterior
    const statusAnterior = transf.status as TransferenciaStatus;

    for (const item of itens) {
      const { data: prodOrigem } = await supabase
        .from("produtos")
        .select("estoque_atual, estoque_reservado")
        .eq("id", item.produto_origem_id)
        .single();

      if (!prodOrigem) continue;

      if (statusAnterior === "aprovada") {
        // Libera a reserva apenas
        const novaReserva = Math.max(0, Number(prodOrigem.estoque_reservado || 0) - Number(item.quantidade_solicitada));
        await supabase
          .from("produtos")
          .update({ estoque_reservado: novaReserva })
          .eq("id", item.produto_origem_id);
      } 
      else if (statusAnterior === "em_transito" || statusAnterior === "parcialmente_recebida") {
        // Estorno físico: Devolve os produtos em trânsito para o estoque atual da origem
        const qtyEnviada = Number(item.quantidade_enviada);
        const qtyRecebida = Number(item.quantidade_recebida || 0);
        const restanteEmTransito = qtyEnviada - qtyRecebida;

        if (restanteEmTransito > 0) {
          const novoEstoque = Number(prodOrigem.estoque_atual) + restanteEmTransito;
          await supabase
            .from("produtos")
            .update({ estoque_atual: novoEstoque })
            .eq("id", item.produto_origem_id);

          // Criar movimentação de entrada física de estorno na origem
          await supabase.from("movimentacoes_estoque").insert({
            loja_id: transf.loja_origem_id,
            produto_id: item.produto_origem_id,
            tipo: "entrada",
            quantidade: restanteEmTransito,
            motivo: "ajuste",
            usuario_id: user.id,
          });
        }
      }
    }

    // 5. Atualizar cabeçalho da transferência
    const { ip, browser, os } = await parseClientMetadata();
    const { error: cancelError } = await supabase
      .from("transferencias_estoque")
      .update({
        status: "cancelada",
        cancelado_por: user.id,
        data_cancelamento: new Date().toISOString(),
        motivo_cancelamento: motivo
      })
      .eq("id", id);

    if (cancelError) return { error: cancelError.message };

    // 6. Gravar log
    await supabase.from("logs_atividade").insert({
      loja_id: profile.loja_id,
      usuario_id: user.id,
      acao: "cancelar_transferencia",
      entidade: "transferencias_estoque",
      entidade_id: id,
      dados_novos: { id, status: "cancelada", status_anterior: statusAnterior, motivo, ip, browser, os },
    });

    revalidatePath("/dashboard/estoque/transferencias");
    return { error: null };
  } catch (error: any) {
    console.error("Erro no cancelTransferencia:", error);
    return { error: error.message || "Erro desconhecido." };
  }
}

// ============================================
// BUSCAR DETALHES DE UMA TRANSFERÊNCIA
// ============================================
export async function getTransferencia(id: string) {
  try {
    const supabase = await createClient();

    const { data: transf, error } = await supabase
      .from("transferencias_estoque")
      .select(`
        *,
        loja_origem:lojas!transferencias_estoque_loja_origem_id_fkey(id, nome_loja),
        loja_destino:lojas!transferencias_estoque_loja_destino_id_fkey(id, nome_loja),
        solicitante:usuarios!transferencias_estoque_solicitado_por_fkey(id, nome),
        aprovador:usuarios!transferencias_estoque_aprovado_por_fkey(id, nome),
        enviado:usuarios!transferencias_estoque_enviado_por_fkey(id, nome),
        recebido:usuarios!transferencias_estoque_recebido_por_fkey(id, nome),
        cancelado:usuarios!transferencias_estoque_cancelado_por_fkey(id, nome)
      `)
      .eq("id", id)
      .single();

    if (error || !transf) return { data: null, error: error?.message || "Registro não localizado." };

    // Carregar itens associados
    const { data: rawItens } = await supabase
      .from("transferencia_estoque_itens")
      .select(`
        *,
        produto_mestre:produtos_mestres(id, nome, codigo_barras, unidade, foto_url)
      `)
      .eq("transferencia_id", id);

    const itens = (rawItens || []).map((item: any) => ({
      ...item,
      produto_nome: item.produto_mestre?.nome || "Produto",
      produto_sku: item.produto_mestre?.id ? `${item.produto_mestre.id.slice(0, 8)}` : "",
      produto_barcode: item.produto_mestre?.codigo_barras || "",
      produto_foto: item.produto_mestre?.foto_url || null,
      produto_unidade: item.produto_mestre?.unidade || "UN",
    })) as TransferenciaEstoqueItem[];

    const data: TransferenciaEstoque = {
      ...transf,
      loja_origem_nome: transf.loja_origem?.nome_loja,
      loja_destino_nome: transf.loja_destino?.nome_loja,
      solicitante_nome: transf.solicitante?.nome,
      aprovador_nome: transf.aprovador?.nome,
      enviado_nome: transf.enviado?.nome,
      recebido_nome: transf.recebido?.nome,
      cancelado_nome: transf.cancelado?.nome,
      itens,
    };

    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

// ============================================
// LISTAR TODAS AS TRANSFERÊNCIAS
// ============================================
export async function listTransferencias(filters: {
  status?: string;
  lojaOrigemId?: string;
  lojaDestinoId?: string;
  search?: string;
  page?: number;
  perPage?: number;
} = {}) {
  try {
    const supabase = await createClient();
    const {
      status = "todos",
      lojaOrigemId,
      lojaDestinoId,
      search,
      page = 1,
      perPage = 25,
    } = filters;

    let query = supabase
      .from("transferencias_estoque")
      .select(`
        *,
        loja_origem:lojas!transferencias_estoque_loja_origem_id_fkey(id, nome_loja),
        loja_destino:lojas!transferencias_estoque_loja_destino_id_fkey(id, nome_loja),
        solicitante:usuarios!transferencias_estoque_solicitado_por_fkey(id, nome)
      `, { count: "exact" });

    // Filtro de status
    if (status !== "todos") query = query.eq("status", status);
    if (lojaOrigemId) query = query.eq("loja_origem_id", lojaOrigemId);
    if (lojaDestinoId) query = query.eq("loja_destino_id", lojaDestinoId);

    query = query.order("created_at", { ascending: false });

    // Paginação
    const from = (page - 1) * perPage;
    query = query.range(from, from + perPage - 1);

    const { data, error, count } = await query;

    if (error) return { data: [], count: 0, error: error.message };

    let results = (data || []).map((t: any) => ({
      ...t,
      loja_origem_nome: t.loja_origem?.nome_loja,
      loja_destino_nome: t.loja_destino?.nome_loja,
      solicitante_nome: t.solicitante?.nome,
    })) as TransferenciaEstoque[];

    // Busca textual cliente-side para filtros de texto adicionais
    if (search && search.trim()) {
      const term = search.toLowerCase();
      results = results.filter(t => 
        t.loja_origem_nome?.toLowerCase().includes(term) ||
        t.loja_destino_nome?.toLowerCase().includes(term) ||
        t.solicitante_nome?.toLowerCase().includes(term) ||
        t.observacao?.toLowerCase().includes(term)
      );
    }

    return { data: results, count: count || 0, error: null };
  } catch (error: any) {
    return { data: [], count: 0, error: error.message };
  }
}

// ============================================
// MATRIZ DE ESTOQUE CORPORATIVO (Pivot Table)
// ============================================
export async function getEstoqueCorporativoMatrix(): Promise<{
  rows: CorporateStockMatrixRow[];
  lojasList: { id: string; nome_loja: string; tipo_unidade: string }[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    
    // 1. Obter o grupo_id do usuário logado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { rows: [], lojasList: [], error: "Usuário não logado." };

    const { data: profile } = await supabase
      .from("usuarios")
      .select("loja_id")
      .eq("id", user.id)
      .single();

    if (!profile) return { rows: [], lojasList: [], error: "Perfil do usuário não encontrado." };

    const { data: activeLoja } = await supabase
      .from("lojas")
      .select("grupo_id")
      .eq("id", profile.loja_id)
      .single();

    if (!activeLoja) return { rows: [], lojasList: [], error: "Loja ativa não encontrada." };

    const grupoId = activeLoja.grupo_id;

    // 2. Carregar todas as lojas do grupo
    const { data: lojas } = await supabase
      .from("lojas")
      .select("id, nome_loja, tipo_unidade")
      .eq("grupo_id", grupoId)
      .eq("status", "ativo")
      .order("ordem", { ascending: true });

    if (!lojas || lojas.length === 0) {
      return { rows: [], lojasList: [], error: "Nenhuma loja localizada para o grupo." };
    }

    // 3. Carregar todos os produtos mestres do grupo
    const { data: mestres } = await supabase
      .from("produtos_mestres")
      .select("*")
      .eq("grupo_id", grupoId)
      .is("deleted_at", null);

    if (!mestres || mestres.length === 0) {
      return { rows: [], lojasList: lojas, error: null };
    }

    // 4. Carregar todos os produtos locais do grupo
    const { data: produtosLocais } = await supabase
      .from("produtos")
      .select("produto_mestre_id, loja_id, estoque_atual, estoque_reservado, estoque_minimo, preco_custo")
      .is("deleted_at", null)
      .eq("status", "ativo");

    // Agrupar produtos locais por [produto_mestre_id][loja_id]
    const localMap = new Map<string, Map<string, any>>();
    if (produtosLocais) {
      for (const p of produtosLocais) {
        if (!p.produto_mestre_id) continue;
        if (!localMap.has(p.produto_mestre_id)) {
          localMap.set(p.produto_mestre_id, new Map());
        }
        localMap.get(p.produto_mestre_id)!.set(p.loja_id, p);
      }
    }

    // 5. Montar a matriz
    const rows: CorporateStockMatrixRow[] = mestres.map((m) => {
      const estoquesPorLoja: CorporateStockMatrixRow["estoquesPorLoja"] = {};
      let estoqueTotalGrupo = 0;
      let valorTotalGrupo = 0;

      const localProds = localMap.get(m.id);

      for (const l of lojas) {
        const pLocal = localProds?.get(l.id);
        const atual = pLocal ? Number(pLocal.estoque_atual || 0) : 0;
        const reservado = pLocal ? Number(pLocal.estoque_reservated || pLocal.estoque_reservado || 0) : 0;
        const minimo = pLocal ? Number(pLocal.estoque_minimo || 0) : 0;
        const custo = pLocal ? Number(pLocal.preco_custo || 0) : 0;

        let status_estoque: "normal" | "baixo" | "critico" | "zerado" | "excesso" = "normal";
        if (atual <= 0) status_estoque = "zerado";
        else if (atual <= minimo) status_estoque = "critico";
        else if (minimo > 0 && atual <= minimo * 1.5) status_estoque = "baixo";
        else if (atual > minimo * 3 && atual > 50) status_estoque = "excesso";

        estoquesPorLoja[l.id] = {
          estoque_atual: atual,
          estoque_reservado: reservado,
          estoque_minimo: minimo,
          status_estoque,
        };

        estoqueTotalGrupo += atual;
        valorTotalGrupo += atual * custo;
      }

      return {
        produtoMestreId: m.id,
        produtoNome: m.nome,
        produtoSku: m.id.slice(0, 8),
        produtoBarcode: m.codigo_barras,
        produtoUnidade: m.unidade,
        estoquesPorLoja,
        estoqueTotalGrupo,
        valorTotalGrupo,
      };
    });

    return { rows, lojasList: lojas, error: null };
  } catch (error: any) {
    console.error("Erro em getEstoqueCorporativoMatrix:", error);
    return { rows: [], lojasList: [], error: error.message };
  }
}

// ============================================
// REQUISITO 8: ALGORITMO DE SUGESTÕES INTELIGENTES LOCAL
// ============================================
export async function getSmartTransferSuggestions(): Promise<SmartSuggestion[]> {
  try {
    const matrixRes = await getEstoqueCorporativoMatrix();
    if (matrixRes.error || matrixRes.rows.length === 0) return [];

    const suggestions: SmartSuggestion[] = [];
    const lojas = matrixRes.lojasList;

    // Varre cada linha (produto mestre) da matriz
    for (const row of matrixRes.rows) {
      // A) Identificar lojas carentes (estoque crítico ou zerado)
      const carentes = lojas
        .map(l => ({ lojaId: l.id, nome: l.nome_loja, ...row.estoquesPorLoja[l.id] }))
        .filter(e => e.estoque_atual <= e.estoque_minimo && e.estoque_minimo > 0);

      // B) Identificar lojas doadoras (excesso de estoque e saudável)
      const doadoras = lojas
        .map(l => ({ lojaId: l.id, nome: l.nome_loja, ...row.estoquesPorLoja[l.id] }))
        .filter(e => e.estoque_atual > e.estoque_minimo * 1.8 && e.estoque_atual > 10);

      if (carentes.length === 0 || doadoras.length === 0) continue;

      // C) Tentar parear
      for (const car of carentes) {
        const deficit = (car.estoque_minimo * 2) - car.estoque_atual; // Alvo confortável
        if (deficit <= 0) continue;

        // Parear com a maior doadora disponível
        doadoras.sort((a, b) => b.estoque_atual - a.estoque_atual);
        const doadora = doadoras[0];

        // Margem de doação segura (não pode ficar abaixo do mínimo dela)
        const margemSegura = doadora.estoque_atual - doadora.estoque_reservado - doadora.estoque_minimo;
        if (margemSegura <= 5) continue; // Pouca gordura para doar

        const quantidadeSugerida = Math.min(deficit, margemSegura);

        if (quantidadeSugerida >= 1) {
          const qtySugerida = Math.floor(quantidadeSugerida);
          const precoUnitarioMedio = row.valorTotalGrupo / row.estoqueTotalGrupo || 10;
          const valEstoque = qtySugerida * precoUnitarioMedio;
          const freteEstimado = 45;
          const tempoEst = 2;
          const econObtida = Number(Math.max(0, (valEstoque * 0.15) - freteEstimado).toFixed(2));

          suggestions.push({
            produtoMestreId: row.produtoMestreId,
            produtoNome: row.produtoNome,
            produtoSku: row.produtoSku,
            produtoBarcode: row.produtoBarcode,
            lojaOrigemId: doadora.lojaId,
            lojaOrigemNome: doadora.nome,
            estoqueOrigemDisponivel: doadora.estoque_atual - doadora.estoque_reservado,
            lojaDestinoId: car.lojaId,
            lojaDestinoNome: car.nome,
            estoqueDestinoAtual: car.estoque_atual,
            estoqueDestinoMinimo: car.estoque_minimo,
            quantidadeSugerida: qtySugerida,
            razao: `Filial "${car.nome}" está com estoque crítico (${car.estoque_atual}/${car.estoque_minimo} un.). Filial "${doadora.nome}" possui excesso saudável com saldo livre de ${margemSegura} un.`,
            valorEstoque: valEstoque,
            frete: freteEstimado,
            tempoEstimado: tempoEst,
            economiaObtida: econObtida
          });
        }
      }
    }

    return suggestions.slice(0, 10); // Retorna as top 10 sugestões urgentes
  } catch (error) {
    console.error("Erro em getSmartTransferSuggestions:", error);
    return [];
  }
}

// ============================================
// REQUISITO 7: KPIs CORPORATIVOS DE ESTOQUE
// ============================================
export async function getEstoqueCorporativoKPIs(): Promise<CorporateStockKPIs> {
  try {
    const supabase = await createClient();
    const matrixRes = await getEstoqueCorporativoMatrix();
    
    let valorTotalEstoque = 0;
    let produtosComRuptura = 0;
    let produtosComExcesso = 0;

    // Calcular valores a partir da matriz
    if (matrixRes.rows) {
      for (const r of matrixRes.rows) {
        valorTotalEstoque += r.valorTotalGrupo;
        
        Object.values(r.estoquesPorLoja).forEach(e => {
          if (e.estoque_atual <= 0) produtosComRuptura++;
          else if (e.status_estoque === "excesso") produtosComExcesso++;
        });
      }
    }

    // Carregar todas as transferências do grupo
    const { data: allTransfs } = await supabase
      .from("transferencias_estoque")
      .select("id, status, loja_origem_id, loja_destino_id, data_envio, data_recebimento")
      .is("data_envio", null === false); // Que já foram enviadas

    let valorEmTransito = 0;
    let produtosEmTransito = 0;
    let transferenciasPendentes = 0;
    let transferenciasAtrasadas = 0;
    let totalTransitTimeMs = 0;
    let completedTransitsCount = 0;

    const sendsCountMap = new Map<string, number>();
    const receivesCountMap = new Map<string, number>();
    const now = new Date();

    if (allTransfs) {
      const inTransitIds = allTransfs
        .filter(t => t.status === "em_transito" || t.status === "parcialmente_recebida")
        .map(t => t.id);

      transferenciasPendentes = inTransitIds.length;

      // Calcular tempo médio de trânsito e atrasadas
      for (const t of allTransfs) {
        // Atrasadas (em trânsito por mais de 3 dias)
        if (t.status === "em_transito" && t.data_envio) {
          const dias = (now.getTime() - new Date(t.data_envio).getTime()) / (1000 * 60 * 60 * 24);
          if (dias > 3) transferenciasAtrasadas++;
        }

        // Tempo de trânsito
        if (t.data_envio && t.data_recebimento) {
          const diffMs = new Date(t.data_recebimento).getTime() - new Date(t.data_envio).getTime();
          totalTransitTimeMs += diffMs;
          completedTransitsCount++;
        }

        // Fluxos para ranking
        if (t.status === "recebida" || t.status === "parcialmente_recebida") {
          sendsCountMap.set(t.loja_origem_id, (sendsCountMap.get(t.loja_origem_id) || 0) + 1);
          receivesCountMap.set(t.loja_destino_id, (receivesCountMap.get(t.loja_destino_id) || 0) + 1);
        }
      }

      // Calcular valores e quantidades em trânsito
      if (inTransitIds.length > 0) {
        const { data: transitItems } = await supabase
          .from("transferencia_estoque_itens")
          .select("quantidade_enviada, quantidade_recebida, custo_unitario")
          .in("transferencia_id", inTransitIds);

        if (transitItems) {
          for (const item of transitItems) {
            const emTransito = Number(item.quantidade_enviada) - Number(item.quantidade_recebida || 0);
            if (emTransito > 0) {
              produtosEmTransito += emTransito;
              valorEmTransito += emTransito * Number(item.custo_unitario || 0);
            }
          }
        }
      }
    }

    // Identificar lojas de maior movimentação
    let filialQueMaisEnvia = "Nenhuma";
    let maxSend = 0;
    for (const [id, count] of sendsCountMap.entries()) {
      if (count > maxSend) {
        maxSend = count;
        const { data: l } = await supabase.from("lojas").select("nome_loja").eq("id", id).single();
        if (l) filialQueMaisEnvia = l.nome_loja;
      }
    }

    let filialQueMaisRecebe = "Nenhuma";
    let maxRec = 0;
    for (const [id, count] of receivesCountMap.entries()) {
      if (count > maxRec) {
        maxRec = count;
        const { data: l } = await supabase.from("lojas").select("nome_loja").eq("id", id).single();
        if (l) filialQueMaisRecebe = l.nome_loja;
      }
    }

    // Economia gerada (15% do valor total transferido)
    let economiaGerada = 0;
    const { data: completedItems } = await supabase
      .from("transferencia_estoque_itens")
      .select("quantidade_recebida, custo_unitario")
      .eq("transferencia_id.status", "recebida"); // Join implícito se RLS permitir ou simplesmente carregando todos os recebidos
    
    // Para simplificar, buscamos itens de transferências concluídas
    const completedTransfIds = allTransfs?.filter(t => t.status === "recebida").map(t => t.id) || [];
    if (completedTransfIds.length > 0) {
      const { data: items } = await supabase
        .from("transferencia_estoque_itens")
        .select("quantidade_recebida, custo_unitario")
        .in("transferencia_id", completedTransfIds);
      
      if (items) {
        const totalRecebidoValor = items.reduce((acc, i) => acc + (Number(i.quantidade_recebida) * Number(i.custo_unitario)), 0);
        economiaGerada = totalRecebidoValor * 0.15; // 15% de economia de reposição capitalizada
      }
    }

    const tempoMedio = completedTransitsCount > 0
      ? totalTransitTimeMs / (1000 * 60 * 60 * 24 * completedTransitsCount) // em dias
      : 0;

    return {
      valorTotalEstoque,
      valorEmTransito,
      produtosEmTransito,
      transferenciasPendentes,
      transferenciasAtrasadas,
      produtosComRuptura,
      produtosComExcesso,
      filialQueMaisEnvia,
      filialQueMaisRecebe,
      tempoMedioTransferencia: Number(tempoMedio.toFixed(1)),
      economiaGerada: Number(economiaGerada.toFixed(2)),
    };
  } catch (error) {
    console.error("Erro em getEstoqueCorporativoKPIs:", error);
    return {
      valorTotalEstoque: 0,
      valorEmTransito: 0,
      produtosEmTransito: 0,
      transferenciasPendentes: 0,
      transferenciasAtrasadas: 0,
      produtosComRuptura: 0,
      produtosComExcesso: 0,
      filialQueMaisEnvia: "Nenhuma",
      filialQueMaisRecebe: "Nenhuma",
      tempoMedioTransferencia: 0,
      economiaGerada: 0,
    };
  }
}

// ============================================
// BUSCAR PRODUTOS NA ORIGEM PARA TRANSFERÊNCIA
// ============================================
export async function buscarProdutosOrigem(lojaId: string, search: string) {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("produtos")
      .select("id, produto_mestre_id, nome, sku, codigo_barras, preco_custo, estoque_atual, estoque_reservado")
      .eq("loja_id", lojaId)
      .eq("status", "ativo")
      .is("deleted_at", null);

    if (search && search.trim()) {
      query = query.or(`nome.ilike.%${search.trim()}%,codigo_barras.ilike.%${search.trim()}%,sku.ilike.%${search.trim()}%`);
    }

    const { data, error } = await query.limit(20);
    if (error) return { data: [], error: error.message };

    const formatted = (data || []).map((p: any) => ({
      id: p.id,
      produtoMestreId: p.produto_mestre_id,
      nome: p.nome,
      sku: p.sku || p.id.slice(0, 8),
      codigo_barras: p.codigo_barras || "",
      preco_custo: p.preco_custo || 0,
      estoque_disponivel: Math.max(0, Number(p.estoque_atual || 0) - Number(p.estoque_reservado || 0)),
      estoque_atual: p.estoque_atual || 0,
      estoque_reservado: p.estoque_reservado || 0
    }));

    return { data: formatted, error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
}

// ============================================
// CONFIGURAÇÕES DE WORKFLOW DE TRANSFERÊNCIA (ETAPA 1)
// ============================================
export async function getOrCreateTransferenciaFluxo(grupoId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("transferencias_fluxos")
      .select("*")
      .eq("grupo_id", grupoId)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    if (data) return { data, error: null };

    // Criar configuração padrão
    const { data: novoFluxo, error: createError } = await supabase
      .from("transferencias_fluxos")
      .insert({
        grupo_id: grupoId,
        exige_supervisor: false,
        exige_financeiro: false,
        exige_dono: false,
        exige_dupla_aprovacao: false,
        aprovacao_automatica: false
      })
      .select()
      .single();

    if (createError) return { data: null, error: createError.message };
    return { data: novoFluxo, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

export async function updateTransferenciaFluxo(config: {
  grupo_id: string;
  exige_supervisor: boolean;
  exige_financeiro: boolean;
  exige_dono: boolean;
  exige_dupla_aprovacao: boolean;
  aprovacao_automatica: boolean;
}) {
  try {
    const supabase = await createClient();
    const { user } = await validateTransferenciaRBAC("approve"); // Exige Dono
    if (user.role !== "dono" && !user.id) {
      return { error: "Apenas Donos podem configurar fluxos de governança." };
    }

    const { error } = await supabase
      .from("transferencias_fluxos")
      .update({
        exige_supervisor: config.exige_supervisor,
        exige_financeiro: config.exige_financeiro,
        exige_dono: config.exige_dono,
        exige_dupla_aprovacao: config.exige_dupla_aprovacao,
        aprovacao_automatica: config.aprovacao_automatica,
        updated_at: new Date().toISOString()
      })
      .eq("grupo_id", config.grupo_id);

    if (error) return { error: error.message };
    revalidatePath("/dashboard/estoque/transferencias");
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
}

// ============================================
// AGENDAMENTO / PROGRAMAÇÃO DE TRANSFERÊNCIAS (ETAPA 6)
// ============================================
export async function createTransferenciaAgendada(input: {
  lojaOrigemId: string;
  lojaDestinoId: string;
  frequencia: "uma_vez" | "diario" | "semanal" | "mensal";
  dataAgendada?: string;
  diaSemana?: number;
  diaMes?: number;
  motivo?: string;
  prioridade?: string;
  observacao?: string;
  itens: {
    produtoMestreId: string;
    quantidade: number;
  }[];
}) {
  try {
    const { user } = await validateTransferenciaRBAC("create", input.lojaOrigemId, input.lojaDestinoId);
    const supabase = await createClient();

    if (input.lojaOrigemId === input.lojaDestinoId) {
      return { error: "A loja de origem não pode ser igual à de destino." };
    }
    if (!input.itens || input.itens.length === 0) {
      return { error: "Adicione pelo menos um item ao agendamento." };
    }

    const { data: loja } = await supabase
      .from("lojas")
      .select("grupo_id")
      .eq("id", input.lojaOrigemId)
      .single();

    if (!loja) return { error: "Loja não localizada." };

    const { data: agenda, error: agendaError } = await supabase
      .from("transferencias_agendadas")
      .insert({
        grupo_id: loja.grupo_id,
        loja_origem_id: input.lojaOrigemId,
        loja_destino_id: input.lojaDestinoId,
        frequencia: input.frequencia,
        data_agendada: input.dataAgendada || null,
        dia_semana: input.diaSemana !== undefined ? input.diaSemana : null,
        dia_mes: input.diaMes !== undefined ? input.diaMes : null,
        motivo: input.motivo || "Reposição",
        prioridade: input.prioridade || "Normal",
        observacao: input.observacao || null,
        status: "ativo"
      })
      .select()
      .single();

    if (agendaError) return { error: `Erro no agendamento: ${agendaError.message}` };

    for (const item of input.itens) {
      const { error: itemError } = await supabase
        .from("transferencias_agendadas_itens")
        .insert({
          agendamento_id: agenda.id,
          produto_mestre_id: item.produtoMestreId,
          quantidade: item.quantidade
        });
      if (itemError) {
        await supabase.from("transferencias_agendadas").delete().eq("id", agenda.id);
        return { error: `Erro ao salvar item do agendamento: ${itemError.message}` };
      }
    }

    revalidatePath("/dashboard/estoque/transferencias");
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function listTransferenciasAgendadas() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Não autenticado." };

    const { data: profile } = await supabase
      .from("usuarios")
      .select("loja_id")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.loja_id) {
      return { data: [], error: "Perfil de usuário ou loja não encontrada." };
    }

    const { data: activeLoja } = await supabase
      .from("lojas")
      .select("grupo_id")
      .eq("id", profile.loja_id)
      .single();

    if (!activeLoja || !activeLoja.grupo_id) {
      return { data: [], error: "Loja ativa ou grupo corporativo não encontrado." };
    }

    const { data, error } = await supabase
      .from("transferencias_agendadas")
      .select(`
        *,
        loja_origem:lojas!transferencias_agendadas_loja_origem_id_fkey(id, nome_loja),
        loja_destino:lojas!transferencias_agendadas_loja_destino_id_fkey(id, nome_loja)
      `)
      .eq("grupo_id", activeLoja.grupo_id)
      .order("created_at", { ascending: false });

    if (error) return { data: [], error: error.message };

    const formatted = await Promise.all((data || []).map(async (a: any) => {
      const { data: itens } = await supabase
        .from("transferencias_agendadas_itens")
        .select(`
          *,
          produto_mestre:produtos_mestres(id, nome)
        `)
        .eq("agendamento_id", a.id);

      return {
        ...a,
        loja_origem_nome: a.loja_origem?.nome_loja,
        loja_destino_nome: a.loja_destino?.nome_loja,
        itens: (itens || []).map((i: any) => ({
          ...i,
          produto_nome: i.produto_mestre?.nome || "Produto",
          produto_sku: i.produto_mestre_id.slice(0, 8)
        }))
      };
    }));

    return { data: formatted, error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
}

export async function deleteTransferenciaAgendada(id: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("transferencias_agendadas")
      .delete()
      .eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/dashboard/estoque/transferencias");
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function executarAgendamentosCron() {
  try {
    const supabase = await createClient();
    const now = new Date();
    const hojeDiaSemana = now.getDay(); // 0-6
    const hojeDiaMes = now.getDate(); // 1-31
    const hojeStr = now.toISOString().split("T")[0];

    // Buscar agendamentos ativos
    const { data: agendamentos } = await supabase
      .from("transferencias_agendadas")
      .select("*")
      .eq("status", "ativo");

    if (!agendamentos || agendamentos.length === 0) return { executados: 0 };

    let executados = 0;

    for (const agenda of agendamentos) {
      let deveExecutar = false;

      if (agenda.frequencia === "uma_vez" && agenda.data_agendada) {
        const agStr = new Date(agenda.data_agendada).toISOString().split("T")[0];
        if (agStr === hojeStr) deveExecutar = true;
      } else if (agenda.frequencia === "diario") {
        deveExecutar = true;
      } else if (agenda.frequencia === "semanal" && agenda.dia_semana === hojeDiaSemana) {
        deveExecutar = true;
      } else if (agenda.frequencia === "mensal" && agenda.dia_mes === hojeDiaMes) {
        deveExecutar = true;
      }

      // Evitar dupla execução no mesmo dia
      if (agenda.ultima_execucao) {
        const ultStr = new Date(agenda.ultima_execucao).toISOString().split("T")[0];
        if (ultStr === hojeStr) deveExecutar = false;
      }

      if (deveExecutar) {
        // Carregar itens do agendamento
        const { data: itens } = await supabase
          .from("transferencias_agendadas_itens")
          .select("*")
          .eq("agendamento_id", agenda.id);

        if (itens && itens.length > 0) {
          // Criar a transferência
          const transfResult = await createTransferencia({
            lojaOrigemId: agenda.loja_origem_id,
            lojaDestinoId: agenda.loja_destino_id,
            motivo: agenda.motivo,
            prioridade: agenda.prioridade,
            observacao: agenda.observacao || "Gerada automaticamente por agendamento cron.",
            itens: itens.map(i => ({
              produtoMestreId: i.produto_mestre_id,
              quantidadeSolicitada: Number(i.quantidade)
            }))
          });

          if (transfResult.error) {
            await supabase
              .from("transferencias_agendadas")
              .update({
                status: "erro",
                ultimo_erro: transfResult.error,
                updated_at: new Date().toISOString()
              })
              .eq("id", agenda.id);
          } else {
            executados++;
            const proximoStatus = agenda.frequencia === "uma_vez" ? "executado" : "ativo";
            await supabase
              .from("transferencias_agendadas")
              .update({
                status: proximoStatus,
                ultima_execucao: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq("id", agenda.id);
          }
        }
      }
    }

    return { executados };
  } catch (error) {
    console.error("Erro no executarAgendamentosCron:", error);
    return { error };
  }
}

// ============================================
// ALGORITMO PREDITIVO E SUGESTÕES ESTENDIDAS (ETAPA 7, 8 & 13)
// ============================================
export async function getSmartForecastingAndSuggestions() {
  try {
    const supabase = await createClient();

    // 1. Carregar matriz consolidada
    const matrixRes = await getEstoqueCorporativoMatrix();
    if (matrixRes.error || !matrixRes.rows) {
      return { previsoes: [], sugestoes: [], sugestoesCompra: [], error: matrixRes.error };
    }

    const rows = matrixRes.rows;
    const lojas = matrixRes.lojasList;

    // 2. Buscar vendas dos últimos 30 dias de todo o grupo
    const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: vendas } = await supabase
      .from("venda_itens")
      .select("produto_id, quantidade, loja_id")
      .gte("created_at", trintaDiasAtras);

    // Agrupar vendas por [produto_id]
    const salesMap = new Map<string, number>();
    if (vendas) {
      for (const v of vendas) {
        const key = `${v.produto_id}`;
        salesMap.set(key, (salesMap.get(key) || 0) + Number(v.quantidade || 0));
      }
    }

    const previsoes: PrevisaoRuptura[] = [];
    const sugestoes: SmartSuggestion[] = [];
    const sugestoesCompra: any[] = [];

    // 3. Avaliar estoques e vendas por filial
    for (const row of rows) {
      for (const loja of lojas) {
        const est = row.estoquesPorLoja[loja.id];
        if (!est) continue;

        // Recuperar ID local do produto para verificar as vendas
        const { data: pLocal } = await supabase
          .from("produtos")
          .select("id, preco_custo, nome")
          .eq("produto_mestre_id", row.produtoMestreId)
          .eq("loja_id", loja.id)
          .maybeSingle();

        if (!pLocal) continue;

        const totalVendido = salesMap.get(pLocal.id) || 0;
        const mediaDiaria = Number((totalVendido / 30).toFixed(2));

        if (mediaDiaria > 0) {
          const diasRestantes = Math.floor(est.estoque_atual / mediaDiaria);

          // RUPTURA PREDITIVA (Acaba em 10 dias ou menos)
          if (diasRestantes <= 10) {
            const dataRuptura = new Date();
            dataRuptura.setDate(dataRuptura.getDate() + diasRestantes);

            previsoes.push({
              produtoId: pLocal.id,
              produtoMestreId: row.produtoMestreId,
              produtoNome: row.produtoNome,
              sku: row.produtoSku,
              barcode: row.produtoBarcode,
              lojaId: loja.id,
              lojaNome: loja.nome_loja,
              estoqueAtual: est.estoque_atual,
              estoqueMinimo: est.estoque_minimo,
              mediaDiariaVendas: mediaDiaria,
              diasRestantes,
              dataPrevisaoRuptura: dataRuptura.toISOString().split("T")[0]
            });

            // Procurar filiais doadoras saudáveis (que tenham excesso)
            let doadoraEncontrada = false;
            const doadoras = lojas
              .map(l => ({ lojaId: l.id, nome: l.nome_loja, ...row.estoquesPorLoja[l.id] }))
              .filter(e => e.lojaId !== loja.id && e.estoque_atual > e.estoque_minimo * 1.8 && e.estoque_atual > 10);

            if (doadoras.length > 0) {
              doadoras.sort((a, b) => b.estoque_atual - a.estoque_atual);
              const doadora = doadoras[0];
              const margemSegura = doadora.estoque_atual - doadora.estoque_reservado - doadora.estoque_minimo;

              if (margemSegura > 5) {
                // Sugerir reposição para cobrir 30 dias de vendas
                const qtdSugerida = Math.min(Math.ceil(mediaDiaria * 30), margemSegura);
                const valorEstoque = qtdSugerida * (pLocal.preco_custo || 10);
                const frete = 45;
                const economiaObtida = (valorEstoque * 0.15) - frete;

                sugestoes.push({
                  produtoMestreId: row.produtoMestreId,
                  produtoNome: row.produtoNome,
                  produtoSku: row.produtoSku,
                  produtoBarcode: row.produtoBarcode,
                  lojaOrigemId: doadora.lojaId,
                  lojaOrigemNome: doadora.nome,
                  estoqueOrigemDisponivel: doadora.estoque_atual - doadora.estoque_reservado,
                  lojaDestinoId: loja.id,
                  lojaDestinoNome: loja.nome_loja,
                  estoqueDestinoAtual: est.estoque_atual,
                  estoqueDestinoMinimo: est.estoque_minimo,
                  quantidadeSugerida: qtdSugerida,
                  razao: `Ruptura predita para daqui a ${diasRestantes} dias na filial "${loja.nome_loja}". Sugerido remanejamento de excesso.`,
                  valorEstoque,
                  frete,
                  tempoEstimado: 2,
                  economiaObtida: Number(Math.max(0, economiaObtida).toFixed(2))
                });
                doadoraEncontrada = true;
              }
            }

            // Se nenhuma filial puder doar, sugere um Pedido de Compra (Etapa 13)
            if (!doadoraEncontrada) {
              const qtdSugerida = Math.ceil(mediaDiaria * 30);
              sugestoesCompra.push({
                produtoMestreId: row.produtoMestreId,
                produtoNome: row.produtoNome,
                sku: row.produtoSku,
                lojaDestinoId: loja.id,
                lojaDestinoNome: loja.nome_loja,
                quantidadeSugerida: qtdSugerida,
                precoCustoMedio: pLocal.preco_custo || 10,
                fornecedorSugerido: "Fornecedor Parceiro SA",
                leadTimeEstimado: 5
              });
            }
          }
        }
      }
    }

    return { previsoes, sugestoes, sugestoesCompra, error: null };
  } catch (err: any) {
    console.error("Erro em getSmartForecastingAndSuggestions:", err);
    return { previsoes: [], sugestoes: [], sugestoesCompra: [], error: err.message };
  }
}


