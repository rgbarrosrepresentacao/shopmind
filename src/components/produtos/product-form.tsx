"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "./image-upload";
import { CategoryQuickCreate } from "./category-quick-create";
import { 
  createProduct, 
  updateProduct, 
  getProductGroupDetails,
  getProductGovernanceInfo,
  getProductAuditHistory,
  removeProductFromLoja
} from "@/lib/actions/products";
import { uploadProductImage, deleteProductImage } from "@/lib/actions/product-images";
import { toast } from "@/components/ui/toast";
import type { Product, Category, ProductStoreConfig, ProductMestreHistory } from "@/lib/types/produtos";
import { computeMargin, formatBRL } from "@/lib/types/produtos";
import { 
  Tag, Plus, ArrowLeft, Save, Shield, Calendar, 
  Layers, Database, Landmark, History, Activity, AlertCircle, Check, Info
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { LojaFilial } from "@/lib/types/multilojas";

function parsePtBrFloat(val: any): number {
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

interface ProductFormProps {
  product?: Product;
  categories: Category[];
  lojas?: LojaFilial[];
  userTipo?: string;
}

export function ProductForm({ product, categories: initialCategories, lojas, userTipo = "dono" }: ProductFormProps) {
  const router = useRouter();
  const isEdit = !!product;

  // Active Tab state
  const [activeTab, setActiveTab] = React.useState<"geral" | "fiscal" | "distribuicao" | "governanca" | "auditoria">("geral");

  // Categories list
  const [categories, setCategories] = React.useState<Category[]>(initialCategories);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = React.useState(false);

  // Form states (Global/Mestre attributes)
  const [nome, setNome] = React.useState(product?.nome || "");
  const [sku, setSku] = React.useState(product?.sku || "");
  const [codigoBarras, setCodigoBarras] = React.useState(product?.codigo_barras || "");
  const [marca, setMarca] = React.useState(product?.marca || "");
  const [descricao, setDescricao] = React.useState(product?.descricao || "");
  const [categoriaId, setCategoriaId] = React.useState(product?.categoria_id || "");
  const [unidade, setUnidade] = React.useState(product?.unidade || "UN");
  const [status, setStatus] = React.useState<"ativo" | "inativo">(product?.status || "ativo");
  const [favorito, setFavorito] = React.useState(product?.favorito || false);
  const [destaque, setDestaque] = React.useState(product?.destaque || false);

  // Taxation (Global)
  const [ncm, setNcm] = React.useState(product?.ncm || "");
  const [cest, setCest] = React.useState(product?.cest || "");
  const [origemFiscal, setOrigemFiscal] = React.useState(product?.origem_fiscal || "0");

  // Image upload state (Global)
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imageUrl, setImageUrl] = React.useState<string | null>(product?.foto_url || null);

  // Pricing & Stock (Local attributes for active store)
  const [precoCusto, setPrecoCusto] = React.useState(product?.preco_custo ? String(product.preco_custo) : "0.00");
  const [precoVenda, setPrecoVenda] = React.useState(product?.preco_venda ? String(product.preco_venda) : "0.00");
  const [precoPromocional, setPrecoPromocional] = React.useState(product?.preco_promocional ? String(product.preco_promocional) : "0.00");
  const [estoqueAtual, setEstoqueAtual] = React.useState(product?.estoque_atual ? String(product.estoque_atual) : "0.00");
  const [estoqueMinimo, setEstoqueMinimo] = React.useState(product?.estoque_minimo ? String(product.estoque_minimo) : "0.00");
  const [estoqueMaximo, setEstoqueMaximo] = React.useState(product?.estoque_maximo ? String(product.estoque_maximo) : "0.00");

  // Physical Location & Traceability (Local)
  const [corredor, setCorredor] = React.useState(product?.corredor || "");
  const [prateleira, setPrateleira] = React.useState(product?.prateleira || "");
  const [deposito, setDeposito] = React.useState(product?.deposito || "");
  const [lote, setLote] = React.useState(product?.lote || "");
  const [validade, setValidade] = React.useState(product?.validade || "");

  // Local Operations Permissions (Local)
  const [permitirVenda, setPermitirVenda] = React.useState(product?.permitir_venda ?? true);
  const [permitirCompra, setPermitirCompra] = React.useState(product?.permitir_compra ?? true);
  const [permitirTransferencia, setPermitirTransferencia] = React.useState(product?.permitir_transferencia ?? true);

  // Multi-Filiais states
  const [disponibilidadeTodas, setDisponibilidadeTodas] = React.useState(true);
  const [lojasSelecionadas, setLojasSelecionadas] = React.useState<string[]>([]);
  const [lojasValores, setLojasValores] = React.useState<
    Record<
      string,
      {
        sku: string;
        precoVenda: string;
        precoCusto: string;
        precoPromocional: string;
        estoqueAtual: string;
        estoqueMinimo: string;
        estoqueMaximo: string;
        corredor: string;
        prateleira: string;
        deposito: string;
        lote: string;
        validade: string;
        status: "ativo" | "inativo";
        permitirVenda: boolean;
        permitirCompra: boolean;
        permitirTransferencia: boolean;
        isExisting?: boolean;
      }
    >
  >({});

  // Governance & Audit Data (fetched on activeTab change)
  const [governanceData, setGovernanceData] = React.useState<any>(null);
  const [auditHistory, setAuditHistory] = React.useState<ProductMestreHistory[]>([]);
  const [isGovLoading, setIsGovLoading] = React.useState(false);

  // UX Prompts Dialogs
  const [showSyncPrompt, setShowSyncPrompt] = React.useState(false);
  const [syncOption, setSyncOption] = React.useState<"all" | "local">("all");
  const [priceSyncOption, setPriceSyncOption] = React.useState<"all" | "none">("all");

  // Calculated values (Active Store)
  const [lucro, setLucro] = React.useState(0);
  const [margem, setMargem] = React.useState(0);

  // Validation errors & loading
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = React.useState(false);

  // Define RBAC constraints based on userTipo
  const isDono = userTipo === "dono";
  const isGerente = userTipo === "gerente";
  const isSupervisor = userTipo === "supervisor";
  const isEstoquista = userTipo === "estoquista";
  const isCaixaOuVendedor = userTipo === "caixa" || userTipo === "vendedor";
  const isFinanceiro = userTipo === "financeiro";

  // Check if writing is completely blocked for role
  const isReadOnly = isCaixaOuVendedor || isFinanceiro;

  // Check if global fields (Master Product) are disabled for role
  const isGlobalDisabled = isEdit ? (!isDono) : (isReadOnly); 
  // Wait, if creating, anyone except read-only can input basic info, but in edit, only Owner (Dono) edits global.
  const isPriceDisabled = isEstoquista || isReadOnly;
  const isStockDisabled = isFinanceiro || isReadOnly;

  // 1. Load details when in Edit mode
  React.useEffect(() => {
    if (isEdit && product?.produto_mestre_id) {
      const fetchGroupDetails = async () => {
        const details = await getProductGroupDetails(product.produto_mestre_id!);
        const selectedIds = details.map((p) => p.loja_id);
        setLojasSelecionadas(selectedIds);

        const valores: typeof lojasValores = {};
        details.forEach((p) => {
          valores[p.loja_id] = {
            sku: p.sku || "",
            precoVenda: String(p.preco_venda),
            precoCusto: String(p.preco_custo),
            precoPromocional: String(p.preco_promocional || 0),
            estoqueAtual: String(p.estoque_atual),
            estoqueMinimo: String(p.estoque_minimo),
            estoqueMaximo: String(p.estoque_maximo || 0),
            corredor: p.corredor || "",
            prateleira: p.prateleira || "",
            deposito: p.deposito || "",
            lote: p.lote || "",
            validade: p.validade || "",
            status: p.status || "ativo",
            permitirVenda: p.permitir_venda ?? true,
            permitirCompra: p.permitir_compra ?? true,
            permitirTransferencia: p.permitir_transferencia ?? true,
            isExisting: true,
          };
        });
        setLojasValores(valores);

        if (lojas && lojas.length > 0 && lojas.every((l) => selectedIds.includes(l.id))) {
          setDisponibilidadeTodas(true);
        } else {
          setDisponibilidadeTodas(false);
        }
      };
      fetchGroupDetails();
    }
  }, [isEdit, product, lojas]);

  // 2. Load Governance & Audit tabs asynchronously
  React.useEffect(() => {
    if (isEdit && product?.produto_mestre_id) {
      if (activeTab === "governanca") {
        setIsGovLoading(true);
        getProductGovernanceInfo(product.produto_mestre_id!)
          .then(data => setGovernanceData(data))
          .finally(() => setIsGovLoading(false));
      } else if (activeTab === "auditoria") {
        setIsGovLoading(true);
        getProductAuditHistory(product.produto_mestre_id!)
          .then(data => setAuditHistory(data))
          .finally(() => setIsGovLoading(false));
      }
    }
  }, [activeTab, isEdit, product]);

  // 3. In Create mode, initialize configs for all stores
  React.useEffect(() => {
    if (!isEdit && lojas && lojas.length > 0) {
      const ids = lojas.map((l) => l.id);
      setLojasSelecionadas(ids);

      const valores: typeof lojasValores = {};
      ids.forEach((id) => {
        valores[id] = {
          sku: sku || "",
          precoVenda: precoVenda || "0.00",
          precoCusto: precoCusto || "0.00",
          precoPromocional: precoPromocional || "0.00",
          estoqueAtual: estoqueAtual || "0.00",
          estoqueMinimo: estoqueMinimo || "0.00",
          estoqueMaximo: estoqueMaximo || "0.00",
          corredor: corredor || "",
          prateleira: prateleira || "",
          deposito: deposito || "",
          lote: lote || "",
          validade: validade || "",
          status: "ativo",
          permitirVenda: true,
          permitirCompra: true,
          permitirTransferencia: true,
        };
      });
      setLojasValores(valores);
    }
  }, [lojas, isEdit]);

  // Recalculate margin/markup when active store price changes
  React.useEffect(() => {
    const custoVal = parsePtBrFloat(precoCusto) || 0;
    const vendaVal = parsePtBrFloat(precoVenda) || 0;
    const computed = computeMargin(custoVal, vendaVal);
    setLucro(computed.lucro);
    setMargem(computed.margem);
  }, [precoCusto, precoVenda]);

  const handleToggleLoja = (lojaId: string) => {
    if (isReadOnly) return;
    
    // Non-owners can only edit their own active store
    if (!isDono && lojaId !== product?.loja_id) {
      toast.error("Você só pode gerenciar a disponibilidade na sua própria filial.");
      return;
    }

    setLojasSelecionadas((prev) => {
      const exists = prev.includes(lojaId);
      let next: string[];
      if (exists) {
        // If editing and deselecting, warn the user that they are inactivating
        if (isEdit && lojasValores[lojaId]?.isExisting) {
          if (!confirm("Deseja marcar este produto como INATIVO nesta filial? As vendas e o histórico serão preservados, mas as operações comerciais serão bloqueadas.")) {
            return prev;
          }
          // Set local configurations to inactive
          setLojasValores(v => ({
            ...v,
            [lojaId]: {
              ...v[lojaId],
              status: "inativo",
              permitirVenda: false,
              permitirCompra: false,
              permitirTransferencia: false
            }
          }));
        }
        next = prev.filter((id) => id !== lojaId);
      } else {
        next = [...prev, lojaId];
      }

      if (lojas && next.length === lojas.length) {
        setDisponibilidadeTodas(true);
      } else {
        setDisponibilidadeTodas(false);
      }

      if (!exists && !lojasValores[lojaId]) {
        setLojasValores((v) => ({
          ...v,
          [lojaId]: {
            sku: sku || "",
            precoVenda: precoVenda || "0.00",
            precoCusto: precoCusto || "0.00",
            precoPromocional: precoPromocional || "0.00",
            estoqueAtual: estoqueAtual || "0.00",
            estoqueMinimo: estoqueMinimo || "0.00",
            estoqueMaximo: estoqueMaximo || "0.00",
            corredor: corredor || "",
            prateleira: prateleira || "",
            deposito: deposito || "",
            lote: lote || "",
            validade: validade || "",
            status: "ativo",
            permitirVenda: true,
            permitirCompra: true,
            permitirTransferencia: true,
          },
        }));
      }

      return next;
    });
  };

  const handleToggleTodas = (checked: boolean) => {
    if (!isDono) return;
    setDisponibilidadeTodas(checked);
    if (checked && lojas) {
      const ids = lojas.map((l) => l.id);
      setLojasSelecionadas(ids);

      setLojasValores((prev) => {
        const next = { ...prev };
        ids.forEach((id) => {
          if (!next[id]) {
            next[id] = {
              sku: sku || "",
              precoVenda: precoVenda || "0.00",
              precoCusto: precoCusto || "0.00",
              precoPromocional: precoPromocional || "0.00",
              estoqueAtual: estoqueAtual || "0.00",
              estoqueMinimo: estoqueMinimo || "0.00",
              estoqueMaximo: estoqueMaximo || "0.00",
              corredor: corredor || "",
              prateleira: prateleira || "",
              deposito: deposito || "",
              lote: lote || "",
              validade: validade || "",
              status: "ativo",
              permitirVenda: true,
              permitirCompra: true,
              permitirTransferencia: true,
            };
          }
        });
        return next;
      });
    } else {
      setLojasSelecionadas([]);
    }
  };

  const handleAplicarValoresGlobais = () => {
    if (!lojas || isReadOnly) return;
    setLojasValores((prev) => {
      const next = { ...prev };
      lojasSelecionadas.forEach((id) => {
        const isExisting = prev[id]?.isExisting;
        next[id] = {
          ...prev[id],
          precoVenda: precoVenda || "0.00",
          precoCusto: precoCusto || "0.00",
          precoPromocional: precoPromocional || "0.00",
          estoqueMinimo: estoqueMinimo || "0.00",
          estoqueMaximo: estoqueMaximo || "0.00",
          estoqueAtual: isExisting ? prev[id]?.estoqueAtual || "0.00" : estoqueAtual || "0.00",
          status: prev[id]?.status || "ativo",
        };
      });
      return next;
    });
    toast.success("Valores aplicados a todas as filiais selecionadas.");
  };

  const validate = () => {
    const tempErrors: Record<string, string> = {};
    if (!nome.trim()) tempErrors.nome = "O nome do produto é obrigatório.";
    const isGlobalPricingRequired = !isDono || !lojas || lojas.length <= 1;
    
    if (isGlobalPricingRequired) {
      if (parsePtBrFloat(precoCusto) < 0) tempErrors.precoCusto = "O preço de custo não pode ser negativo.";
      if (!precoVenda || parsePtBrFloat(precoVenda) <= 0) {
        tempErrors.precoVenda = "O preço de venda deve ser maior que zero.";
      }
      if (parsePtBrFloat(precoVenda) < parsePtBrFloat(precoCusto)) {
        tempErrors.precoVenda = "Aviso: preço de venda menor que o custo.";
      }
      if (parsePtBrFloat(estoqueAtual) < 0) tempErrors.estoqueAtual = "O estoque não pode ser negativo.";
      if (parsePtBrFloat(estoqueMinimo) < 0) tempErrors.estoqueMinimo = "O estoque mínimo não pode ser negativo.";
    }

    if (isDono && lojas && lojas.length > 0 && lojasSelecionadas.length === 0) {
      tempErrors.lojas = "Selecione pelo menos uma filial para disponibilizar o produto.";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).filter(k => tempErrors[k] !== "Aviso: preço de venda menor que o custo." && k !== "lojas").length === 0 && !tempErrors.lojas;
  };

  const handleSaveClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Por favor, preencha todos os campos obrigatórios corretamente.");
      return;
    }

    // Detect if we should open synchronization prompts (only in Edit mode and for Dono)
    if (isEdit && isDono) {
      const globalFieldsChanged = 
        nome.trim() !== product.nome ||
        descricao.trim() !== (product.descricao || "") ||
        marca.trim() !== (product.marca || "") ||
        codigoBarras.trim() !== (product.codigo_barras || "") ||
        unidade !== product.unidade ||
        ncm.trim() !== (product.ncm || "") ||
        cest.trim() !== (product.cest || "") ||
        origemFiscal !== (product.origem_fiscal || "0") ||
        categoriaId !== (product.categoria_id || "");

      const priceChanged = 
        parsePtBrFloat(precoVenda) !== product.preco_venda || 
        parsePtBrFloat(precoCusto) !== product.preco_custo;

      if (globalFieldsChanged || priceChanged) {
        setShowSyncPrompt(true);
        return;
      }
    }

    // Otherwise proceed to direct save
    executeSave(syncOption === "all", priceSyncOption);
  };

  const executeSave = async (syncGlobal: boolean, syncPrecos: "all" | "none") => {
    setShowSyncPrompt(false);
    setIsLoading(true);
    try {
      const payload = {
        nome: nome.trim(),
        sku: sku.trim() || null,
        codigo_barras: codigoBarras.trim() || null,
        marca: marca.trim() || null,
        descricao: descricao.trim() || null,
        categoria_id: categoriaId || null,
        preco_custo: parsePtBrFloat(precoCusto) || 0,
        preco_venda: parsePtBrFloat(precoVenda) || 0,
        preco_promocional: parsePtBrFloat(precoPromocional) || 0,
        estoque_atual: parsePtBrFloat(estoqueAtual) || 0,
        estoque_minimo: parsePtBrFloat(estoqueMinimo) || 0,
        estoque_maximo: parsePtBrFloat(estoqueMaximo) || 0,
        corredor: corredor.trim() || null,
        prateleira: prateleira.trim() || null,
        deposito: deposito.trim() || null,
        lote: lote.trim() || null,
        validade: validade || null,
        unidade,
        status,
        favorito,
        destaque,
        ncm: ncm.trim() || null,
        cest: cest.trim() || null,
        origem_fiscal: origemFiscal || null,
        foto_url: imageUrl,
        
        // Multi-filiais sync parameters
        disponibilidade_todas: syncGlobal,
        syncPreco: syncPrecos,

        // Configs for branch distribution
        lojas_config:
          isDono && lojas && lojas.length > 0
            ? lojasSelecionadas.map((id) => {
                const vals = lojasValores[id];
                return {
                  loja_id: id,
                  sku: vals?.sku || null,
                  preco_venda: parsePtBrFloat(vals?.precoVenda) || 0,
                  preco_custo: parsePtBrFloat(vals?.precoCusto) || 0,
                  preco_promocional: parsePtBrFloat(vals?.precoPromocional) || 0,
                  estoque_atual: parsePtBrFloat(vals?.estoqueAtual) || 0,
                  estoque_minimo: parsePtBrFloat(vals?.estoqueMinimo) || 0,
                  estoque_maximo: parsePtBrFloat(vals?.estoqueMaximo) || 0,
                  corredor: vals?.corredor || null,
                  prateleira: vals?.prateleira || null,
                  deposito: vals?.deposito || null,
                  lote: vals?.lote || null,
                  validade: vals?.validade || null,
                  status: vals?.status || "ativo",
                  permitir_venda: vals?.permitirVenda ?? true,
                  permitir_compra: vals?.permitirCompra ?? true,
                  permitir_transferencia: vals?.permitirTransferencia ?? true,
                };
              })
            : undefined,
      };

      let savedProduct: Product | null = null;
      let errorMsg: string | null = null;

      if (isEdit && product) {
        const result = await updateProduct(product.id, payload);
        savedProduct = result.data;
        errorMsg = result.error;
      } else {
        const result = await createProduct(payload);
        savedProduct = result.data;
        errorMsg = result.error;
      }

      if (errorMsg) {
        toast.error(`Erro ao salvar produto: ${errorMsg}`);
        setIsLoading(false);
        return;
      }

      // Upload image if selected
      if (savedProduct && imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        
        toast.info("Fazendo upload da foto do produto...");
        const uploadResult = await uploadProductImage(savedProduct.id, formData);
        
        if (uploadResult.error) {
          toast.error(`Produto salvo, mas houve erro no upload da foto: ${uploadResult.error}`);
        } else {
          toast.success("Foto do produto carregada com sucesso.");
        }
      }

      toast.success(isEdit ? "Produto atualizado com sucesso!" : "Produto cadastrado com sucesso!");
      router.push("/dashboard/produtos");
      router.refresh();
    } catch (err: any) {
      toast.error(`Erro: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveExistingImage = async () => {
    if (isReadOnly || (isEdit && !isDono)) {
      toast.error("Você não possui permissão para alterar fotos corporativas.");
      return;
    }
    if (product && product.foto_url) {
      const result = await deleteProductImage(product.id, product.foto_url);
      if (result.error) {
        throw new Error(result.error);
      }
      setImageUrl(null);
      toast.success("Foto removida do produto.");
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => router.push("/dashboard/produtos")}
            type="button"
            className="h-9 w-9"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {isEdit ? `Editar Produto: ${product.nome}` : "Novo Produto"}
              </h1>
              {isEdit && (
                <Badge variant="default" className="text-[10px] uppercase font-bold tracking-wider">
                  Produto Mestre
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit
                ? "Governança corporativa de cadastro centralizado e distribuição por filiais."
                : "Insira os dados do produto corporativo e defina a distribuição inicial."}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => router.push("/dashboard/produtos")}
            disabled={isLoading}
            type="button"
            className="h-10 text-xs font-semibold"
          >
            Cancelar
          </Button>
          {!isReadOnly && (
            <Button
              variant="primary"
              onClick={handleSaveClick}
              isLoading={isLoading}
              type="button"
              className="h-10 text-xs font-semibold gap-1.5"
            >
              <Save className="w-4 h-4" />
              Salvar Alterações
            </Button>
          )}
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-border/40 gap-4 text-sm mb-6 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("geral")}
          className={cn(
            "pb-2 font-semibold border-b-2 px-1 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
            activeTab === "geral"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Layers className="w-4 h-4" />
          Informações Gerais
        </button>
        
        <button
          type="button"
          onClick={() => setActiveTab("fiscal")}
          className={cn(
            "pb-2 font-semibold border-b-2 px-1 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
            activeTab === "fiscal"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Landmark className="w-4 h-4" />
          Fiscal & Tributação
        </button>
        
        {lojas && lojas.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("distribuicao")}
            className={cn(
              "pb-2 font-semibold border-b-2 px-1 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
              activeTab === "distribuicao"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Database className="w-4 h-4" />
            Distribuição & Filiais
          </button>
        )}

        {isEdit && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab("governanca")}
              className={cn(
                "pb-2 font-semibold border-b-2 px-1 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                activeTab === "governanca"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Activity className="w-4 h-4" />
              Resumo & Governança
            </button>
            
            <button
              type="button"
              onClick={() => setActiveTab("auditoria")}
              className={cn(
                "pb-2 font-semibold border-b-2 px-1 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                activeTab === "auditoria"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <History className="w-4 h-4" />
              Histórico de Auditoria
            </button>
          </>
        )}
      </div>

      {/* FORM ACTIONS */}
      <form onSubmit={handleSaveClick}>
        {/* TAB 1: INFORMAÇÕES GERAIS */}
        {activeTab === "geral" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border/30 pb-2">
                  <h2 className="text-sm font-bold tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
                    <Tag className="w-4 h-4" />
                    Identificação Corporativa
                  </h2>
                  {isGlobalDisabled && (
                    <Badge variant="default" className="text-[10px] gap-1 px-2 py-0.5 bg-muted border border-border text-muted-foreground font-medium">
                      <Shield className="w-3 h-3" /> Apenas Dono Edita
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Input
                      label="Nome do Produto *"
                      placeholder="Ex: Coca-Cola Lata 350ml"
                      value={nome}
                      disabled={isGlobalDisabled}
                      onChange={(e) => {
                        setNome(e.target.value);
                        if (errors.nome) setErrors({ ...errors, nome: "" });
                      }}
                      error={errors.nome}
                    />
                  </div>
                  <Input
                    label="Código SKU Mestre"
                    placeholder="Ex: BEB-COC-350"
                    value={sku}
                    disabled={isGlobalDisabled}
                    onChange={(e) => setSku(e.target.value)}
                  />
                  <Input
                    label="Código de Barras Global (EAN) *"
                    placeholder="Ex: 7891234567890"
                    value={codigoBarras}
                    disabled={isGlobalDisabled}
                    onChange={(e) => setCodigoBarras(e.target.value)}
                  />
                  <div className="md:col-span-2">
                    <Input
                      label="Marca / Fabricante"
                      placeholder="Ex: Coca-Cola Company"
                      value={marca}
                      disabled={isGlobalDisabled}
                      onChange={(e) => setMarca(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground select-none">
                      Descrição Ficha Técnica
                    </label>
                    <textarea
                      placeholder="Detalhes adicionais sobre o produto, especificações técnicas..."
                      value={descricao}
                      disabled={isGlobalDisabled}
                      onChange={(e) => setDescricao(e.target.value)}
                      className="w-full bg-input text-foreground border border-border rounded-lg text-sm p-3 min-h-24 outline-none focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Local pricing/stock if NOT owner (Owner edits in distribution tab) */}
              {(!isDono || (lojas && lojas.length <= 1)) && (
                <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
                  <h2 className="text-sm font-bold tracking-wider uppercase text-muted-foreground border-b border-border/30 pb-2">
                    Precificação e Estoque Local
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <Input
                      label="Preço de Custo (R$) *"
                      type="number"
                      step="0.01"
                      min="0"
                      value={precoCusto}
                      disabled={isPriceDisabled}
                      onChange={(e) => setPrecoCusto(e.target.value)}
                      error={errors.precoCusto}
                    />
                    <Input
                      label="Preço de Venda (R$) *"
                      type="number"
                      step="0.01"
                      min="0"
                      value={precoVenda}
                      disabled={isPriceDisabled}
                      onChange={(e) => setPrecoVenda(e.target.value)}
                      error={errors.precoVenda}
                    />
                    <Input
                      label="Preço Promocional (R$)"
                      type="number"
                      step="0.01"
                      min="0"
                      value={precoPromocional}
                      disabled={isPriceDisabled}
                      onChange={(e) => setPrecoPromocional(e.target.value)}
                    />
                    <Input
                      label="Estoque Atual"
                      type="number"
                      step="0.001"
                      min="0"
                      value={estoqueAtual}
                      disabled={isStockDisabled || isEdit}
                      error={errors.estoqueAtual}
                      onChange={(e) => setEstoqueAtual(e.target.value)}
                      hint={isEdit ? "Modificação automática via Ajuste de Estoque." : undefined}
                    />
                    <Input
                      label="Estoque Mínimo"
                      type="number"
                      step="0.001"
                      min="0"
                      value={estoqueMinimo}
                      disabled={isStockDisabled}
                      onChange={(e) => setEstoqueMinimo(e.target.value)}
                    />
                    <Input
                      label="Estoque Máximo"
                      type="number"
                      step="0.001"
                      min="0"
                      value={estoqueMaximo}
                      disabled={isStockDisabled}
                      onChange={(e) => setEstoqueMaximo(e.target.value)}
                    />
                  </div>
                  {/* Realtime profit calculation */}
                  <div className="grid grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg border border-border/40">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Lucro Esperado</span>
                      <span className="text-sm font-bold font-mono text-foreground">{formatBRL(lucro)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Margem Comercial</span>
                      <span className={cn(
                        "text-sm font-bold font-mono",
                        margem < 0 ? "text-destructive" : margem < 20 ? "text-yellow-600" : "text-emerald-600"
                      )}>{margem.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Categorização & Status */}
              <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
                <h2 className="text-sm font-bold tracking-wider uppercase text-muted-foreground border-b border-border/30 pb-2">
                  Categorização & Status
                </h2>
                
                <Select
                  label="Status do Produto"
                  value={status}
                  disabled={isReadOnly}
                  onChange={(e) => setStatus(e.target.value as "ativo" | "inativo")}
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </Select>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                      Categoria Global
                    </span>
                    {!isGlobalDisabled && (
                      <button
                        type="button"
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Nova
                      </button>
                    )}
                  </div>
                  <Select
                    value={categoriaId}
                    disabled={isGlobalDisabled}
                    onChange={(e) => setCategoriaId(e.target.value)}
                  >
                    <option value="">Sem Categoria</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </Select>
                </div>

                <Select
                  label="Unidade Comercial"
                  value={unidade}
                  disabled={isGlobalDisabled}
                  onChange={(e) => setUnidade(e.target.value)}
                >
                  <option value="UN">UN - Unidade</option>
                  <option value="PC">PC - Peça</option>
                  <option value="FD">FD - Fardo</option>
                  <option value="L">L - Litro</option>
                  <option value="KG">KG - Quilograma</option>
                  <option value="CX">CX - Caixa</option>
                  <option value="PAR">PAR - Par</option>
                  <option value="ML">ML - Mililitro</option>
                  <option value="G">G - Grama</option>
                </Select>

                <div className="space-y-3 pt-2 border-t border-border/40">
                  <Switch
                    label="Produto Favorito"
                    description="Fixar nos painéis rápidos de IA e vendas."
                    checked={favorito}
                    disabled={isGlobalDisabled}
                    onChange={(e) => setFavorito(e.target.checked)}
                  />
                  <Switch
                    label="Produto Destaque"
                    description="Exibir em destaque no catálogo e-commerce."
                    checked={destaque}
                    disabled={isGlobalDisabled}
                    onChange={(e) => setDestaque(e.target.checked)}
                  />
                </div>
              </div>

              {/* Localização Física (Active Store context) */}
              {(!isDono || (lojas && lojas.length <= 1)) && (
                <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
                  <h2 className="text-sm font-bold tracking-wider uppercase text-muted-foreground border-b border-border/30 pb-2">
                    Armazenamento Local
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Input
                        label="Depósito / Galpão"
                        placeholder="Ex: Galpão B"
                        value={deposito}
                        disabled={isStockDisabled}
                        onChange={(e) => setDeposito(e.target.value)}
                      />
                    </div>
                    <Input
                      label="Corredor"
                      placeholder="Ex: A5"
                      value={corredor}
                      disabled={isStockDisabled}
                      onChange={(e) => setCorredor(e.target.value)}
                    />
                    <Input
                      label="Prateleira"
                      placeholder="Ex: 3"
                      value={prateleira}
                      disabled={isStockDisabled}
                      onChange={(e) => setPrateleira(e.target.value)}
                    />
                    <div className="col-span-2">
                      <Input
                        label="Lote do Fabricante"
                        placeholder="Ex: LT2026-9"
                        value={lote}
                        disabled={isStockDisabled}
                        onChange={(e) => setLote(e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        label="Data de Validade"
                        type="date"
                        value={validade}
                        disabled={isStockDisabled}
                        onChange={(e) => setValidade(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-border/40 space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Operações Locais Permitidas</label>
                    <div className="flex flex-col gap-2">
                      <Checkbox
                        label="Permitir Venda"
                        checked={permitirVenda}
                        disabled={isStockDisabled}
                        onChange={(e) => setPermitirVenda(e.target.checked)}
                      />
                      <Checkbox
                        label="Permitir Compra / Entrada"
                        checked={permitirCompra}
                        disabled={isStockDisabled}
                        onChange={(e) => setPermitirCompra(e.target.checked)}
                      />
                      <Checkbox
                        label="Permitir Transferência"
                        checked={permitirTransferencia}
                        disabled={isStockDisabled}
                        onChange={(e) => setPermitirTransferencia(e.target.checked)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Upload de Imagem */}
              <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm">
                <ImageUpload
                  value={imageUrl}
                  onChange={setImageFile}
                  onRemoveExisting={handleRemoveExistingImage}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FISCAL & TRIBUTAÇÃO */}
        {activeTab === "fiscal" && (
          <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4 max-w-3xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-border/30 pb-2">
              <h2 className="text-sm font-bold tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
                <Shield className="w-4 h-4" />
                Dados Tributários e Fiscais Corporativos
              </h2>
              {isGlobalDisabled && (
                <Badge variant="default" className="text-[10px] gap-1 px-2 py-0.5 bg-muted border border-border text-muted-foreground font-medium">
                  <Shield className="w-3 h-3" /> Apenas Dono Edita
                </Badge>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-4">
                <Input
                  label="NCM (Nomenclatura Comum do Mercosul)"
                  placeholder="Ex: 2202.10.00"
                  value={ncm}
                  disabled={isGlobalDisabled}
                  onChange={(e) => setNcm(e.target.value)}
                  maxLength={8}
                  hint="Código de 8 dígitos para classificação fiscal aduaneira."
                />
                
                <Input
                  label="CEST (Cód. Especificador da Subst. Tributária)"
                  placeholder="Ex: 03.007.00"
                  value={cest}
                  disabled={isGlobalDisabled}
                  onChange={(e) => setCest(e.target.value)}
                  maxLength={7}
                  hint="Código CEST para produtos sujeitos a substituição tributária (ST)."
                />
              </div>

              <div className="space-y-4">
                <Select
                  label="Origem Fiscal ICMS"
                  value={origemFiscal}
                  disabled={isGlobalDisabled}
                  onChange={(e) => setOrigemFiscal(e.target.value)}
                >
                  <option value="0">0 - Nacional</option>
                  <option value="1">1 - Estrangeira - Importação Direta</option>
                  <option value="2">2 - Estrangeira - Adquirida mercado interno</option>
                  <option value="3">3 - Nacional - Mercadoria com Conteúdo Importação &gt; 40%</option>
                  <option value="4">4 - Nacional - Produção conf. PPB legislativo</option>
                  <option value="5">5 - Nacional - Mercadoria com Conteúdo Importação &lt;= 40%</option>
                  <option value="6">6 - Estrangeira - Importação direta, sem similar nacional</option>
                  <option value="7">7 - Estrangeira - Mercado interno, sem similar nacional</option>
                  <option value="8">8 - Nacional - Conteúdo de Importação &gt; 70%</option>
                </Select>

                <div className="bg-muted/30 border border-border/50 rounded-lg p-3 text-xs text-muted-foreground flex gap-2">
                  <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p>
                    Estas informações são globais no Produto Mestre e serão replicadas automaticamente em todas as filiais distribuídas para emissão correta de cupons fiscais (NFC-e / NF-e).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DISTRIBUIÇÃO & FILIAIS */}
        {activeTab === "distribuicao" && lojas && (
          <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/30 pb-3">
              <div>
                <h2 className="text-sm font-bold tracking-wider uppercase text-muted-foreground">
                  Grade de Distribuição por Filiais
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Selecione as filiais onde o produto estará disponível e configure as particularidades de estoque, localização e preço de cada uma.
                </p>
              </div>
              
              {isDono && !isReadOnly && (
                <div className="flex gap-2 self-start md:self-auto">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleAplicarValoresGlobais}
                    type="button"
                    className="h-8 text-xs font-semibold gap-1"
                  >
                    Aplicar Valores Globais
                  </Button>
                </div>
              )}
            </div>

            {/* Quick selectors for Owner */}
            {isDono && !isReadOnly && (
              <div className="flex flex-wrap gap-4 py-1">
                <Checkbox
                  label="Marcar todas as filiais"
                  description="Selecionar todas as lojas ativas do grupo holding."
                  checked={disponibilidadeTodas}
                  onChange={(e) => handleToggleTodas(e.target.checked)}
                />
              </div>
            )}

            {errors.lojas && (
              <p className="text-xs text-destructive font-medium">{errors.lojas}</p>
            )}

            {/* Dynamic Branch Grid Table */}
            <div className="overflow-x-auto border border-border/40 rounded-lg">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/40 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                    <th className="p-3 w-[45px] text-center">Disp</th>
                    <th className="p-3 min-w-[180px]">Filial</th>
                    <th className="p-3 w-[100px]">SKU Local</th>
                    <th className="p-3 w-[100px]">Estoque</th>
                    <th className="p-3 w-[100px]">Est. Min</th>
                    <th className="p-3 w-[100px]">Est. Max</th>
                    <th className="p-3 w-[110px]">Preço Venda</th>
                    <th className="p-3 w-[110px]">Preço Custo</th>
                    <th className="p-3 w-[150px]">Localização</th>
                    <th className="p-3 w-[130px]">Lote / Validade</th>
                    <th className="p-3 w-[90px]">Status</th>
                    <th className="p-3 w-[120px]">Permissões</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 text-xs">
                  {lojas.map((loja) => {
                    const isSelected = lojasSelecionadas.includes(loja.id);
                    const isMyLoja = product ? loja.id === product.loja_id : false;
                    const canEditRow = isDono || (isGerente && isMyLoja) || (isSupervisor && isMyLoja) || (isEstoquista && isMyLoja);
                    
                    const vals = lojasValores[loja.id] || {
                      sku: "",
                      precoVenda: "0.00",
                      precoCusto: "0.00",
                      precoPromocional: "0.00",
                      estoqueAtual: "0.00",
                      estoqueMinimo: "0.00",
                      estoqueMaximo: "0.00",
                      corredor: "",
                      prateleira: "",
                      deposito: "",
                      lote: "",
                      validade: "",
                      status: "ativo",
                      permitirVenda: true,
                      permitirCompra: true,
                      permitirTransferencia: true,
                      isExisting: false,
                    };

                    const isExistingStore = vals.isExisting;

                    // Compute margin for this specific row in real-time
                    const rowCusto = parsePtBrFloat(vals.precoCusto) || 0;
                    const rowVenda = parsePtBrFloat(vals.precoVenda) || 0;
                    const rowMargem = rowVenda > 0 ? ((rowVenda - rowCusto) / rowVenda) * 100 : 0;

                    return (
                      <tr
                        key={loja.id}
                        className={cn(
                          "transition-colors duration-150",
                          isSelected ? "bg-muted/10" : "opacity-50 hover:opacity-100",
                          !canEditRow && "bg-muted/5 opacity-80"
                        )}
                      >
                        {/* Checkbox */}
                        <td className="p-3 text-center">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={isSelected}
                              disabled={isReadOnly || !isDono}
                              onChange={() => handleToggleLoja(loja.id)}
                            />
                          </div>
                        </td>

                        {/* Loja Info */}
                        <td className="p-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-foreground">{loja.nome_loja}</span>
                            <div className="flex gap-1.5 flex-wrap">
                              <Badge variant="default" className="text-[9px] px-1 py-0 capitalize font-medium">
                                {loja.tipo_unidade}
                              </Badge>
                              {isMyLoja && (
                                <Badge variant="default" className="text-[9px] px-1 py-0 bg-primary/10 border-primary/20 text-primary font-bold">
                                  Minha Filial
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Local SKU */}
                        <td className="p-3">
                          {isSelected && canEditRow ? (
                            <input
                              type="text"
                              value={vals.sku}
                              placeholder="Ex: SKU-LOC"
                              onChange={(e) => {
                                setLojasValores((v) => ({
                                  ...v,
                                  [loja.id]: { ...v[loja.id], sku: e.target.value },
                                }));
                              }}
                              className="w-full bg-input text-foreground border border-border rounded px-2 py-1 text-xs outline-none focus:border-primary font-mono"
                            />
                          ) : (
                            <span className="font-mono text-muted-foreground">{vals.sku || "-"}</span>
                          )}
                        </td>

                        {/* Estoque Atual */}
                        <td className="p-3">
                          {isSelected && canEditRow && !isFinanceiro ? (
                            <div className="flex flex-col gap-0.5">
                              <input
                                type="number"
                                step="0.001"
                                min="0"
                                value={vals.estoqueAtual}
                                disabled={isEdit && isExistingStore && !isDono && !isGerente} // block direct edit in edit mode for operators
                                onChange={(e) => {
                                  setLojasValores((v) => ({
                                    ...v,
                                    [loja.id]: { ...v[loja.id], estoqueAtual: e.target.value },
                                  }));
                                }}
                                className={cn(
                                  "w-full bg-input text-foreground border border-border rounded px-2 py-1 text-xs font-mono outline-none focus:border-primary",
                                  isEdit && isExistingStore && "bg-muted/30 cursor-not-allowed opacity-80"
                                )}
                              />
                              {isEdit && isExistingStore && (
                                <span className="text-[8px] text-muted-foreground leading-none">Ajuste Auto</span>
                              )}
                            </div>
                          ) : (
                            <span className="font-mono font-semibold text-foreground">{vals.estoqueAtual}</span>
                          )}
                        </td>

                        {/* Estoque Mínimo */}
                        <td className="p-3">
                          {isSelected && canEditRow && !isFinanceiro ? (
                            <input
                              type="number"
                              step="0.001"
                              value={vals.estoqueMinimo}
                              onChange={(e) => {
                                setLojasValores((v) => ({
                                  ...v,
                                  [loja.id]: { ...v[loja.id], estoqueMinimo: e.target.value },
                                }));
                              }}
                              className="w-full bg-input text-foreground border border-border rounded px-2 py-1 text-xs font-mono outline-none"
                            />
                          ) : (
                            <span className="font-mono text-muted-foreground">{vals.estoqueMinimo}</span>
                          )}
                        </td>

                        {/* Estoque Máximo */}
                        <td className="p-3">
                          {isSelected && canEditRow && !isFinanceiro ? (
                            <input
                              type="number"
                              step="0.001"
                              value={vals.estoqueMaximo}
                              onChange={(e) => {
                                setLojasValores((v) => ({
                                  ...v,
                                  [loja.id]: { ...v[loja.id], estoqueMaximo: e.target.value },
                                }));
                              }}
                              className="w-full bg-input text-foreground border border-border rounded px-2 py-1 text-xs font-mono outline-none"
                            />
                          ) : (
                            <span className="font-mono text-muted-foreground">{vals.estoqueMaximo}</span>
                          )}
                        </td>

                        {/* Preço de Venda */}
                        <td className="p-3">
                          {isSelected && canEditRow && !isEstoquista ? (
                            <div className="flex flex-col gap-0.5">
                              <input
                                type="number"
                                step="0.01"
                                value={vals.precoVenda}
                                onChange={(e) => {
                                  setLojasValores((v) => ({
                                    ...v,
                                    [loja.id]: { ...v[loja.id], precoVenda: e.target.value },
                                  }));
                                }}
                                className="w-full bg-input text-foreground border border-border rounded px-2 py-1 text-xs font-mono outline-none focus:border-primary"
                              />
                              <span className={cn(
                                "text-[9px] font-mono text-right",
                                rowMargem < 0 ? "text-destructive" : rowMargem < 20 ? "text-yellow-600" : "text-emerald-600"
                              )}>
                                M: {rowMargem.toFixed(0)}%
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="font-mono font-semibold text-foreground">{formatBRL(rowVenda)}</span>
                              <span className="text-[8px] text-muted-foreground font-mono">Margem: {rowMargem.toFixed(0)}%</span>
                            </div>
                          )}
                        </td>

                        {/* Preço de Custo */}
                        <td className="p-3">
                          {isSelected && canEditRow && !isEstoquista ? (
                            <input
                              type="number"
                              step="0.01"
                              value={vals.precoCusto}
                              onChange={(e) => {
                                setLojasValores((v) => ({
                                  ...v,
                                  [loja.id]: { ...v[loja.id], precoCusto: e.target.value },
                                }));
                              }}
                              className="w-full bg-input text-foreground border border-border rounded px-2 py-1 text-xs font-mono outline-none"
                            />
                          ) : (
                            <span className="font-mono text-muted-foreground">{formatBRL(rowCusto)}</span>
                          )}
                        </td>

                        {/* Localização Física */}
                        <td className="p-3">
                          {isSelected && canEditRow && !isFinanceiro ? (
                            <div className="flex flex-col gap-1">
                              <input
                                type="text"
                                value={vals.deposito}
                                placeholder="Depósito"
                                onChange={(e) => {
                                  setLojasValores((v) => ({
                                    ...v,
                                    [loja.id]: { ...v[loja.id], deposito: e.target.value },
                                  }));
                                }}
                                className="w-full bg-input border border-border rounded px-1.5 py-0.5 text-[10px] outline-none"
                              />
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  value={vals.corredor}
                                  placeholder="Corr."
                                  onChange={(e) => {
                                    setLojasValores((v) => ({
                                      ...v,
                                      [loja.id]: { ...v[loja.id], corredor: e.target.value },
                                    }));
                                  }}
                                  className="w-1/2 bg-input border border-border rounded px-1.5 py-0.5 text-[10px]"
                                />
                                <input
                                  type="text"
                                  value={vals.prateleira}
                                  placeholder="Prat."
                                  onChange={(e) => {
                                    setLojasValores((v) => ({
                                      ...v,
                                      [loja.id]: { ...v[loja.id], prateleira: e.target.value },
                                    }));
                                  }}
                                  className="w-1/2 bg-input border border-border rounded px-1.5 py-0.5 text-[10px]"
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              {vals.deposito ? `${vals.deposito} (C:${vals.corredor || "-"}, P:${vals.prateleira || "-"})` : "-"}
                            </span>
                          )}
                        </td>

                        {/* Lote / Validade */}
                        <td className="p-3">
                          {isSelected && canEditRow && !isFinanceiro ? (
                            <div className="flex flex-col gap-1">
                              <input
                                type="text"
                                value={vals.lote}
                                placeholder="Lote"
                                onChange={(e) => {
                                  setLojasValores((v) => ({
                                    ...v,
                                    [loja.id]: { ...v[loja.id], lote: e.target.value },
                                  }));
                                }}
                                className="w-full bg-input border border-border rounded px-1.5 py-0.5 text-[10px] outline-none"
                              />
                              <input
                                type="date"
                                value={vals.validade}
                                onChange={(e) => {
                                  setLojasValores((v) => ({
                                    ...v,
                                    [loja.id]: { ...v[loja.id], validade: e.target.value },
                                  }));
                                }}
                                className="w-full bg-input border border-border rounded px-1.5 py-0.5 text-[10px] outline-none"
                              />
                            </div>
                          ) : (
                            <div className="flex flex-col text-[10px]">
                              {vals.lote && <span>Lote: {vals.lote}</span>}
                              {vals.validade && <span>Val: {vals.validade}</span>}
                              {!vals.lote && !vals.validade && <span className="text-muted-foreground">-</span>}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-3">
                          {isSelected && canEditRow ? (
                            <select
                              value={vals.status}
                              onChange={(e) => {
                                setLojasValores((v) => ({
                                  ...v,
                                  [loja.id]: {
                                    ...v[loja.id],
                                    status: e.target.value as "ativo" | "inativo",
                                  },
                                }));
                              }}
                              className="w-full bg-input border border-border rounded px-1 py-1 text-xs"
                            >
                              <option value="ativo">Ativo</option>
                              <option value="inativo">Inativo</option>
                            </select>
                          ) : (
                            <Badge variant={vals.status === "ativo" ? "default" : "error"} className="text-[9px] py-0">
                              {vals.status}
                            </Badge>
                          )}
                        </td>

                        {/* Permissões Locais */}
                        <td className="p-3">
                          {isSelected && canEditRow && !isFinanceiro ? (
                            <div className="flex flex-col gap-1 text-[10px]">
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={vals.permitirVenda}
                                  onChange={(e) => {
                                    setLojasValores((v) => ({
                                      ...v,
                                      [loja.id]: { ...v[loja.id], permitirVenda: e.target.checked },
                                    }));
                                  }}
                                  className="rounded"
                                /> Vender
                              </label>
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={vals.permitirCompra}
                                  onChange={(e) => {
                                    setLojasValores((v) => ({
                                      ...v,
                                      [loja.id]: { ...v[loja.id], permitirCompra: e.target.checked },
                                    }));
                                  }}
                                  className="rounded"
                                /> Comprar
                              </label>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5 text-[9px] font-semibold text-muted-foreground">
                              {vals.permitirVenda && <span className="text-emerald-600">✓ Venda Habilitada</span>}
                              {!vals.permitirVenda && <span className="text-destructive">✗ Bloqueado Venda</span>}
                              {vals.permitirCompra && <span className="text-blue-600">✓ Compra Habilitada</span>}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: RESUMO EXECUTIVO & GOVERNANÇA */}
        {activeTab === "governanca" && isEdit && (
          <div className="space-y-6 animate-fadeIn">
            {isGovLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center py-10">
                <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                Carregando indicadores corporativos...
              </div>
            )}

            {!isGovLoading && governanceData && (
              <>
                {/* Executive Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Estoque Corp. Total</span>
                    <p className="text-2xl font-black text-foreground font-mono mt-1">{governanceData.totalEstoqueCorporativo} <span className="text-xs font-normal text-muted-foreground">{unidade}</span></p>
                    <span className="text-[9px] text-muted-foreground">Consolidado em todas as filiais</span>
                  </div>

                  <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Valor em Estoque Corp.</span>
                    <p className="text-2xl font-black text-primary font-mono mt-1">{formatBRL(governanceData.valorTotalEstoque)}</p>
                    <span className="text-[9px] text-muted-foreground">Calculado a preço de custo</span>
                  </div>

                  <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Preço Médio de Venda</span>
                    <p className="text-2xl font-black text-foreground font-mono mt-1">{formatBRL(governanceData.precoMedio)}</p>
                    <span className="text-[9px] text-muted-foreground">
                      Mín: {formatBRL(governanceData.menorPreco)} | Máx: {formatBRL(governanceData.maiorPreco)}
                    </span>
                  </div>

                  <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Filiais Distribuídas</span>
                    <p className="text-2xl font-black text-foreground font-mono mt-1">
                      {governanceData.lojasAtivas} <span className="text-xs font-semibold text-emerald-600">Ativas</span>
                    </p>
                    <span className="text-[9px] text-muted-foreground">{governanceData.lojasInativas} inativas ou suspensas</span>
                  </div>
                </div>

                {/* Branch overview grid */}
                <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold tracking-wider uppercase text-muted-foreground border-b border-border/30 pb-2">Distribuição Patrimonial por Filial</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-muted/30 border-b border-border/40 text-[10px] font-bold uppercase text-muted-foreground">
                          <th className="p-3">Filial</th>
                          <th className="p-3">Estoque Local</th>
                          <th className="p-3">Valor Patrimonial</th>
                          <th className="p-3">Preço Praticado</th>
                          <th className="p-3">Custo Praticado</th>
                          <th className="p-3">Margem Comercial</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30 text-xs font-mono">
                        {governanceData.lojasConfig.map((c: any) => {
                          const valorPatrimonial = Number(c.preco_custo || 0) * Number(c.estoque_atual || 0);
                          const margemRow = Number(c.preco_venda) > 0 ? ((Number(c.preco_venda) - Number(c.preco_custo)) / Number(c.preco_venda)) * 100 : 0;
                          
                          return (
                            <tr key={c.id}>
                              <td className="p-3 font-sans font-semibold text-foreground">{c.loja?.nome_loja}</td>
                              <td className="p-3 text-foreground font-bold">{c.estoque_atual} {unidade}</td>
                              <td className="p-3 text-muted-foreground">{formatBRL(valorPatrimonial)}</td>
                              <td className="p-3 text-foreground font-bold">{formatBRL(c.preco_venda)}</td>
                              <td className="p-3 text-muted-foreground">{formatBRL(c.preco_custo)}</td>
                              <td className={cn(
                                "p-3 font-bold",
                                margemRow < 0 ? "text-destructive" : "text-emerald-600"
                              )}>
                                {margemRow.toFixed(1)}%
                              </td>
                              <td className="p-3 font-sans">
                                <Badge variant={c.status === "ativo" ? "default" : "error"} className="text-[9px] py-0">
                                  {c.status}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 5: HISTÓRICO DE AUDITORIA */}
        {activeTab === "auditoria" && isEdit && (
          <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4 animate-fadeIn">
            <h2 className="text-sm font-bold tracking-wider uppercase text-muted-foreground border-b border-border/30 pb-2 flex items-center gap-1.5">
              <History className="w-4 h-4" />
              Histórico de Alterações e Governança (Auditoria Corporativa)
            </h2>

            {isGovLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center py-10">
                <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                Carregando histórico...
              </div>
            )}

            {!isGovLoading && auditHistory.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhuma alteração registrada para este produto mestre.</p>
            )}

            {!isGovLoading && auditHistory.length > 0 && (
              <div className="relative border-l border-border/65 ml-3 pl-5 space-y-6 py-2">
                {auditHistory.map((log) => {
                  let badgeVariant: "default" | "warning" | "error" = "default";
                  let actionText = log.acao;

                  if (log.acao === "criacao") {
                    actionText = "Criação de Produto Mestre";
                  } else if (log.acao === "edicao") {
                    actionText = "Atualização de Atributos Globais";
                    badgeVariant = "warning";
                  } else if (log.acao === "alteracao_preco") {
                    actionText = "Alteração de Preço Local";
                    badgeVariant = "warning";
                  } else if (log.acao === "ajuste_estoque") {
                    actionText = "Ajuste de Estoque Manual";
                    badgeVariant = "warning";
                  } else if (log.acao === "desativacao_filial") {
                    actionText = "Inativação de Filial";
                    badgeVariant = "error";
                  } else if (log.acao === "distribuicao") {
                    actionText = "Distribuição para Nova Filial";
                  }

                  const formattedDate = new Date(log.created_at).toLocaleString("pt-BR");

                  return (
                    <div key={log.id} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[26px] top-1 bg-card border-2 border-primary w-3 h-3 rounded-full" />
                      
                      <div className="flex flex-col gap-1 bg-muted/20 border border-border/40 p-3.5 rounded-lg">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">{actionText}</span>
                            <Badge variant="default" className="text-[8px] py-0 capitalize">
                              {log.escopo}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">{formattedDate}</span>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground mt-1 font-semibold">
                          <span>Operador: <span className="text-foreground">{log.usuario_nome}</span></span>
                          {log.loja_nome && <span>Filial: <span className="text-foreground">{log.loja_nome}</span></span>}
                        </div>

                        {/* Changes details */}
                        {log.dados_anteriores && log.dados_novos && (
                          <div className="mt-2.5 text-[10px] border-t border-border/30 pt-2 space-y-1.5 font-mono">
                            {Object.keys(log.dados_novos).map((key) => {
                              const beforeVal = log.dados_anteriores?.[key];
                              const afterVal = log.dados_novos?.[key];
                              
                              if (JSON.stringify(beforeVal) === JSON.stringify(afterVal)) return null;

                              // Render key in a readable format
                              let label = key;
                              let valBefore = String(beforeVal !== undefined ? beforeVal : "");
                              let valAfter = String(afterVal !== undefined ? afterVal : "");

                              if (key === "preco_venda") {
                                label = "Preço de Venda";
                                valBefore = formatBRL(Number(beforeVal));
                                valAfter = formatBRL(Number(afterVal));
                              } else if (key === "preco_custo") {
                                label = "Preço de Custo";
                                valBefore = formatBRL(Number(beforeVal));
                                valAfter = formatBRL(Number(afterVal));
                              } else if (key === "estoque_atual") {
                                label = "Estoque Físico";
                              } else if (key === "status") {
                                label = "Status";
                              }

                              if (key === "diferenca") return null;

                              return (
                                <div key={key} className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                                  <span className="text-muted-foreground font-semibold">{label}:</span>
                                  <span className="sm:col-span-2 text-foreground">
                                    <span className="text-destructive font-bold line-through">{valBefore || "Vazio"}</span>
                                    <span className="mx-1.5 text-muted-foreground">→</span>
                                    <span className="text-emerald-600 font-bold">{valAfter || "Vazio"}</span>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </form>

      {/* QUICK CATEGORY CREATE MODAL */}
      <CategoryQuickCreate
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={(newCat) => {
          setCategories((prev) => [...prev, newCat].sort((a, b) => a.nome.localeCompare(b.nome)));
          setCategoriaId(newCat.id);
        }}
      />

      {/* UX DIALOG: CONFIRMAÇÃO DE SINCRONIZAÇÃO INTELIGENTE (PROMPTS) */}
      {showSyncPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-card border border-border rounded-xl p-6 shadow-2xl max-w-lg w-full space-y-4">
            <div className="flex items-center gap-2.5 text-yellow-600 border-b border-border/40 pb-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="font-black text-sm uppercase tracking-wider text-foreground">
                Sincronização Corporativa de Dados
              </h3>
            </div>
            
            <p className="text-xs text-muted-foreground leading-relaxed">
              Você alterou atributos estruturais do produto. Como deseja propagar estas alterações em toda a holding do grupo?
            </p>

            {/* Global parameters sync option */}
            <div className="space-y-3 bg-muted/10 p-3 rounded-lg border border-border/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">1. Atributos Gerais (Nome, NCM, Marca, etc.)</span>
              <div className="flex flex-col gap-2.5">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                  <input 
                    type="radio" 
                    name="sync_general" 
                    checked={syncOption === "all"}
                    onChange={() => setSyncOption("all")}
                    className="mt-0.5"
                  />
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">Sincronizar em Todas as Filiais (Recomendado)</span>
                    <span className="text-[10px] text-muted-foreground">Atualiza os campos corporativos na matriz e em todas as filiais distribuídas.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                  <input 
                    type="radio" 
                    name="sync_general" 
                    checked={syncOption === "local"}
                    onChange={() => setSyncOption("local")}
                    className="mt-0.5"
                  />
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">Manter Apenas no Produto Mestre</span>
                    <span className="text-[10px] text-muted-foreground">Altera as informações centrais, mas não as força nas filiais imediatamente.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Prices sync option */}
            <div className="space-y-3 bg-muted/10 p-3 rounded-lg border border-border/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">2. Propagação de Preço Corporativo</span>
              <div className="flex flex-col gap-2.5">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                  <input 
                    type="radio" 
                    name="sync_price" 
                    checked={priceSyncOption === "all"}
                    onChange={() => setPriceSyncOption("all")}
                    className="mt-0.5"
                  />
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">Propagar Preço da Matriz para Todas as Lojas</span>
                    <span className="text-[10px] text-muted-foreground">Replica o novo preço de venda e preço de custo locais em todas as filiais.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                  <input 
                    type="radio" 
                    name="sync_price" 
                    checked={priceSyncOption === "none"}
                    onChange={() => setPriceSyncOption("none")}
                    className="mt-0.5"
                  />
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">Manter Preços Individuais das Filiais</span>
                    <span className="text-[10px] text-muted-foreground">Preserva o isolamento de margens locais de cada loja física.</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 border-t border-border/40 pt-4">
              <Button
                variant="secondary"
                onClick={() => setShowSyncPrompt(false)}
                type="button"
                className="h-9 text-xs"
              >
                Voltar ao Formulário
              </Button>
              <Button
                variant="primary"
                onClick={() => executeSave(syncOption === "all", priceSyncOption)}
                type="button"
                className="h-9 text-xs font-semibold gap-1.5"
              >
                <Check className="w-4 h-4" />
                Confirmar e Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
