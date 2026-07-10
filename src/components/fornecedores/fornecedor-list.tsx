import * as React from "react";
import Link from "next/link";
import type { FornecedorListItem } from "@/lib/types/fornecedores";
import { formatBRL, getStatusLabel } from "@/lib/types/compras";
import { toggleFornecedorStatus } from "@/lib/actions/fornecedores";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import {
  Search, Filter, ArrowUpDown, Eye, Edit2, ShieldAlert, CheckCircle,
  XCircle, ChevronLeft, ChevronRight, Download, FileText, Printer, Lock
} from "lucide-react";

interface FornecedorListProps {
  fornecedores: FornecedorListItem[];
  total: number;
  filters: any;
  setFilters: React.Dispatch<React.SetStateAction<any>>;
  userTipo?: string;
  onEditClick: (fornecedor: FornecedorListItem) => void;
  onRefresh: () => void;
}

export function FornecedorList({
  fornecedores,
  total,
  filters,
  setFilters,
  userTipo = "caixa",
  onEditClick,
  onRefresh,
}: FornecedorListProps) {
  const isEstoquista = userTipo === "estoquista";
  const isManager = userTipo === "dono" || userTipo === "gerente";
  const [showFiltersDrawer, setShowFiltersDrawer] = React.useState(false);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  const handleToggleStatus = async (id: string, currentStatus: "ativo" | "inativo") => {
    if (!isManager) {
      toast.error("Estoquistas não podem ativar ou desativar fornecedores.");
      return;
    }

    const nextStatus = currentStatus === "ativo" ? "inativo" : "ativo";
    const confirm = window.confirm(
      `Tem certeza que deseja ${nextStatus === "inativo" ? "desativar" : "reativar"} este fornecedor?`
    );
    if (!confirm) return;

    setTogglingId(id);
    try {
      const res = await toggleFornecedorStatus(id, nextStatus);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Fornecedor ${nextStatus === "inativo" ? "desativado" : "reativado"} com sucesso!`);
        onRefresh();
      }
    } catch {
      toast.error("Erro ao alterar status do fornecedor.");
    } finally {
      setTogglingId(null);
    }
  };

  const totalPages = Math.ceil(total / (filters.perPage || 15));

  // ============================================
  // EXPORTADORES CLIENT-SIDE
  // ============================================
  
  // 1. Exportar CSV
  const handleExportCSV = () => {
    if (fornecedores.length === 0) return;
    
    const headers = ["Nome", "CNPJ", "Contato", "Telefone", "WhatsApp", "Email", "Status", "Qtd Compras", "Total Comprado", "Ultima Compra"];
    const rows = fornecedores.map(f => [
      f.nome,
      f.cnpj || "",
      f.contato || "",
      f.telefone || "",
      f.whatsapp || "",
      f.email || "",
      f.status === "ativo" ? "Ativo" : "Inativo",
      f.qtd_compras,
      f.valor_comprado.toFixed(2),
      f.ultima_compra || "Sem Compras",
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(";"), ...rows.map(e => e.join(";"))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fornecedores_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exportado com sucesso!");
  };

  // 2. Exportar Excel (HTML Table Trick)
  const handleExportExcel = () => {
    if (fornecedores.length === 0) return;

    const headers = ["Nome", "CNPJ", "Contato", "Telefone", "WhatsApp", "Email", "Status", "Qtd Compras", "Total Comprado", "Ultima Compra"];
    const rows = fornecedores.map(f => [
      f.nome,
      f.cnpj || "",
      f.contato || "",
      f.telefone || "",
      f.whatsapp || "",
      f.email || "",
      f.status === "ativo" ? "Ativo" : "Inativo",
      f.qtd_compras,
      f.valor_comprado.toFixed(2),
      f.ultima_compra || "Sem Compras",
    ]);

    let tsvContent = "\uFEFF" + headers.join("\t") + "\n";
    rows.forEach(r => {
      tsvContent += r.join("\t") + "\n";
    });

    const blob = new Blob([tsvContent], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `fornecedores_${new Date().toISOString().split("T")[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Arquivo XLS para Excel exportado com sucesso!");
  };

  // 3. Exportar PDF (Estilo de Impressão)
  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden">
      
      {/* Header & Search Bar */}
      <div className="p-4 border-b border-border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 bg-slate-50/20">
        
        {/* Search */}
        <div className="flex-1 max-w-md relative flex items-center">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome, CNPJ, contato ou email..."
            value={filters.search || ""}
            onChange={e => setFilters((prev: any) => ({ ...prev, search: e.target.value, page: 1 }))}
            className="w-full text-xs bg-slate-100/80 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 font-semibold text-foreground border border-transparent focus:border-primary/20"
          />
        </div>

        {/* Action Buttons & Filters Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Export options */}
          <div className="flex items-center gap-1.5 border-r border-border pr-2.5 mr-1 bg-slate-100 rounded-lg p-1">
            <button onClick={handleExportCSV} title="Exportar CSV" className="p-2 text-slate-600 hover:text-primary hover:bg-white rounded-md transition-all cursor-pointer">
              <Download className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleExportExcel} title="Exportar Excel (XLS)" className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-white rounded-md transition-all cursor-pointer">
              <FileText className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleExportPDF} title="Imprimir / PDF" className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-md transition-all cursor-pointer">
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Toggle Filter Drawer */}
          <button
            onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
            className={cn("px-4 py-2.5 text-xs font-bold rounded-xl border flex items-center gap-2 cursor-pointer transition-all", {
              "bg-primary text-white border-primary shadow-sm": showFiltersDrawer,
              "bg-white border-border text-slate-600 hover:bg-slate-50": !showFiltersDrawer,
            })}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros Avançados
          </button>
        </div>

      </div>

      {/* Expandable Filter Drawer */}
      {showFiltersDrawer && (
        <div className="p-4 border-b border-border bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top duration-200">
          
          {/* Status */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground block mb-1.5 uppercase tracking-wider">Status</label>
            <select
              value={filters.status || "todos"}
              onChange={e => setFilters((prev: any) => ({ ...prev, status: e.target.value, page: 1 }))}
              className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/30 text-foreground cursor-pointer"
            >
              <option value="todos">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>

          {/* Presença de Compras */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground block mb-1.5 uppercase tracking-wider">Histórico de Compras</label>
            <select
              value={filters.comprasFilter || "todos"}
              onChange={e => setFilters((prev: any) => ({ ...prev, comprasFilter: e.target.value, page: 1 }))}
              className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/30 text-foreground cursor-pointer"
            >
              <option value="todos">Todos</option>
              <option value="com_compras">Com Compras Registradas</option>
              <option value="sem_compras">Sem Compras Registradas</option>
            </select>
          </div>

          {/* Inatividade */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground block mb-1.5 uppercase tracking-wider">Inatividade de Pedidos</label>
            <select
              value={filters.inativosDias || "todos"}
              onChange={e => setFilters((prev: any) => ({ ...prev, inativosDias: e.target.value, page: 1 }))}
              className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/30 text-foreground cursor-pointer"
            >
              <option value="todos">Qualquer período</option>
              <option value="30">Sem compras há 30+ dias</option>
              <option value="60">Sem compras há 60+ dias</option>
              <option value="90">Sem compras há 90+ dias</option>
              <option value="120">Sem compras há 120+ dias</option>
            </select>
          </div>

          {/* Ordenação */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground block mb-1.5 uppercase tracking-wider">Ordenar Por</label>
            <div className="flex gap-1">
              <select
                value={filters.sortBy || "nome"}
                onChange={e => setFilters((prev: any) => ({ ...prev, sortBy: e.target.value, page: 1 }))}
                className="flex-1 bg-white border border-border rounded-xl px-3 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/30 text-foreground cursor-pointer"
              >
                <option value="nome">Nome</option>
                <option value="valor_comprado">Valor Comprado</option>
                <option value="qtd_compras">Qtd de Compras</option>
                <option value="ultima_compra">Última Compra</option>
              </select>
              <button
                onClick={() => setFilters((prev: any) => ({ ...prev, sortDir: prev.sortDir === "asc" ? "desc" : "asc", page: 1 }))}
                className="bg-white border border-border rounded-xl px-3 hover:bg-slate-50 text-slate-600 cursor-pointer"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-slate-50/50 text-muted-foreground">
              <th className="text-left px-4 py-3 font-bold">Fornecedor</th>
              <th className="text-left px-4 py-3 font-bold">Contato</th>
              <th className="text-left px-4 py-3 font-bold">WhatsApp / Tel</th>
              <th className="text-left px-4 py-3 font-bold">Email</th>
              <th className="text-center px-4 py-3 font-bold">Status</th>
              <th className="text-right px-4 py-3 font-bold w-20">Compras</th>
              <th className="text-right px-4 py-3 font-bold w-28">Total Comprado</th>
              <th className="text-left px-4 py-3 font-bold w-24">Última Compra</th>
              <th className="text-center px-4 py-3 font-bold w-28">Ações</th>
            </tr>
          </thead>
          <tbody>
            {fornecedores.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-16 text-muted-foreground">
                  <XCircle className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
                  <p className="font-bold">Nenhum fornecedor encontrado</p>
                  <p className="text-[10px] text-muted-foreground/80 mt-0.5">Revise os termos de busca ou filtros avançados aplicados.</p>
                </td>
              </tr>
            ) : (
              fornecedores.map(f => (
                <tr key={f.id} className="border-b border-border/50 hover:bg-slate-50/30 transition-colors">
                  
                  {/* Fornecedor (Nome + CNPJ) */}
                  <td className="px-4 py-3.5">
                    <p className="font-black text-foreground text-xs leading-normal">{f.nome}</p>
                    {f.cnpj && <p className="text-[9px] text-muted-foreground/80 mt-0.5 font-mono">{f.cnpj}</p>}
                  </td>

                  {/* Contato */}
                  <td className="px-4 py-3.5 font-medium text-slate-700">
                    {f.contato || "-"}
                  </td>

                  {/* WhatsApp / Tel */}
                  <td className="px-4 py-3.5 text-muted-foreground">
                    {f.whatsapp ? (
                      <a href={`https://wa.me/55${f.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold">
                        {f.whatsapp}
                      </a>
                    ) : f.telefone ? (
                      <span>{f.telefone}</span>
                    ) : "-"}
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3.5 text-muted-foreground truncate max-w-[150px]" title={f.email || ""}>
                    {f.email || "-"}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5 text-center">
                    <span className={cn("text-[9px] uppercase font-black px-2 py-0.5 rounded-full border", {
                      "bg-emerald-50 text-emerald-600 border-emerald-200": f.status === "ativo",
                      "bg-slate-50 text-slate-400 border-slate-200": f.status === "inativo",
                    })}>
                      {getStatusLabel(f.status as any)}
                    </span>
                  </td>

                  {/* Compras Qtd */}
                  <td className="px-4 py-3.5 text-right font-bold text-slate-700">
                    {f.qtd_compras}
                  </td>

                  {/* Total Comprado */}
                  <td className="px-4 py-3.5 text-right font-black text-foreground">
                    {formatBRL(f.valor_comprado)}
                  </td>

                  {/* Última Compra */}
                  <td className="px-4 py-3.5 text-muted-foreground font-medium">
                    {f.ultima_compra ? new Date(f.ultima_compra).toLocaleDateString("pt-BR") : "-"}
                  </td>

                  {/* Ações */}
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      
                      {/* Ver Perfil */}
                      <Link
                        href={`/dashboard/fornecedores/${f.id}`}
                        className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Ver Perfil Completo"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>

                      {/* Editar (Qualquer um com acesso à escrita) */}
                      <button
                        onClick={() => onEditClick(f)}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Editar Informações"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Desativar / Reativar Toggle (Bloqueado p/ estoquista) */}
                      {isManager ? (
                        <button
                          onClick={() => handleToggleStatus(f.id, f.status)}
                          disabled={togglingId === f.id}
                          className={cn("p-1.5 rounded-lg transition-colors cursor-pointer", {
                            "text-red-500 hover:bg-red-50": f.status === "ativo",
                            "text-emerald-500 hover:bg-emerald-50": f.status === "inativo",
                          })}
                          title={f.status === "ativo" ? "Desativar Fornecedor" : "Reativar Fornecedor"}
                        >
                          {f.status === "ativo" ? (
                            <XCircle className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                        </button>
                      ) : (
                        <span className="p-1.5 text-slate-300 cursor-not-allowed" title="Apenas donos ou gerentes podem alterar status">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      )}

                    </div>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-border flex items-center justify-between bg-slate-50/10">
          <p className="text-[10px] text-muted-foreground font-bold">{total} fornecedor(es) no total</p>
          <div className="flex items-center gap-1.5">
            <button
              disabled={filters.page === 1}
              onClick={() => setFilters((f: any) => ({ ...f, page: f.page - 1 }))}
              className="p-1.5 border border-border rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-black px-3 py-1.5 bg-slate-100 rounded-lg text-slate-700">
              {filters.page} / {totalPages}
            </span>
            <button
              disabled={filters.page === totalPages}
              onClick={() => setFilters((f: any) => ({ ...f, page: f.page + 1 }))}
              className="p-1.5 border border-border rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
