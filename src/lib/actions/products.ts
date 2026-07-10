"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { BusinessEngine } from "@/lib/business-engine";
import type {
  Product,
  ProductInsert,
  ProductUpdate,
  ProductFilter,
  ProductKPIs,
  ProductActivity,
  ProductStockAudit,
  ProductStoreConfig,
  ProductMestreHistory,
} from "@/lib/types/produtos";

function safeParseNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  const str = String(val).trim();
  if (!str) return 0;
  let cleaned = str;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",")) {
    cleaned = cleaned.replace(",", ".");
  }
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// ============================================
// HELPER: VALIDAÇÃO DE PERMISSÕES E RBAC NO SERVIDOR
// ============================================
async function validateProductRBAC(
  action: "create" | "update" | "delete" | "restore" | "remove_filial",
  targetLojaId?: string,
  fieldsEdited?: {
    hasPriceCostChange?: boolean;
    hasStockChange?: boolean;
    hasGlobalChange?: boolean;
  }
) {
  const context = await BusinessEngine.getContext();
  
  // 1. Validar permissão básica utilizando o Core Engine
  const engineAction = action === "create" ? "produto:criar" : "produto:editar";
  const dec = BusinessEngine.permissions.check(context, engineAction);
  if (!dec.allowed) {
    throw new Error(dec.reason || "Acesso negado: Permissão de produto insuficiente.");
  }

  const tipo = context.actor.tipo;
  const userLojaId = context.tenant.lojaId;

  // 2. Usuários operacionais só editam a sua própria filial ativa
  if (tipo !== "dono" && targetLojaId && targetLojaId !== userLojaId) {
    throw new Error("Acesso negado: Você não possui permissão para gerenciar produtos em outras filiais.");
  }

  // 3. Validação granular por campo (Supervisor e Estoquista)
  if (fieldsEdited) {
    // Estoquista não edita preço/custo ou campos globais
    if (tipo === "estoquista") {
      if (fieldsEdited.hasPriceCostChange) {
        throw new Error("Acesso negado: Estoquistas não possuem permissão para alterar preços ou custos.");
      }
      if (fieldsEdited.hasGlobalChange) {
        throw new Error("Acesso negado: Estoquistas não possuem permissão para alterar atributos globais (Produto Mestre).");
      }
    }

    // Supervisor não altera campos globais (só preço e estoque locais)
    if (tipo === "supervisor") {
      if (fieldsEdited.hasGlobalChange) {
        throw new Error("Acesso negado: Supervisores não possuem permissão para alterar atributos globais (Produto Mestre).");
      }
    }

    // Gerente não altera campos globais (somente configurações locais de sua loja)
    if (tipo === "gerente") {
      if (fieldsEdited.hasGlobalChange) {
        throw new Error("Acesso negado: Gerentes não possuem permissão para alterar atributos globais corporativos.");
      }
    }
  }

  // Obter usuário do Auth para compatibilidade de tipo de retorno das ações filhas
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado no sistema.");

  return { 
    user, 
    profile: { 
      loja_id: userLojaId, 
      tipo, 
      nome: context.actor.nome 
    } 
  };
}

// ============================================
// LISTAR PRODUTOS (com filtros, busca, paginação)
// ============================================
export async function listProducts(filters: ProductFilter = {}) {
  const supabase = await createClient();
  const {
    search,
    categoria_id,
    status = "ativo",
    estoque = "todos",
    favorito,
    destaque,
    sortBy = "created_at",
    sortDir = "desc",
    page = 1,
    perPage = 25,
  } = filters;

  let query = supabase
    .from("produtos")
    .select("*, categoria:categorias(id, nome)", { count: "exact" })
    .is("deleted_at", null);

  // Filtro de status
  if (status !== "todos") {
    query = query.eq("status", status);
  }

  // Filtro de categoria
  if (categoria_id) {
    query = query.eq("categoria_id", categoria_id);
  }

  // Filtro de favorito
  if (favorito !== undefined) {
    query = query.eq("favorito", favorito);
  }

  // Filtro de destaque
  if (destaque !== undefined) {
    query = query.eq("destaque", destaque);
  }

  // Filtro de estoque
  if (estoque === "zerado") {
    query = query.lte("estoque_atual", 0);
  }

  // Busca textual (nome, SKU, código de barras, marca)
  if (search && search.trim().length > 0) {
    const term = search.trim();
    query = query.or(
      `nome.ilike.%${term}%,sku.ilike.%${term}%,codigo_barras.ilike.%${term}%,marca.ilike.%${term}%`
    );
  }

  // Ordenação
  const validSortFields: Record<string, string> = {
    nome: "nome",
    preco_venda: "preco_venda",
    preco_custo: "preco_custo",
    estoque_atual: "estoque_atual",
    created_at: "created_at",
    updated_at: "updated_at",
  };

  const sortField = validSortFields[sortBy] || "created_at";
  query = query.order(sortField, { ascending: sortDir === "asc" });

  // Paginação
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return { data: [], count: 0, error: error.message };
  }

  let filteredData = (data as Product[]) || [];
  
  // Filtro client-side complementar para estoque baixo
  if (estoque === "baixo") {
    filteredData = filteredData.filter(
      (p) => Number(p.estoque_atual) > 0 && Number(p.estoque_atual) <= Number(p.estoque_minimo)
    );
  }

  return { data: filteredData, count: count || 0, error: null };
}

// ============================================
// BUSCAR PRODUTO POR ID
// ============================================
export async function getProduct(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("produtos")
    .select("*, categoria:categorias(id, nome)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as Product, error: null };
}

// ============================================
// CALCULAR KPIs DO DASHBOARD DE PRODUTOS
// ============================================
export async function getProductKPIs(): Promise<ProductKPIs> {
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("produtos")
    .select("preco_custo, preco_venda, estoque_atual, estoque_minimo, status")
    .is("deleted_at", null);

  if (!products || products.length === 0) {
    return {
      total: 0,
      ativos: 0,
      semEstoque: 0,
      estoqueBaixo: 0,
      valorEstoque: 0,
      margemMedia: 0,
      giroAlto: 0,
      giroBaixo: 0,
    };
  }

  const total = products.length;
  const ativos = products.filter((p) => p.status === "ativo").length;
  const semEstoque = products.filter((p) => Number(p.estoque_atual) <= 0).length;
  const estoqueBaixo = products.filter(
    (p) => Number(p.estoque_atual) > 0 && Number(p.estoque_atual) <= Number(p.estoque_minimo)
  ).length;

  const valorEstoque = products.reduce(
    (acc, p) => acc + Number(p.preco_custo) * Math.max(Number(p.estoque_atual), 0),
    0
  );

  const margems = products
    .filter((p) => Number(p.preco_venda) > 0)
    .map((p) => ((Number(p.preco_venda) - Number(p.preco_custo)) / Number(p.preco_venda)) * 100);

  const margemMedia =
    margems.length > 0
      ? margems.reduce((a, b) => a + b, 0) / margems.length
      : 0;

  return {
    total,
    ativos,
    semEstoque,
    estoqueBaixo,
    valorEstoque,
    margemMedia,
    giroAlto: 0,
    giroBaixo: 0,
  };
}

// Helper: obter ou criar categoria equivalente na filial de destino pelo nome
async function obterOuCriarCategoriaEquivalente(
  categoriaIdOriginal: string | null | undefined,
  lojaDestinoId: string,
  supabase: any
): Promise<string | null> {
  if (!categoriaIdOriginal) return null;

  // 1. Obter nome da categoria original
  const { data: catOriginal } = await supabase
    .from("categorias")
    .select("nome")
    .eq("id", categoriaIdOriginal)
    .maybeSingle();

  if (!catOriginal) return null;

  const nomeCat = catOriginal.nome;

  // 2. Procurar categoria com mesmo nome na loja de destino
  const { data: catDestino } = await supabase
    .from("categorias")
    .select("id")
    .eq("loja_id", lojaDestinoId)
    .eq("nome", nomeCat)
    .maybeSingle();

  if (catDestino) {
    return catDestino.id;
  }

  // 3. Se não existir, criar a categoria na loja de destino
  const { data: novaCat, error: insertError } = await supabase
    .from("categorias")
    .insert({
      loja_id: lojaDestinoId,
      nome: nomeCat,
      status: "ativo"
    })
    .select("id")
    .single();

  if (insertError || !novaCat) {
    console.error("Erro ao sincronizar categoria para a filial:", insertError);
    return null;
  }

  return novaCat.id;
}

// ============================================
// OBTER CONFIGURAÇÕES DE TODAS AS FILIAIS DO GRUPO
// ============================================
export async function getProductGroupDetails(produtoMestreId: string): Promise<Product[]> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("produtos")
      .select("*, categoria:categorias(id, nome)")
      .eq("produto_mestre_id", produtoMestreId)
      .is("deleted_at", null);
      
    if (error) {
      console.error("Erro ao obter detalhes de grupo do produto:", error);
      return [];
    }
    
    return (data || []) as Product[];
  } catch (error) {
    console.error("Erro em getProductGroupDetails:", error);
    return [];
  }
}

// ============================================
// CRIAR PRODUTO MESTRE E DISTRIBUIR (Multi-Filiais)
// ============================================
export async function createProduct(input: ProductInsert) {
  try {
    const { user, profile } = await validateProductRBAC("create", undefined, { hasGlobalChange: true });
    const supabase = await createClient();

    // 1. Obter grupo_id da loja ativa do usuário
    const { data: activeStore } = await supabase
      .from("lojas")
      .select("grupo_id, nome_loja")
      .eq("id", profile.loja_id)
      .single();

    if (!activeStore) {
      return { data: null, error: "Grupo empresarial da loja ativa não encontrado." };
    }

    const grupoId = activeStore.grupo_id;

    // 2. Obter nome da categoria (local) se selecionada
    let categoryName: string | null = null;
    if (input.categoria_id) {
      const { data: cat } = await supabase
        .from("categorias")
        .select("nome")
        .eq("id", input.categoria_id)
        .single();
      if (cat) categoryName = cat.nome;
    }

    // 3. Inserir o registro em produtos_mestres
    const mestreId = crypto.randomUUID();
    const { data: mestre, error: mestreError } = await supabase
      .from("produtos_mestres")
      .insert({
        id: mestreId,
        grupo_id: grupoId,
        nome: input.nome,
        descricao: input.descricao || null,
        marca: input.marca || null,
        categoria_nome: categoryName,
        codigo_barras: input.codigo_barras || null,
        unidade: input.unidade || "UN",
        foto_url: input.foto_url || null,
        fotos_galeria: input.fotos_galeria || [],
        favorito: input.favorito ?? false,
        destaque: input.destaque ?? false,
        ncm: input.ncm || null,
        cest: input.cest || null,
        origem_fiscal: input.origem_fiscal || null,
      })
      .select()
      .single();

    if (mestreError) {
      return { data: null, error: `Erro ao criar produto corporativo: ${mestreError.message}` };
    }

    // 4. Preparar distribuição para as filiais selecionadas
    const targetConfigs = input.lojas_config || [];
    let primaryProduct: any = null;

    // Caso clássico: sem configurações detalhadas por loja, distribui na loja ativa
    if (targetConfigs.length === 0) {
      const { data: localProd, error: localError } = await supabase
        .from("produtos")
        .insert({
          loja_id: profile.loja_id,
          produto_mestre_id: mestreId,
          produto_grupo_id: mestreId, // retrocompatibilidade
          categoria_id: input.categoria_id || null,
          nome: input.nome,
          sku: input.sku || null,
          codigo_barras: input.codigo_barras || null,
          marca: input.marca || null,
          descricao: input.descricao || null,
          foto_url: input.foto_url || null,
          unidade: input.unidade || "UN",
          favorito: input.favorito ?? false,
          destaque: input.destaque ?? false,
          ncm: input.ncm || null,
          cest: input.cest || null,
          origem_fiscal: input.origem_fiscal || null,
          
          // Campos locais
          preco_custo: input.preco_custo,
          preco_venda: input.preco_venda,
          preco_promocional: input.preco_promocional ?? 0,
          estoque_atual: input.estoque_atual ?? 0,
          estoque_minimo: input.estoque_minimo ?? 0,
          estoque_maximo: input.estoque_maximo ?? 0,
          corredor: input.corredor || null,
          prateleira: input.prateleira || null,
          deposito: input.deposito || null,
          lote: input.lote || null,
          validade: input.validade || null,
          status: input.status || "ativo",
          permitir_venda: input.permitir_venda ?? true,
          permitir_compra: input.permitir_compra ?? true,
          permitir_transferencia: input.permitir_transferencia ?? true,
        })
        .select()
        .single();

      if (localError) {
        return { data: null, error: `Erro ao criar produto local: ${localError.message}` };
      }
      primaryProduct = localProd;

      // Registrar movimentação de estoque inicial se maior que zero
      if (Number(input.estoque_atual) > 0) {
        await supabase.from("movimentacoes_estoque").insert({
          loja_id: profile.loja_id,
          produto_id: localProd.id,
          tipo: "entrada",
          quantidade: Number(input.estoque_atual),
          motivo: "ajuste",
          usuario_id: user.id,
        });
      }
    } else {
      // Caso multi-filiais: distribuir para cada filial da lista
      for (const config of targetConfigs) {
        const mappedCatId = await obterOuCriarCategoriaEquivalente(input.categoria_id, config.loja_id, supabase);

        const { data: insertedProduct, error: insertError } = await supabase
          .from("produtos")
          .insert({
            loja_id: config.loja_id,
            produto_mestre_id: mestreId,
            produto_grupo_id: mestreId, // retrocompatibilidade
            categoria_id: mappedCatId,
            nome: input.nome,
            sku: config.sku || input.sku || null,
            codigo_barras: input.codigo_barras || null,
            marca: input.marca || null,
            descricao: input.descricao || null,
            foto_url: input.foto_url || null,
            unidade: input.unidade || "UN",
            favorito: input.favorito ?? false,
            destaque: input.destaque ?? false,
            ncm: input.ncm || null,
            cest: input.cest || null,
            origem_fiscal: input.origem_fiscal || null,

            // Campos locais específicos da filial
            preco_custo: config.preco_custo,
            preco_venda: config.preco_venda,
            preco_promocional: config.preco_promocional ?? 0,
            estoque_atual: config.estoque_atual ?? 0,
            estoque_minimo: config.estoque_minimo ?? 0,
            estoque_maximo: config.estoque_maximo ?? 0,
            corredor: config.corredor || null,
            prateleira: config.prateleira || null,
            deposito: config.deposito || null,
            lote: config.lote || null,
            validade: config.validade || null,
            status: config.status || "ativo",
            permitir_venda: config.permitir_venda ?? true,
            permitir_compra: config.permitir_compra ?? true,
            permitir_transferencia: config.permitir_transferencia ?? true,
          })
          .select()
          .single();

        if (insertError) {
          console.error("Erro ao criar produto na filial:", insertError);
          return { data: null, error: `Erro na filial ${config.loja_id}: ${insertError.message}` };
        }

        // Definir produto de retorno primário
        if (config.loja_id === profile.loja_id || !primaryProduct) {
          primaryProduct = insertedProduct;
        }

        // Registrar movimentação de estoque inicial na filial correspondente
        if (Number(config.estoque_atual) > 0) {
          await supabase.from("movimentacoes_estoque").insert({
            loja_id: config.loja_id,
            produto_id: insertedProduct.id,
            tipo: "entrada",
            quantidade: Number(config.estoque_atual),
            motivo: "ajuste",
            usuario_id: user.id,
          });
        }
      }
    }

    // 5. Registrar log estruturado em produtos_mestres_historico
    await supabase.from("produtos_mestres_historico").insert({
      produto_mestre_id: mestreId,
      grupo_id: grupoId,
      loja_id: profile.loja_id,
      usuario_id: user.id,
      acao: "criacao",
      escopo: "global",
      dados_novos: mestre,
    });

    revalidatePath("/dashboard/produtos");
    return { data: primaryProduct as Product, error: null };
  } catch (error: any) {
    console.error("Erro no createProduct:", error);
    return { data: null, error: error.message || "Erro desconhecido ao criar produto." };
  }
}

// ============================================
// ATUALIZAR PRODUTO E GOVERNANÇA DE CONFIGURAÇÕES
// ============================================
export async function updateProduct(id: string, input: ProductUpdate) {
  try {
    const supabase = await createClient();

    // 1. Obter estado atual do produto local
    const { data: beforeLocal } = await supabase
      .from("produtos")
      .select("*")
      .eq("id", id)
      .single();

    if (!beforeLocal) {
      return { data: null, error: "Produto local não encontrado para edição." };
    }

    const mestreId = beforeLocal.produto_mestre_id;
    if (!mestreId) {
      return { data: null, error: "Este produto não possui um Produto Mestre associado." };
    }

    // 2. Obter estado atual do produto mestre
    const { data: beforeMestre } = await supabase
      .from("produtos_mestres")
      .select("*")
      .eq("id", mestreId)
      .single();

    if (!beforeMestre) {
      return { data: null, error: "Produto Mestre corporativo não encontrado." };
    }

    // 3. Detectar alterações para validação de RBAC
    const globalKeys = [
      "nome", "descricao", "marca", "codigo_barras", "unidade", 
      "foto_url", "fotos_galeria", "favorito", "destaque", "ncm", "cest", "origem_fiscal"
    ];
    
    let hasGlobalChange = globalKeys.some(key => input[key as keyof ProductUpdate] !== undefined);
    if (input.categoria_id !== undefined) hasGlobalChange = true;

    let hasPriceCostChange = false;
    let hasStockChange = false;

    if (input.preco_custo !== undefined || input.preco_venda !== undefined || input.preco_promocional !== undefined) {
      hasPriceCostChange = true;
    }

    if (input.estoque_atual !== undefined || input.estoque_minimo !== undefined || input.estoque_maximo !== undefined) {
      hasStockChange = true;
    }

    // Analisar lojas_config para alterações
    if (input.lojas_config) {
      for (const config of input.lojas_config) {
        if (config.preco_custo !== undefined || config.preco_venda !== undefined || config.preco_promocional !== undefined) {
          hasPriceCostChange = true;
        }
        if (config.estoque_atual !== undefined || config.estoque_minimo !== undefined || config.estoque_maximo !== undefined) {
          hasStockChange = true;
        }
      }
    }

    // 4. Validar RBAC no servidor
    const { user, profile } = await validateProductRBAC(
      "update", 
      beforeLocal.loja_id, 
      { hasGlobalChange, hasPriceCostChange, hasStockChange }
    );

    // 5. ATUALIZAÇÃO DO PRODUTO MESTRE (CORPORATIVO)
    const globalPayload: Record<string, any> = {};
    for (const key of globalKeys) {
      if (input[key as keyof ProductUpdate] !== undefined) {
        globalPayload[key] = input[key as keyof ProductUpdate];
      }
    }

    // Tratar categoria global
    if (input.categoria_id !== undefined) {
      let catName: string | null = null;
      if (input.categoria_id) {
        const { data: cat } = await supabase
          .from("categorias")
          .select("nome")
          .eq("id", input.categoria_id)
          .single();
        if (cat) catName = cat.nome;
      }
      globalPayload.categoria_nome = catName;
    }

    let updatedMestre = beforeMestre;
    if (Object.keys(globalPayload).length > 0) {
      const { data: newMestre, error: mestreError } = await supabase
        .from("produtos_mestres")
        .update(globalPayload)
        .eq("id", mestreId)
        .select()
        .single();

      if (mestreError) {
        return { data: null, error: `Erro ao atualizar Produto Mestre: ${mestreError.message}` };
      }
      updatedMestre = newMestre;

      // Gravar log de alteração global/mestre
      await supabase.from("produtos_mestres_historico").insert({
        produto_mestre_id: mestreId,
        grupo_id: beforeMestre.grupo_id,
        loja_id: profile.loja_id,
        usuario_id: user.id,
        acao: "edicao",
        escopo: "global",
        dados_anteriores: beforeMestre,
        dados_novos: newMestre,
      });

      // Se solicitado sincronização global, propagar campos para TODAS as filiais do grupo
      if (input.disponibilidade_todas || input.produto_mestre_id === undefined) {
        // Atualizar todas as filiais
        const { error: syncLocalError } = await supabase
          .from("produtos")
          .update({
            nome: updatedMestre.nome,
            descricao: updatedMestre.descricao,
            marca: updatedMestre.marca,
            codigo_barras: updatedMestre.codigo_barras,
            unidade: updatedMestre.unidade,
            foto_url: updatedMestre.foto_url,
            favorito: updatedMestre.favorito,
            destaque: updatedMestre.destaque,
            ncm: updatedMestre.ncm,
            cest: updatedMestre.cest,
            origem_fiscal: updatedMestre.origem_fiscal,
          })
          .eq("produto_mestre_id", mestreId);

        if (syncLocalError) {
          console.error("Erro ao propagar atributos globais para filiais:", syncLocalError);
        }

        // Propagar categoria global por mapeamento de nome
        if (input.categoria_id !== undefined) {
          const { data: branchProducts } = await supabase
            .from("produtos")
            .select("id, loja_id")
            .eq("produto_mestre_id", mestreId);

          if (branchProducts) {
            for (const bp of branchProducts) {
              const mappedCatId = await obterOuCriarCategoriaEquivalente(input.categoria_id, bp.loja_id, supabase);
              await supabase
                .from("produtos")
                .update({ categoria_id: mappedCatId })
                .eq("id", bp.id);
            }
          }
        }
      }
    }

    // 6. ATUALIZAÇÃO CONFIGURAÇÕES LOCAIS (POR FILIAL)
    const targetConfigs = input.lojas_config;

    if (targetConfigs !== undefined) {
      // Carregar produtos locais existentes do grupo
      const { data: existingGroupProducts } = await supabase
        .from("produtos")
        .select("*")
        .eq("produto_mestre_id", mestreId);

      const existingMap = new Map(existingGroupProducts?.map(p => [p.loja_id, p]) || []);
      const selectedLojaIds = new Set(targetConfigs.map(c => c.loja_id));

      // A) Desativação e soft-delete de filiais desmarcadas (apenas se o operador for Dono)
      if (profile.tipo === "dono") {
        for (const match of existingGroupProducts || []) {
          if (!selectedLojaIds.has(match.loja_id)) {
            await supabase
              .from("produtos")
              .update({
                status: "inativo",
                permitir_venda: false,
                deleted_at: new Date().toISOString()
              })
              .eq("id", match.id);

            // Log de desativação local
            await supabase.from("produtos_mestres_historico").insert({
              produto_mestre_id: mestreId,
              grupo_id: beforeMestre.grupo_id,
              loja_id: match.loja_id,
              usuario_id: user.id,
              acao: "desativacao_filial",
              escopo: "local",
              dados_anteriores: { status: match.status, permitir_venda: match.permitir_venda },
              dados_novos: { status: "inativo", permitir_venda: false, deleted_at: new Date().toISOString() }
            });
          }
        }
      }

      let totalDebitarLojaPrincipal = 0;

      for (const config of targetConfigs) {
        // Validar que gerente/supervisor só altere sua própria loja
        if (profile.tipo !== "dono" && config.loja_id !== profile.loja_id) {
          continue; // Pular silenciosamente ou bloquear
        }

        const match = existingMap.get(config.loja_id);

        if (match) {
          // B) FILIAL EXISTENTE: ATUALIZAR CONFIGURAÇÃO (Restaurar e atualizar)
          const updates: Record<string, any> = {
            sku: config.sku !== undefined ? config.sku : match.sku,
            preco_venda: config.preco_venda !== undefined ? safeParseNumber(config.preco_venda) : match.preco_venda,
            preco_custo: config.preco_custo !== undefined ? safeParseNumber(config.preco_custo) : match.preco_custo,
            preco_promocional: config.preco_promocional !== undefined ? safeParseNumber(config.preco_promocional) : match.preco_promocional,
            estoque_minimo: config.estoque_minimo !== undefined ? safeParseNumber(config.estoque_minimo) : match.estoque_minimo,
            estoque_maximo: config.estoque_maximo !== undefined ? safeParseNumber(config.estoque_maximo) : match.estoque_maximo,
            corredor: config.corredor !== undefined ? config.corredor : match.corredor,
            prateleira: config.prateleira !== undefined ? config.prateleira : match.prateleira,
            deposito: config.deposito !== undefined ? config.deposito : match.deposito,
            lote: config.lote !== undefined ? config.lote : match.lote,
            validade: config.validade !== undefined ? config.validade : match.validade,
            
            // Force restore/activation fields
            deleted_at: null,
            status: config.status !== undefined ? config.status : "ativo",
            permitir_venda: config.permitir_venda !== undefined ? config.permitir_venda : true,
            permitir_compra: config.permitir_compra !== undefined ? config.permitir_compra : true,
            permitir_transferencia: config.permitir_transferencia !== undefined ? config.permitir_transferencia : true,
          };

          // 1) Lógica de alteração de estoque (Gerar movimentações de estoque, sem alteração silenciosa)
          if (config.estoque_atual !== undefined && safeParseNumber(config.estoque_atual) !== Number(match.estoque_atual)) {
            const diff = safeParseNumber(config.estoque_atual) - Number(match.estoque_atual);
            if (diff !== 0) {
              // Adiciona campo para ser atualizado
              updates.estoque_atual = safeParseNumber(config.estoque_atual);

              // Gravar movimentação de estoque de ajuste
              await supabase.from("movimentacoes_estoque").insert({
                loja_id: config.loja_id,
                produto_id: match.id,
                tipo: diff > 0 ? "entrada" : "saida",
                quantidade: Math.abs(diff),
                motivo: "ajuste",
                usuario_id: user.id,
              });

              // Log de auditoria de ajuste de estoque
              await supabase.from("produtos_mestres_historico").insert({
                produto_mestre_id: mestreId,
                grupo_id: beforeMestre.grupo_id,
                loja_id: config.loja_id,
                usuario_id: user.id,
                acao: "ajuste_estoque",
                escopo: "local",
                dados_anteriores: { estoque_atual: match.estoque_atual },
                dados_novos: { estoque_atual: safeParseNumber(config.estoque_atual), diferenca: diff },
              });

              // Se for uma filial, debitar a diferença positiva da Matriz (loja ativa do dono)
              if (config.loja_id !== profile.loja_id && diff > 0) {
                totalDebitarLojaPrincipal += diff;
              }
            }
          }

          // 2) Lógica de alteração de preço e custo (Gerar log contendo preço/custo/margem)
          const precoAlterado = config.preco_venda !== undefined && safeParseNumber(config.preco_venda) !== Number(match.preco_venda);
          const custoAlterado = config.preco_custo !== undefined && safeParseNumber(config.preco_custo) !== Number(match.preco_custo);

          if (precoAlterado || custoAlterado) {
            const margemAntiga = Number(match.preco_venda) > 0 ? ((Number(match.preco_venda) - Number(match.preco_custo)) / Number(match.preco_venda)) * 100 : 0;
            const novoPreco = config.preco_venda !== undefined ? safeParseNumber(config.preco_venda) : Number(match.preco_venda);
            const novoCusto = config.preco_custo !== undefined ? safeParseNumber(config.preco_custo) : Number(match.preco_custo);
            const margemNova = novoPreco > 0 ? ((novoPreco - novoCusto) / novoPreco) * 100 : 0;

            await supabase.from("produtos_mestres_historico").insert({
              produto_mestre_id: mestreId,
              grupo_id: beforeMestre.grupo_id,
              loja_id: config.loja_id,
              usuario_id: user.id,
              acao: "alteracao_preco",
              escopo: "local",
              dados_anteriores: { 
                preco_venda: match.preco_venda, 
                preco_custo: match.preco_custo,
                margem: margemAntiga
              },
              dados_novos: { 
                preco_venda: novoPreco, 
                preco_custo: novoCusto,
                margem: margemNova
              },
            });
          }

          // Aplicar as atualizações no banco
          await supabase
            .from("produtos")
            .update(updates)
            .eq("id", match.id);

        } else {
          // C) NOVA FILIAL: DISTRIBUIR PRODUTO (CRIAR CÓPIA LOCAL)
          const mappedCatId = await obterOuCriarCategoriaEquivalente(input.categoria_id || beforeLocal.categoria_id, config.loja_id, supabase);

          const { data: newLocal, error: insertError } = await supabase
            .from("produtos")
            .insert({
              loja_id: config.loja_id,
              produto_mestre_id: mestreId,
              produto_grupo_id: mestreId, // retrocompatibilidade
              categoria_id: mappedCatId,
              nome: updatedMestre.nome,
              sku: config.sku || null,
              codigo_barras: updatedMestre.codigo_barras,
              marca: updatedMestre.marca,
              descricao: updatedMestre.descricao,
              foto_url: updatedMestre.foto_url,
              unidade: updatedMestre.unidade,
              favorito: updatedMestre.favorito,
              destaque: updatedMestre.destaque,
              ncm: updatedMestre.ncm,
              cest: updatedMestre.cest,
              origem_fiscal: updatedMestre.origem_fiscal,

              preco_custo: safeParseNumber(config.preco_custo),
              preco_venda: safeParseNumber(config.preco_venda),
              preco_promocional: safeParseNumber(config.preco_promocional ?? 0),
              estoque_atual: safeParseNumber(config.estoque_atual ?? 0),
              estoque_minimo: safeParseNumber(config.estoque_minimo ?? 0),
              estoque_maximo: safeParseNumber(config.estoque_maximo ?? 0),
              corredor: config.corredor || null,
              prateleira: config.prateleira || null,
              deposito: config.deposito || null,
              lote: config.lote || null,
              validade: config.validade || null,
              status: config.status || "ativo",
              permitir_venda: config.permitir_venda ?? true,
              permitir_compra: config.permitir_compra ?? true,
              permitir_transferencia: config.permitir_transferencia ?? true,
            })
            .select()
            .single();

          if (insertError) {
            console.error("Erro ao distribuir produto para nova filial:", insertError);
            return { data: null, error: `Erro ao distribuir na filial ${config.loja_id}: ${insertError.message}` };
          }

          // Registrar estoque inicial na nova filial
          const estoqueInicial = safeParseNumber(config.estoque_atual ?? 0);
          if (estoqueInicial > 0) {
            await supabase.from("movimentacoes_estoque").insert({
              loja_id: config.loja_id,
              produto_id: newLocal.id,
              tipo: "entrada",
              quantidade: estoqueInicial,
              motivo: "ajuste",
              usuario_id: user.id,
            });

            // Se for filial, adicionar ao total para ser debitado da Matriz
            if (config.loja_id !== profile.loja_id) {
              totalDebitarLojaPrincipal += estoqueInicial;
            }
          }

          // Log de distribuição
          await supabase.from("produtos_mestres_historico").insert({
            produto_mestre_id: mestreId,
            grupo_id: beforeMestre.grupo_id,
            loja_id: config.loja_id,
            usuario_id: user.id,
            acao: "distribuicao",
            escopo: "local",
            dados_novos: newLocal,
          });
        }
      }

      // Se houver estoque para debitar da loja principal (Matriz)
      if (totalDebitarLojaPrincipal > 0) {
        const produtoLojaPrincipal = existingGroupProducts?.find(p => p.loja_id === profile.loja_id);
        if (produtoLojaPrincipal) {
          // Buscar estoque mais atualizado da Matriz no banco
          const { data: latestPrincipal } = await supabase
            .from("produtos")
            .select("estoque_atual")
            .eq("id", produtoLojaPrincipal.id)
            .single();

          if (latestPrincipal) {
            const novoEstoque = Number(latestPrincipal.estoque_atual) - totalDebitarLojaPrincipal;
            
            await supabase
              .from("produtos")
              .update({ estoque_atual: novoEstoque })
              .eq("id", produtoLojaPrincipal.id);

            await supabase.from("movimentacoes_estoque").insert({
              loja_id: profile.loja_id,
              produto_id: produtoLojaPrincipal.id,
              tipo: "saida",
              quantidade: totalDebitarLojaPrincipal,
              motivo: "transferencia",
              usuario_id: user.id,
            });

            await supabase.from("produtos_mestres_historico").insert({
              produto_mestre_id: mestreId,
              grupo_id: beforeMestre.grupo_id,
              loja_id: profile.loja_id,
              usuario_id: user.id,
              acao: "ajuste_estoque",
              escopo: "local",
              dados_anteriores: { estoque_atual: latestPrincipal.estoque_atual },
              dados_novos: { estoque_atual: novoEstoque, transferido_para_filiais: totalDebitarLojaPrincipal },
            });
          }
        }
      }
    } else {
      // Caso clássico: atualizar apenas o produto local da loja ativa (via formulário simples)
      const updates: Record<string, any> = {
        sku: input.sku !== undefined ? input.sku : beforeLocal.sku,
        preco_venda: input.preco_venda !== undefined ? safeParseNumber(input.preco_venda) : beforeLocal.preco_venda,
        preco_custo: input.preco_custo !== undefined ? safeParseNumber(input.preco_custo) : beforeLocal.preco_custo,
        preco_promocional: input.preco_promocional !== undefined ? safeParseNumber(input.preco_promocional) : beforeLocal.preco_promocional,
        estoque_minimo: input.estoque_minimo !== undefined ? safeParseNumber(input.estoque_minimo) : beforeLocal.estoque_minimo,
        estoque_maximo: input.estoque_maximo !== undefined ? safeParseNumber(input.estoque_maximo) : beforeLocal.estoque_maximo,
        corredor: input.corredor !== undefined ? input.corredor : beforeLocal.corredor,
        prateleira: input.prateleira !== undefined ? input.prateleira : beforeLocal.prateleira,
        deposito: input.deposito !== undefined ? input.deposito : beforeLocal.deposito,
        lote: input.lote !== undefined ? input.lote : beforeLocal.lote,
        validade: input.validade !== undefined ? input.validade : beforeLocal.validade,
        status: input.status !== undefined ? input.status : beforeLocal.status,
        permitir_venda: input.permitir_venda !== undefined ? input.permitir_venda : beforeLocal.permitir_venda,
        permitir_compra: input.permitir_compra !== undefined ? input.permitir_compra : beforeLocal.permitir_compra,
        permitir_transferencia: input.permitir_transferencia !== undefined ? input.permitir_transferencia : beforeLocal.permitir_transferencia,
      };

      // Se categoria foi alterada e não foi atualizado globalmente, atualizar localmente
      if (input.categoria_id !== undefined) {
        updates.categoria_id = input.categoria_id;
      }

      // Ajuste de estoque local
      if (input.estoque_atual !== undefined && safeParseNumber(input.estoque_atual) !== Number(beforeLocal.estoque_atual)) {
        const diff = safeParseNumber(input.estoque_atual) - Number(beforeLocal.estoque_atual);
        if (diff !== 0) {
          updates.estoque_atual = safeParseNumber(input.estoque_atual);

          await supabase.from("movimentacoes_estoque").insert({
            loja_id: beforeLocal.loja_id,
            produto_id: beforeLocal.id,
            tipo: diff > 0 ? "entrada" : "saida",
            quantidade: Math.abs(diff),
            motivo: "ajuste",
            usuario_id: user.id,
          });

          await supabase.from("produtos_mestres_historico").insert({
            produto_mestre_id: mestreId,
            grupo_id: beforeMestre.grupo_id,
            loja_id: beforeLocal.loja_id,
            usuario_id: user.id,
            acao: "ajuste_estoque",
            escopo: "local",
            dados_anteriores: { estoque_atual: beforeLocal.estoque_atual },
            dados_novos: { estoque_atual: safeParseNumber(input.estoque_atual), diferenca: diff },
          });
        }
      }

      // Alteração de preço/custo local
      const precoAlterado = input.preco_venda !== undefined && safeParseNumber(input.preco_venda) !== Number(beforeLocal.preco_venda);
      const custoAlterado = input.preco_custo !== undefined && safeParseNumber(input.preco_custo) !== Number(beforeLocal.preco_custo);

      if (precoAlterado || custoAlterado) {
        const margemAntiga = Number(beforeLocal.preco_venda) > 0 ? ((Number(beforeLocal.preco_venda) - Number(beforeLocal.preco_custo)) / Number(beforeLocal.preco_venda)) * 100 : 0;
        const novoPreco = input.preco_venda !== undefined ? safeParseNumber(input.preco_venda) : Number(beforeLocal.preco_venda);
        const novoCusto = input.preco_custo !== undefined ? safeParseNumber(input.preco_custo) : Number(beforeLocal.preco_custo);
        const margemNova = novoPreco > 0 ? ((novoPreco - novoCusto) / novoPreco) * 100 : 0;

        await supabase.from("produtos_mestres_historico").insert({
          produto_mestre_id: mestreId,
          grupo_id: beforeMestre.grupo_id,
          loja_id: beforeLocal.loja_id,
          usuario_id: user.id,
          acao: "alteracao_preco",
          escopo: "local",
          dados_anteriores: { 
            preco_venda: beforeLocal.preco_venda, 
            preco_custo: beforeLocal.preco_custo,
            margem: margemAntiga
          },
          dados_novos: { 
            preco_venda: novoPreco, 
            preco_custo: novoCusto,
            margem: margemNova
          },
        });

        // PROPAGAÇÃO DE PREÇO SE PROGRAMADO (syncPreco)
        if (input.syncPreco === "all") {
          const { error: priceSyncError } = await supabase
            .from("produtos")
            .update({
              preco_venda: novoPreco,
              preco_custo: novoCusto,
              preco_promocional: input.preco_promocional !== undefined ? safeParseNumber(input.preco_promocional) : beforeLocal.preco_promocional
            })
            .eq("produto_mestre_id", mestreId);

          if (priceSyncError) {
            console.error("Erro ao sincronizar preços corporativos:", priceSyncError);
          }
        }
      }

      await supabase
        .from("produtos")
        .update(updates)
        .eq("id", id);
    }

    // Obter o registro atualizado para retorno
    const { data: updatedProduct, error: fetchError } = await supabase
      .from("produtos")
      .select("*, categoria:categorias(id, nome)")
      .eq("id", id)
      .single();

    if (fetchError) {
      return { data: null, error: fetchError.message };
    }

    revalidatePath("/dashboard/produtos");
    revalidatePath(`/dashboard/produtos/${id}`);
    return { data: updatedProduct as Product, error: null };
  } catch (error: any) {
    console.error("Erro no updateProduct:", error);
    return { data: null, error: error.message || "Erro ao atualizar produto." };
  }
}

// ============================================
// EXCLUIR PRODUTO MESTRE (Exclusão Lógica Sem Cascade)
// ============================================
export async function deleteProduct(id: string) {
  try {
    const supabase = await createClient();

    // 1. Obter registro local do produto
    const { data: localProd } = await supabase
      .from("produtos")
      .select("id, produto_mestre_id, loja_id")
      .eq("id", id)
      .single();

    if (!localProd) {
      return { error: "Produto local não encontrado." };
    }

    const mestreId = localProd.produto_mestre_id;
    if (!mestreId) {
      return { error: "Este produto não possui produto mestre associado." };
    }

    // 2. Validar RBAC (Dono é quem pode desativar em lote corporativo)
    const { user, profile } = await validateProductRBAC("delete", localProd.loja_id, { hasGlobalChange: true });

    // 3. Marcar deleted_at no produto mestre
    const { error: masterError } = await supabase
      .from("produtos_mestres")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", mestreId);

    if (masterError) {
      return { error: `Erro ao desativar mestre: ${masterError.message}` };
    }

    // 4. Desativar todos os produtos locais do grupo sem deletá-los
    const { error: localError } = await supabase
      .from("produtos")
      .update({
        status: "inativo",
        deleted_at: new Date().toISOString(),
        permitir_venda: false,
        permitir_compra: false,
        permitir_transferencia: false,
      })
      .eq("produto_mestre_id", mestreId);

    if (localError) {
      return { error: `Erro ao inativar filiais: ${localError.message}` };
    }

    // 5. Gravar log de auditoria corporativa
    const { data: mestre } = await supabase
      .from("produtos_mestres")
      .select("grupo_id")
      .eq("id", mestreId)
      .single();

    if (mestre) {
      await supabase.from("produtos_mestres_historico").insert({
        produto_mestre_id: mestreId,
        grupo_id: mestre.grupo_id,
        loja_id: profile.loja_id,
        usuario_id: user.id,
        acao: "exclusao",
        escopo: "global",
        dados_anteriores: { status: "ativo" },
        dados_novos: { status: "inativo", deleted_at: new Date().toISOString() },
      });
    }

    revalidatePath("/dashboard/produtos");
    return { error: null };
  } catch (error: any) {
    console.error("Erro no deleteProduct:", error);
    return { error: error.message || "Erro ao excluir produto." };
  }
}

// ============================================
// RESTAURAR PRODUTO MESTRE E LOCAIS
// ============================================
export async function restoreProduct(id: string) {
  try {
    const supabase = await createClient();

    const { data: localProd } = await supabase
      .from("produtos")
      .select("produto_mestre_id, loja_id")
      .eq("id", id)
      .single();

    if (!localProd) return { error: "Produto não encontrado." };

    const mestreId = localProd.produto_mestre_id;
    if (!mestreId) return { error: "Produto mestre não associado." };

    // Validar RBAC
    const { user, profile } = await validateProductRBAC("restore", localProd.loja_id, { hasGlobalChange: true });

    // Restaurar mestre
    await supabase
      .from("produtos_mestres")
      .update({ deleted_at: null })
      .eq("id", mestreId);

    // Restaurar locais
    await supabase
      .from("produtos")
      .update({
        deleted_at: null,
        status: "ativo",
        permitir_venda: true,
        permitir_compra: true,
        permitir_transferencia: true,
      })
      .eq("produto_mestre_id", mestreId);

    const { data: mestre } = await supabase.from("produtos_mestres").select("grupo_id").eq("id", mestreId).single();
    if (mestre) {
      await supabase.from("produtos_mestres_historico").insert({
        produto_mestre_id: mestreId,
        grupo_id: mestre.grupo_id,
        loja_id: profile.loja_id,
        usuario_id: user.id,
        acao: "restauracao",
        escopo: "global",
      });
    }

    revalidatePath("/dashboard/produtos");
    return { error: null };
  } catch (error: any) {
    console.error("Erro no restoreProduct:", error);
    return { error: error.message || "Erro ao restaurar produto." };
  }
}

// ============================================
// REMOVER PRODUTO DE UMA FILIAL (Desativação Segura)
// ============================================
export async function removeProductFromLoja(id: string, lojaId: string) {
  try {
    // Validar RBAC
    const { user, profile } = await validateProductRBAC("remove_filial", lojaId);
    const supabase = await createClient();

    // Obter produto antes
    const { data: before } = await supabase
      .from("produtos")
      .select("*")
      .eq("id", id)
      .eq("loja_id", lojaId)
      .single();

    if (!before) {
      return { error: "Produto não encontrado nesta filial." };
    }

    // Inativar e restringir operações locais (sem deletar a linha do banco)
    const { error } = await supabase
      .from("produtos")
      .update({
        status: "inativo",
        permitir_venda: false,
        permitir_compra: false,
        permitir_transferencia: false
      })
      .eq("id", id)
      .eq("loja_id", lojaId);

    if (error) {
      return { error: error.message };
    }

    // Gravar log de inativação local
    const mestreId = before.produto_mestre_id;
    if (mestreId) {
      const { data: mestre } = await supabase.from("produtos_mestres").select("grupo_id").eq("id", mestreId).single();
      if (mestre) {
        await supabase.from("produtos_mestres_historico").insert({
          produto_mestre_id: mestreId,
          grupo_id: mestre.grupo_id,
          loja_id: lojaId,
          usuario_id: user.id,
          acao: "desativacao_filial",
          escopo: "local",
          dados_anteriores: { status: before.status, permitir_venda: before.permitir_venda },
          dados_novos: { status: "inativo", permitir_venda: false, permitir_compra: false }
        });
      }
    }

    revalidatePath("/dashboard/produtos");
    return { error: null };
  } catch (error: any) {
    console.error("Erro no removeProductFromLoja:", error);
    return { error: error.message || "Erro ao inativar filial." };
  }
}

// ============================================
// OBTER DADOS E MÉTRICAS DE GOVERNANÇA CORPORATIVA
// ============================================
export async function getProductGovernanceInfo(produtoMestreId: string) {
  try {
    const supabase = await createClient();

    const { data: configLojas, error } = await supabase
      .from("produtos")
      .select("*, loja:lojas(id, nome_loja)")
      .eq("produto_mestre_id", produtoMestreId)
      .is("deleted_at", null);

    if (error || !configLojas || configLojas.length === 0) {
      return {
        totalEstoqueCorporativo: 0,
        valorTotalEstoque: 0,
        lojasAtivas: 0,
        lojasInativas: 0,
        precoMedio: 0,
        maiorPreco: 0,
        menorPreco: 0,
        lojasConfig: [],
      };
    }

    const totalEstoqueCorporativo = configLojas.reduce((acc, p) => acc + Number(p.estoque_atual || 0), 0);
    const valorTotalEstoque = configLojas.reduce((acc, p) => acc + (Number(p.preco_custo || 0) * Number(p.estoque_atual || 0)), 0);
    const lojasAtivas = configLojas.filter(p => p.status === "ativo").length;
    const lojasInativas = configLojas.filter(p => p.status === "inativo").length;

    const precos = configLojas.map(p => Number(p.preco_venda || 0));
    const precoMedio = precos.reduce((a, b) => a + b, 0) / precos.length;
    const maiorPreco = Math.max(...precos);
    const menorPreco = Math.min(...precos);

    return {
      totalEstoqueCorporativo,
      valorTotalEstoque,
      lojasAtivas,
      lojasInativas,
      precoMedio,
      maiorPreco,
      menorPreco,
      lojasConfig: configLojas,
    };
  } catch (error) {
    console.error("Erro em getProductGovernanceInfo:", error);
    return null;
  }
}

// ============================================
// OBTER HISTÓRICO DE AUDITORIA CORPORATIVA (JSONB)
// ============================================
export async function getProductAuditHistory(produtoMestreId: string): Promise<ProductMestreHistory[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("produtos_mestres_historico")
      .select("*")
      .eq("produto_mestre_id", produtoMestreId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    // Enriquecer com nomes dos usuários e filiais
    const userIds = [...new Set(data.map(d => d.usuario_id).filter(Boolean))];
    const storeIds = [...new Set(data.map(d => d.loja_id).filter(Boolean))];

    const [usersRes, storesRes] = await Promise.all([
      supabase.from("usuarios").select("id, nome").in("id", userIds),
      supabase.from("lojas").select("id, nome_loja").in("id", storeIds)
    ]);

    const userMap = new Map(usersRes.data?.map(u => [u.id, u.nome]) || []);
    const storeMap = new Map(storesRes.data?.map(s => [s.id, s.nome_loja]) || []);

    return data.map(item => ({
      ...item,
      usuario_nome: item.usuario_id ? userMap.get(item.usuario_id) || "Usuário" : "Sistema",
      loja_nome: item.loja_id ? storeMap.get(item.loja_id) || "Filial" : "Global",
    })) as unknown as ProductMestreHistory[];
  } catch (error) {
    console.error("Erro em getProductAuditHistory:", error);
    return [];
  }
}

// ============================================
// TOGGLE FAVORITO
// ============================================
export async function toggleFavorite(id: string, favorito: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("produtos")
    .update({ favorito })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  // Se tiver produto mestre, atualizar no mestre também
  const { data: p } = await supabase.from("produtos").select("produto_mestre_id").eq("id", id).single();
  if (p?.produto_mestre_id) {
    await supabase.from("produtos_mestres").update({ favorito }).eq("id", p.produto_mestre_id);
  }

  revalidatePath("/dashboard/produtos");
  return { error: null };
}

// ============================================
// HISTÓRICO DE ATIVIDADE DO PRODUTO (COMPATIBILIDADE)
// ============================================
export async function getProductHistory(productId: string): Promise<ProductActivity[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("logs_atividade")
    .select("*")
    .eq("entidade", "produto")
    .eq("entidade_id", productId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!data) return [];

  const userIds = [...new Set(data.map((d) => d.usuario_id).filter(Boolean))];
  const { data: users } = await supabase
    .from("usuarios")
    .select("id, nome")
    .in("id", userIds);

  const userMap = new Map(users?.map((u) => [u.id, u.nome]) || []);

  return data.map((item) => ({
    ...item,
    usuario_nome: item.usuario_id ? userMap.get(item.usuario_id) || "Usuário" : "Sistema",
  })) as ProductActivity[];
}

// ============================================
// AUDITORIA DE ESTOQUE DO PRODUTO (COMPATIBILIDADE)
// ============================================
export async function getProductStockAudit(productId: string): Promise<ProductStockAudit> {
  const supabase = await createClient();

  // Total vendido
  const { data: vendaItens } = await supabase
    .from("venda_itens")
    .select("quantidade")
    .eq("produto_id", productId);

  const totalVendido = vendaItens ? vendaItens.reduce((acc, v) => acc + Number(v.quantidade), 0) : 0;

  // Total comprado (movimentações tipo entrada)
  const { data: entradas } = await supabase
    .from("movimentacoes_estoque")
    .select("quantidade")
    .eq("produto_id", productId)
    .eq("tipo", "entrada");

  const totalComprado = entradas ? entradas.reduce((acc, e) => acc + Number(e.quantidade), 0) : 0;

  // Última movimentação
  const { data: ultimaMov } = await supabase
    .from("movimentacoes_estoque")
    .select("created_at")
    .eq("produto_id", productId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Última venda
  const { data: ultimaVendaItem } = await supabase
    .from("venda_itens")
    .select("venda_id")
    .eq("produto_id", productId)
    .limit(1)
    .maybeSingle();

  let ultimaVenda: string | null = null;
  if (ultimaVendaItem) {
    const { data: venda } = await supabase
      .from("vendas")
      .select("created_at")
      .eq("id", ultimaVendaItem.venda_id)
      .single();
    ultimaVenda = venda?.created_at || null;
  }

  // Movimentações nos últimos 30 dias
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { count: movimentacoes30d } = await supabase
    .from("movimentacoes_estoque")
    .select("*", { count: "exact", head: true })
    .eq("produto_id", productId)
    .gte("created_at", thirtyDaysAgo.toISOString());

  return {
    totalVendido,
    totalComprado,
    ultimaMovimentacao: ultimaMov?.created_at || null,
    ultimaVenda,
    movimentacoes30d: movimentacoes30d || 0,
  };
}

// ============================================
// ASSISTENTE DE MIGRAÇÃO INTELIGENTE DE PRODUTOS
// ============================================

export interface ImportSessionDetails {
  id: string;
  filename: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  duplicate_rows: number;
  column_mapping: Record<string, string>;
  duplicate_strategy: string;
  source_mode: string;
  source_system: string;
  created_at: string;
}

// 1. ANALISAR E CRIAR SESSÃO DE IMPORTAÇÃO
export async function analyzeProductsImport(
  rawRows: any[],
  filename: string,
  sourceMode: string,
  sourceSystem: string
): Promise<{ sessionId: string | null; columnMapping: Record<string, string>; error: string | null }> {
  try {
    const { user, profile } = await validateProductRBAC("create", undefined, { hasGlobalChange: true });
    const supabase = await createClient();

    // Validar limites no MVP (limite de 2000 produtos)
    if (rawRows.length > 2000) {
      return { sessionId: null, columnMapping: {}, error: "O limite do Assistente no MVP é de 2.000 produtos por importação." };
    }

    // Obter grupo_id da loja ativa do usuário
    const { data: store } = await supabase
      .from("lojas")
      .select("grupo_id")
      .eq("id", profile.loja_id)
      .single();

    if (!store) {
      return { sessionId: null, columnMapping: {}, error: "Grupo empresarial não encontrado." };
    }

    // Heurística de mapeamento de colunas em português
    const firstRow = rawRows[0] || {};
    const columnMapping: Record<string, string> = {};
    const headers = Object.keys(firstRow);

    const matchPatterns: Record<string, RegExp[]> = {
      nome: [/nome/i, /produto/i, /descri/i, /item/i],
      sku: [/sku/i, /ref/i, /refer/i, /cod.*int/i],
      codigo_barras: [/barras/i, /ean/i, /cod.*bar/i, /c[oó]digo/i],
      preco_custo: [/custo/i, /compra/i],
      preco_venda: [/venda/i, /pre[cç]o/i, /valor/i],
      estoque_atual: [/estoque/i, /qtd/i, /quant/i, /saldo/i],
      categoria_nome: [/categoria/i, /grupo/i, /depto/i, /departamento/i],
      cor: [/cor/i],
      tamanho: [/tamanho/i, /tam/i, /numera/i],
      unidade: [/unidade/i, /und/i, /uni/i]
    };

    headers.forEach(header => {
      for (const [field, regexes] of Object.entries(matchPatterns)) {
        if (regexes.some(r => r.test(header))) {
          if (!Object.values(columnMapping).includes(field)) {
            columnMapping[header] = field;
            break;
          }
        }
      }
    });

    // Criar a sessão no banco
    const { data: session, error: sessionErr } = await supabase
      .from("product_import_sessions")
      .insert({
        grupo_id: store.grupo_id,
        loja_id: profile.loja_id,
        filename,
        status: "analyzing",
        total_rows: rawRows.length,
        column_mapping: columnMapping,
        duplicate_strategy: "skip",
        source_mode: sourceMode,
        source_system: sourceSystem,
        created_by: user.id
      })
      .select("id")
      .single();

    if (sessionErr || !session) {
      return { sessionId: null, columnMapping: {}, error: `Erro ao criar sessão de importação: ${sessionErr.message}` };
    }

    // Inserir linhas brutas em lote (batching de 200 em 200)
    const batchSize = 200;
    for (let i = 0; i < rawRows.length; i += batchSize) {
      const batch = rawRows.slice(i, i + batchSize).map((row, index) => ({
        session_id: session.id,
        row_index: i + index + 1,
        raw_data: row,
        status: "pending"
      }));

      const { error: batchErr } = await supabase
        .from("product_import_rows")
        .insert(batch);

      if (batchErr) {
        console.error("Erro ao salvar lote de linhas:", batchErr);
      }
    }

    return { sessionId: session.id, columnMapping, error: null };
  } catch (error: any) {
    console.error("Erro em analyzeProductsImport:", error);
    return { sessionId: null, columnMapping: {}, error: error.message || "Erro interno." };
  }
}

// Helper: normalização brasileira de decimal e valores nulos
function normalizeBrazilianNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  let str = String(val).trim().replace(/R\$\s?/g, "");
  if (!str) return 0;
  
  // Tratar formato brasileiro 1.250,50 -> 1250.50 ou 1.250 -> 1250.00
  if (str.includes(",") && str.includes(".")) {
    str = str.replace(/\./g, "").replace(",", ".");
  } else if (str.includes(",")) {
    str = str.replace(",", ".");
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

// 2. VALIDAR E PREPARAR DADOS DA IMPORTAÇÃO
export async function validateProductsImport(
  sessionId: string,
  columnMapping: Record<string, string>,
  duplicateStrategy: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { profile } = await validateProductRBAC("create", undefined, { hasGlobalChange: true });
    const supabase = await createClient();

    // 1. Atualizar mapeamento e estratégia na sessão
    const { error: updateErr } = await supabase
      .from("product_import_sessions")
      .update({
        column_mapping: columnMapping,
        duplicate_strategy: duplicateStrategy,
        status: "analyzing"
      })
      .eq("id", sessionId);

    if (updateErr) return { success: false, error: updateErr.message };

    // 2. Buscar todas as linhas brutas cadastradas
    const { data: rows, error: rowsErr } = await supabase
      .from("product_import_rows")
      .select("*")
      .eq("session_id", sessionId)
      .order("row_index", { ascending: true });

    if (rowsErr || !rows) return { success: false, error: rowsErr?.message || "Linhas não encontradas." };

    // 3. Buscar chaves de duplicidade do banco de dados (SKU e código de barras ativos)
    const { data: existingProducts } = await supabase
      .from("produtos")
      .select("id, sku, codigo_barras, nome")
      .eq("loja_id", profile.loja_id)
      .is("deleted_at", null);

    const dbSkus = new Set((existingProducts || []).map(p => String(p.sku || "").trim().toLowerCase()).filter(Boolean));
    const dbBarcodes = new Set((existingProducts || []).map(p => String(p.codigo_barras || "").trim().toLowerCase()).filter(Boolean));

    // Mapas para verificar duplicidade dentro da própria planilha
    const fileSkus = new Set<string>();
    const fileBarcodes = new Set<string>();

    let validCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    // 4. Validar e normalizar cada linha
    for (const row of rows) {
      const raw = row.raw_data as Record<string, any>;
      const errors: string[] = [];
      const warnings: string[] = [];
      const normalized: Record<string, any> = {};

      // Aplicar o mapeamento de colunas
      Object.entries(columnMapping).forEach(([excelHeader, mappedField]) => {
        if (raw[excelHeader] !== undefined) {
          normalized[mappedField] = raw[excelHeader];
        }
      });

      // Garantir valores padrão para normalização
      const nome = String(normalized.nome || "").trim();
      const precoVenda = normalizeBrazilianNumber(normalized.preco_venda);
      const precoCusto = normalizeBrazilianNumber(normalized.preco_custo);
      const estoqueAtual = normalizeBrazilianNumber(normalized.estoque_atual);
      const sku = String(normalized.sku || "").trim();
      const barcode = String(normalized.codigo_barras || "").trim();
      const categoriaNome = String(normalized.categoria_nome || "").trim();
      const unidade = String(normalized.unidade || "UN").trim().toUpperCase();
      const cor = String(normalized.cor || "").trim();
      const tamanho = String(normalized.tamanho || "").trim();

      // Guardar dados tratados
      const finalNormalized: Record<string, any> = {
        nome,
        preco_venda: precoVenda,
        preco_custo: precoCusto,
        estoque_atual: estoqueAtual,
        sku: sku || null,
        codigo_barras: barcode || null,
        categoria_nome: categoriaNome || null,
        unidade: unidade || "UN",
        atributos: {
          cor: cor || null,
          tamanho: tamanho || null
        }
      };

      // --- VALIDAÇÕES DE ERRO ---
      if (!nome) {
        errors.push("Nome do produto é obrigatório.");
      }
      if (normalized.preco_venda === undefined || normalized.preco_venda === "") {
        errors.push("Preço de venda é obrigatório.");
      } else if (precoVenda < 0) {
        errors.push("Preço de venda não pode ser negativo.");
      }
      if (precoCusto < 0) {
        errors.push("Preço de custo não pode ser negativo.");
      }
      if (estoqueAtual < 0) {
        errors.push("Estoque não pode ser negativo no cadastro.");
      }

      // --- DETECÇÃO DE DUPLICIDADE ---
      let isDuplicate = false;
      let duplicateProdId: string | null = null;

      // Duplicidade no banco de dados
      if (sku && dbSkus.has(sku.toLowerCase())) {
        isDuplicate = true;
        duplicateProdId = existingProducts?.find(p => String(p.sku || "").trim().toLowerCase() === sku.toLowerCase())?.id || null;
      }
      if (barcode && dbBarcodes.has(barcode.toLowerCase())) {
        isDuplicate = true;
        duplicateProdId = existingProducts?.find(p => String(p.codigo_barras || "").trim().toLowerCase() === barcode.toLowerCase())?.id || null;
      }

      // Duplicidade dentro da própria planilha
      if (sku && fileSkus.has(sku.toLowerCase())) {
        isDuplicate = true;
        warnings.push(`SKU '${sku}' está repetido dentro desta planilha.`);
      }
      if (barcode && fileBarcodes.has(barcode.toLowerCase())) {
        isDuplicate = true;
        warnings.push(`Código de barras '${barcode}' está repetido dentro desta planilha.`);
      }

      if (sku) fileSkus.add(sku.toLowerCase());
      if (barcode) fileBarcodes.add(barcode.toLowerCase());

      // --- VALIDAÇÕES DE AVISO (WARNING) ---
      if (precoVenda > 0 && precoVenda <= precoCusto) {
        warnings.push("Atenção: Margem de lucro zerada ou negativa.");
      } else if (precoVenda > 0 && ((precoVenda - precoCusto) / precoVenda) < 0.1) {
        warnings.push("Margem de lucro muito baixa (menor que 10%).");
      }
      if (!categoriaNome) {
        warnings.push("Produto sem categoria definida. Ficará sem grupo.");
      }
      if (!barcode) {
        warnings.push("Código de barras ausente.");
      }

      // Determinar o status da linha
      let status: "valid" | "warning" | "error" | "duplicate" = "valid";
      if (errors.length > 0) {
        status = "error";
        errorCount++;
      } else if (isDuplicate) {
        status = "duplicate";
        duplicateCount++;
      } else if (warnings.length > 0) {
        status = "warning";
        validCount++;
      } else {
        validCount++;
      }

      // Atualizar a linha no banco de dados
      await supabase
        .from("product_import_rows")
        .update({
          normalized_data: finalNormalized,
          status,
          errors,
          warnings,
          duplicate_product_id: duplicateProdId
        })
        .eq("id", row.id);
    }

    // 5. Atualizar o resumo final na sessão
    await supabase
      .from("product_import_sessions")
      .update({
        status: "validated",
        valid_rows: validCount,
        error_rows: errorCount,
        duplicate_rows: duplicateCount
      })
      .eq("id", sessionId);

    return { success: true, error: null };
  } catch (error: any) {
    console.error("Erro em validateProductsImport:", error);
    return { success: false, error: error.message || "Erro interno." };
  }
}

// 3. CONFIRMAR E GRAVAR A IMPORTAÇÃO NO BANCO (COMMIT)
export async function commitProductsImport(sessionId: string): Promise<{ success: boolean; stats: any; error: string | null }> {
  try {
    const { user, profile } = await validateProductRBAC("create", undefined, { hasGlobalChange: true });
    const supabase = await createClient();

    // Trava atômica de idempotência contra duplo clique
    const { data: session, error: lockErr } = await supabase
      .from("product_import_sessions")
      .update({ status: "importing" })
      .eq("id", sessionId)
      .in("status", ["validated", "ready"])
      .select()
      .maybeSingle();

    if (lockErr || !session) {
      return { success: false, stats: null, error: "Esta importação já foi processada ou está em andamento." };
    }

    // Buscar linhas válidas, com avisos ou duplicados para processar
    const { data: rows, error: rowsErr } = await supabase
      .from("product_import_rows")
      .select("*")
      .eq("session_id", sessionId)
      .in("status", ["valid", "warning", "duplicate"])
      .order("row_index", { ascending: true });

    if (rowsErr || !rows || rows.length === 0) {
      await supabase.from("product_import_sessions").update({ status: "failed", failed_reason: "Nenhuma linha válida encontrada para importar." }).eq("id", sessionId);
      return { success: false, stats: null, error: rowsErr?.message || "Nenhuma linha válida para commit." };
    }

    let criados = 0;
    let atualizados = 0;
    let ignorados = 0;
    const strategy = session.duplicate_strategy;

    // Loop de inserção por transações
    for (const row of rows) {
      const normalized = row.normalized_data as Record<string, any>;
      const isDuplicate = row.status === "duplicate";
      let action: "create" | "update_data_only" | "add_stock" | "set_stock" | "skip" | "duplicate" = "create";

      if (isDuplicate) {
        if (strategy === "skip") {
          action = "skip";
          ignorados++;
          await supabase.from("product_import_rows").update({ action_taken: "skip" }).eq("id", row.id);
          continue;
        }
        action = strategy as any;
      }

      // 1. Obter ou criar categoria
      let localCatId: string | null = null;
      if (normalized.categoria_nome) {
        const { data: existingCat } = await supabase
          .from("categorias")
          .select("id")
          .eq("loja_id", profile.loja_id)
          .ilike("nome", normalized.categoria_nome)
          .maybeSingle();

        if (existingCat) {
          localCatId = existingCat.id;
        } else {
          const { data: newCat } = await supabase
            .from("categorias")
            .insert({ loja_id: profile.loja_id, nome: normalized.categoria_nome, status: "ativo" })
            .select("id")
            .single();
          if (newCat) localCatId = newCat.id;
        }
      }

      // Governança fiscal
      const fiscalStatus = (normalized.ncm && String(normalized.ncm).trim()) ? "complete" : "pending_review";

      // 2. Executar ação de acordo com a estratégia
      if (action === "create" || action === "duplicate") {
        // Criar produto mestre e local
        const mestreId = crypto.randomUUID();
        await supabase.from("produtos_mestres").insert({
          id: mestreId,
          grupo_id: session.grupo_id,
          nome: normalized.nome,
          unidade: normalized.unidade || "UN",
          codigo_barras: normalized.codigo_barras,
          fiscal_status: fiscalStatus,
          atributos: normalized.atributos || {}
        });

        const { data: newProd, error: insertError } = await supabase
          .from("produtos")
          .insert({
            loja_id: profile.loja_id,
            produto_mestre_id: mestreId,
            produto_grupo_id: mestreId,
            categoria_id: localCatId,
            nome: normalized.nome,
            sku: normalized.sku,
            codigo_barras: normalized.codigo_barras,
            unidade: normalized.unidade || "UN",
            preco_custo: normalized.preco_custo,
            preco_venda: normalized.preco_venda,
            estoque_atual: normalized.estoque_atual,
            fiscal_status: fiscalStatus,
            atributos: normalized.atributos || {},
            status: "ativo"
          })
          .select("id")
          .single();

        if (!insertError && newProd) {
          criados++;
          await supabase.from("product_import_rows").update({ action_taken: "create", product_id: newProd.id, produto_mestre_id: mestreId }).eq("id", row.id);

          // Entrada de estoque inicial
          if (Number(normalized.estoque_atual) > 0) {
            await supabase.from("movimentacoes_estoque").insert({
              loja_id: profile.loja_id,
              produto_id: newProd.id,
              tipo: "entrada",
              quantidade: Number(normalized.estoque_atual),
              motivo: "ajuste",
              usuario_id: user.id,
              import_session_id: session.id,
              import_row_id: row.id
            });
          }
        }
      } else {
        // Ações de produto existente (duplicate_product_id)
        const prodId = row.duplicate_product_id;
        if (prodId) {
          const { data: currentProduct } = await supabase
            .from("produtos")
            .select("estoque_atual, produto_mestre_id")
            .eq("id", prodId)
            .single();

          const currentStock = currentProduct ? Number(currentProduct.estoque_atual) : 0;
          const mestreId = currentProduct?.produto_mestre_id || null;
          let finalStock = currentStock;
          let stockDiff = 0;
          let motivoMov = "ajuste";

          if (action === "add_stock") {
            finalStock = currentStock + Number(normalized.estoque_atual);
            stockDiff = Number(normalized.estoque_atual);
            motivoMov = "entrada";
          } else if (action === "set_stock") {
            finalStock = Number(normalized.estoque_atual);
            stockDiff = finalStock - currentStock;
            motivoMov = "ajuste";
          }

          // Atualizar dados locais da filial
          await supabase
            .from("produtos")
            .update({
              preco_custo: normalized.preco_custo,
              preco_venda: normalized.preco_venda,
              estoque_atual: finalStock,
              fiscal_status: fiscalStatus,
              atributos: normalized.atributos || {}
            })
            .eq("id", prodId);

          atualizados++;
          await supabase.from("product_import_rows").update({ action_taken: action, product_id: prodId, produto_mestre_id: mestreId }).eq("id", row.id);

          // Registrar a movimentação de estoque correspondente se houver variação
          if (stockDiff !== 0) {
            await supabase.from("movimentacoes_estoque").insert({
              loja_id: profile.loja_id,
              produto_id: prodId,
              tipo: stockDiff > 0 ? "entrada" : "saida",
              quantidade: Math.abs(stockDiff),
              motivo: motivoMov,
              usuario_id: user.id,
              import_session_id: session.id,
              import_row_id: row.id
            });
          }
        }
      }
    }

    // 3. Concluir a sessão no banco
    const statsResult = {
      total: session.total_rows,
      criados,
      atualizados,
      ignorados,
      categoriasCriadas: 0
    };

    await supabase
      .from("product_import_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString()
      })
      .eq("id", sessionId);

    revalidatePath("/dashboard/produtos");
    return { success: true, stats: statsResult, error: null };
  } catch (error: any) {
    console.error("Erro em commitProductsImport:", error);
    return { success: false, stats: null, error: error.message || "Erro interno." };
  }
}

// 4. OBTER DETALHES DO HISTÓRICO DE IMPORTAÇÃO
export async function getImportSessionHistory(): Promise<{ data: ImportSessionDetails[]; error: string | null }> {
  try {
    const { profile } = await validateProductRBAC("create", undefined, { hasGlobalChange: true });
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("product_import_sessions")
      .select("*")
      .eq("loja_id", profile.loja_id)
      .order("created_at", { ascending: false });

    if (error) return { data: [], error: error.message };

    return { data: (data as ImportSessionDetails[]) || [], error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
}

// 5. BAIXAR RELATÓRIO DE ERROS / RESULTADOS DA SESSÃO
export async function getImportSessionRowsReport(sessionId: string): Promise<{ data: any[]; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("product_import_rows")
      .select("row_index, raw_data, normalized_data, status, errors, warnings, action_taken")
      .eq("session_id", sessionId)
      .order("row_index", { ascending: true });

    if (error) return { data: [], error: error.message };

    return { data: data || [], error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
}

// 6. EXPORTAR CATÁLOGO DE PRODUTOS PARA CSV
export async function exportProductsAction(): Promise<{ data: any[] | null; error: string | null }> {
  try {
    const { profile } = await validateProductRBAC("create", undefined, { hasGlobalChange: false });
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("produtos")
      .select("nome, sku, codigo_barras, preco_custo, preco_venda, estoque_atual, estoque_minimo, unidade, fiscal_status")
      .eq("loja_id", profile.loja_id)
      .is("deleted_at", null)
      .order("nome", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data || [], error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

