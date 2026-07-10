"use client";

import * as React from "react";
import { 
  Settings, 
  Building2, 
  Sliders, 
  Save, 
  Palette, 
  Mail, 
  Phone, 
  MapPin, 
  FileText,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { getDadosLoja, updateDadosLoja, getConfiguracoesLoja, updateConfiguracoesLoja } from "@/lib/actions/configuracoes";
import type { DadosLojaInfo, ConfiguracoesLojaInfo } from "@/lib/actions/configuracoes";

interface ConfiguracoesPageClientProps {
  userTipo: string;
}

export const ConfiguracoesPageClient: React.FC<ConfiguracoesPageClientProps> = ({ userTipo }) => {
  const [activeTab, setActiveTab] = React.useState<"empresa" | "operacional">("empresa");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // States para dados da empresa
  const [lojaInfo, setLojaInfo] = React.useState<DadosLojaInfo | null>(null);
  const [nomeLoja, setNomeLoja] = React.useState("");
  const [razaoSocial, setRazaoSocial] = React.useState("");
  const [cnpj, setCnpj] = React.useState("");
  const [telefone, setTelefone] = React.useState("");
  const [whatsapp, setWhatsapp] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [corPrimaria, setCorPrimaria] = React.useState("#6366f1");
  const [corSecundaria, setCorSecundaria] = React.useState("#818cf8");

  // Endereço (JSONB)
  const [cep, setCep] = React.useState("");
  const [logradouro, setLogradouro] = React.useState("");
  const [numero, setNumero] = React.useState("");
  const [bairro, setBairro] = React.useState("");
  const [cidade, setCidade] = React.useState("");
  const [estado, setEstado] = React.useState("");

  // States para configurações operacionais
  const [configInfo, setConfigInfo] = React.useState<ConfiguracoesLojaInfo | null>(null);
  const [permitirEstoqueNegativo, setPermitirEstoqueNegativo] = React.useState(false);
  const [exigirCpfVenda, setExigirCpfVenda] = React.useState(false);
  const [permitirDescontoCaixa, setPermitirDescontoCaixa] = React.useState(false);
  const [descontoMaximo, setDescontoMaximo] = React.useState(0);
  const [mensagemComprovante, setMensagemComprovante] = React.useState("");

  React.useEffect(() => {
    carregarDados();
  }, []);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      // 1. Obter dados cadastrais da loja
      const resLoja = await getDadosLoja();
      if (resLoja.error) {
        showToast("error", `Erro ao carregar dados da empresa: ${resLoja.error}`);
      } else if (resLoja.data) {
        const d = resLoja.data;
        setLojaInfo(d);
        setNomeLoja(d.nome_loja || "");
        setRazaoSocial(d.razao_social || "");
        setCnpj(d.cnpj || "");
        setTelefone(d.telefone || "");
        setWhatsapp(d.whatsapp || "");
        setEmail(d.email || "");
        setLogoUrl(d.logo_url || "");
        setCorPrimaria(d.cor_primaria || "#6366f1");
        setCorSecundaria(d.cor_secundaria || "#818cf8");

        const end = d.endereco || {};
        setCep(end.cep || "");
        setLogradouro(end.logradouro || "");
        setNumero(end.numero || "");
        setBairro(end.bairro || "");
        setCidade(end.cidade || "");
        setEstado(end.estado || "");
      }

      // 2. Obter configurações operacionais da loja
      const resConfig = await getConfiguracoesLoja();
      if (resConfig.error) {
        showToast("error", `Erro ao carregar configurações: ${resConfig.error}`);
      } else if (resConfig.data) {
        const c = resConfig.data;
        setConfigInfo(c);
        setPermitirEstoqueNegativo(c.permitir_estoque_negativo);
        setExigirCpfVenda(c.exigir_cpf_venda);
        setPermitirDescontoCaixa(c.permitir_desconto_caixa);
        setDescontoMaximo(Number(c.desconto_maximo_percentual) || 0);
        setMensagemComprovante(c.mensagem_comprovante || "");
      }
    } catch (err) {
      console.error(err);
      showToast("error", "Ocorreu um erro ao carregar os dados das configurações.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userTipo !== "dono" && userTipo !== "gerente") {
      showToast("error", "Você não tem permissão para editar os dados cadastrais.");
      return;
    }

    setSaving(true);
    try {
      const enderecoObj = {
        cep,
        logradouro,
        numero,
        bairro,
        cidade,
        estado
      };

      const res = await updateDadosLoja({
        nome_loja: nomeLoja,
        razao_social: razaoSocial,
        cnpj,
        telefone,
        whatsapp,
        email,
        logo_url: logoUrl,
        cor_primaria: corPrimaria,
        cor_secundaria: corSecundaria,
        endereco: enderecoObj
      });

      if (res.error) {
        showToast("error", `Erro ao salvar: ${res.error}`);
      } else {
        showToast("success", "Dados cadastrais da loja atualizados com sucesso!");
      }
    } catch (err: any) {
      showToast("error", err.message || "Erro desconhecido ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOperacional = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userTipo !== "dono" && userTipo !== "gerente") {
      showToast("error", "Você não tem permissão para editar os parâmetros operacionais.");
      return;
    }

    setSaving(true);
    try {
      const res = await updateConfiguracoesLoja({
        permitir_estoque_negativo: permitirEstoqueNegativo,
        exigir_cpf_venda: exigirCpfVenda,
        permitir_desconto_caixa: permitirDescontoCaixa,
        desconto_maximo_percentual: descontoMaximo,
        mensagem_comprovante: mensagemComprovante
      });

      if (res.error) {
        showToast("error", `Erro ao salvar: ${res.error}`);
      } else {
        showToast("success", "Regras e parâmetros operacionais atualizados com sucesso!");
      }
    } catch (err: any) {
      showToast("error", err.message || "Erro desconhecido ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="text-sm font-semibold text-muted-foreground animate-pulse">Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div 
          className={`fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl z-50 animate-slide-up ${
            toast.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
              : "bg-destructive/10 border-destructive/20 text-destructive-foreground"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-1 select-none">
        <h1 className="text-xl font-black text-foreground flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-primary" />
          Configurações da Loja
        </h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Gerencie a identidade, dados de contato e os parâmetros comerciais e operacionais do PDV da sua unidade.
        </p>
      </div>

      {/* Tab Selector */}
      <div className="flex border-b border-border select-none gap-2">
        <button
          onClick={() => setActiveTab("empresa")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "empresa" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
          }`}
        >
          <Building2 size={14} />
          Dados da Empresa
        </button>
        <button
          onClick={() => setActiveTab("operacional")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "operacional" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
          }`}
        >
          <Sliders size={14} />
          Parâmetros do PDV & Estoque
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-4xl">
        {activeTab === "empresa" ? (
          <form onSubmit={handleSaveEmpresa} className="space-y-6 animate-fade-in">
            {/* Seção 1: Identidade da Loja */}
            <div className="border border-border/80 bg-card/60 backdrop-blur-md rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                Identidade Visual e Cadastro
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Nome da Loja *</label>
                  <input
                    type="text"
                    required
                    value={nomeLoja}
                    onChange={(e) => setNomeLoja(e.target.value)}
                    placeholder="Ex: Minha Loja Matriz"
                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Logo URL (Opcional)</label>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="Ex: https://imagem.com/logo.png"
                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold outline-none"
                  />
                </div>
              </div>

              {/* Seletor de cores da marca */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-center gap-3 p-3 border border-border/40 rounded-xl bg-input/20">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-border/60">
                    <input
                      type="color"
                      value={corPrimaria}
                      onChange={(e) => setCorPrimaria(e.target.value)}
                      className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-extrabold text-foreground leading-none">Cor Primária</span>
                    <span className="text-[9px] text-muted-foreground mt-1 uppercase font-mono">{corPrimaria}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 border border-border/40 rounded-xl bg-input/20">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-border/60">
                    <input
                      type="color"
                      value={corSecundaria}
                      onChange={(e) => setCorSecundaria(e.target.value)}
                      className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-extrabold text-foreground leading-none">Cor Secundária</span>
                    <span className="text-[9px] text-muted-foreground mt-1 uppercase font-mono">{corSecundaria}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção 2: Dados Corporativos e Contato */}
            <div className="border border-border/80 bg-card/60 backdrop-blur-md rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Dados Corporativos & Contato
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Razão Social</label>
                  <input
                    type="text"
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value)}
                    placeholder="Razão Social da Empresa"
                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">CNPJ</label>
                  <input
                    type="text"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <Phone className="w-3 h-3 text-muted-foreground" /> Telefone Contato
                  </label>
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(00) 0000-0000"
                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <Phone className="w-3 h-3 text-muted-foreground" /> WhatsApp Comercial
                  </label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(00) 99999-9999"
                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold outline-none"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <Mail className="w-3 h-3 text-muted-foreground" /> E-mail da Loja
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@minhaempresa.com"
                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Seção 3: Endereço */}
            <div className="border border-border/80 bg-card/60 backdrop-blur-md rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Endereço Físico
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">CEP</label>
                  <input
                    type="text"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    placeholder="00000-000"
                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold outline-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Rua / Logradouro</label>
                  <input
                    type="text"
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    placeholder="Av. Principal"
                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Número / Apto</label>
                  <input
                    type="text"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="123"
                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Bairro</label>
                  <input
                    type="text"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    placeholder="Centro"
                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Cidade</label>
                  <input
                    type="text"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="São Paulo"
                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Estado (UF)</label>
                  <input
                    type="text"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    placeholder="SP"
                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-end select-none">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-lg hover:bg-primary/95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Salvar Dados Cadastrais
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSaveOperacional} className="space-y-6 animate-fade-in">
            {/* Parâmetros do PDV e Regras de Negócio */}
            <div className="border border-border/80 bg-card/60 backdrop-blur-md rounded-2xl p-6 space-y-6">
              <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                Regras Operacionais de Venda
              </h3>

              <div className="space-y-4">
                {/* 1. Estoque Negativo */}
                <div className="flex items-center justify-between p-4 border border-border/40 rounded-xl bg-input/10 select-none">
                  <div className="flex flex-col min-w-0 pr-4">
                    <span className="text-xs font-bold text-foreground">Permitir Venda sem Estoque</span>
                    <span className="text-[10px] text-muted-foreground mt-1 leading-normal">
                      Permite que o operador de caixa realize vendas no PDV mesmo se o produto estiver com estoque zerado ou negativo no sistema.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permitirEstoqueNegativo}
                      onChange={(e) => setPermitirEstoqueNegativo(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-border rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* 2. Exigir CPF */}
                <div className="flex items-center justify-between p-4 border border-border/40 rounded-xl bg-input/10 select-none">
                  <div className="flex flex-col min-w-0 pr-4">
                    <span className="text-xs font-bold text-foreground">Exigir CPF do Cliente na Venda</span>
                    <span className="text-[10px] text-muted-foreground mt-1 leading-normal">
                      Torna obrigatória a identificação do CPF do cliente antes de finalizar qualquer venda no caixa.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exigirCpfVenda}
                      onChange={(e) => setExigirCpfVenda(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-border rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* 3. Permitir Desconto no Caixa */}
                <div className="flex items-center justify-between p-4 border border-border/40 rounded-xl bg-input/10 select-none">
                  <div className="flex flex-col min-w-0 pr-4">
                    <span className="text-xs font-bold text-foreground">Permitir Concessão de Desconto no Checkout</span>
                    <span className="text-[10px] text-muted-foreground mt-1 leading-normal">
                      Habilita o campo de desconto manual de itens ou no subtotal da venda na tela de pagamentos do PDV.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permitirDescontoCaixa}
                      onChange={(e) => setPermitirDescontoCaixa(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-border rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* 4. Desconto Máximo e Rodapé do Comprovante */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Desconto Máximo (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={descontoMaximo}
                      onChange={(e) => setDescontoMaximo(Number(e.target.value))}
                      placeholder="Ex: 15"
                      className="w-full px-3 py-2 border rounded-xl text-xs font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Mensagem de Rodapé (Cupom/Comprovante)</label>
                    <input
                      type="text"
                      required
                      value={mensagemComprovante}
                      onChange={(e) => setMensagemComprovante(e.target.value)}
                      placeholder="Obrigado pela preferência!"
                      className="w-full px-3 py-2 border rounded-xl text-xs font-bold outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Alerta de Governança */}
            <div className="flex gap-3 p-4 border border-violet-500/20 bg-violet-500/5 rounded-2xl select-none">
              <AlertTriangle className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-xs font-extrabold text-violet-300">Aviso de Governança</span>
                <span className="text-[10px] text-violet-200 mt-1 leading-relaxed">
                  As configurações operacionais alteram em tempo real o fluxo de vendas do PDV e Caixa de todos os seus colaboradores ativos nesta unidade.
                </span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-end select-none">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-lg hover:bg-primary/95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Salvar Parâmetros Operacionais
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
