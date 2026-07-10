'use client';

import * as React from 'react';
import type {
  ClienteClassificado,
  ClienteKPIs,
  ClienteFilter,
  ClassificacaoCliente,
} from '@/lib/types/clientes';
import { listClientes, getClienteKPIs } from '@/lib/actions/clientes';
import { ClientesKPIs } from './clientes-kpis';
import { ClientesTable } from './clientes-table';
import { ClienteFormDialog } from './cliente-form-dialog';
import { ClientePerfil } from './cliente-perfil';
import { ClientesAniversariantes } from './clientes-aniversariantes';
import { ClientesRisco } from './clientes-risco';
import { ClientesInsights } from './clientes-insights';
import { ClientesCRM } from './clientes-crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { toast } from '@/components/ui/toast';
import {
  Plus,
  Search,
  Filter,
  Users,
  Grid,
  Cake,
  TrendingDown,
  Sparkles,
  RefreshCw,
  X,
} from 'lucide-react';

export default function ClientesPageClient() {
  const [activeTab, setActiveTab] = React.useState<'lista' | 'crm' | 'churn' | 'niver' | 'insights'>('lista');
  const [loading, setLoading] = React.useState(true);
  const [clientes, setClientes] = React.useState<ClienteClassificado[]>([]);
  const [count, setCount] = React.useState(0);
  const [kpis, setKpis] = React.useState<ClienteKPIs | null>(null);

  // Filters State
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<'ativo' | 'inativo' | 'todos'>('todos');
  const [classificacao, setClassificacao] = React.useState<ClassificacaoCliente | 'todos'>('todos');
  const [page, setPage] = React.useState(1);
  const [sortBy, setSortBy] = React.useState<any>('created_at');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');

  // Dialog / Modal states
  const [selectedCliente, setSelectedCliente] = React.useState<ClienteClassificado | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isPerfilOpen, setIsPerfilOpen] = React.useState(false);

  // Debounced search trigger or refresh on changes
  React.useEffect(() => {
    loadData();
  }, [page, status, classificacao, sortBy, sortDir]);

  const loadData = async () => {
    setLoading(true);
    try {
      const filters: ClienteFilter = {
        search: search.trim() || undefined,
        status: status === 'todos' ? 'todos' : status,
        classificacao: classificacao === 'todos' ? 'todos' : classificacao,
        sortBy,
        sortDir,
        page,
        perPage: 12,
      };

      const [resClientes, resKpis] = await Promise.all([
        listClientes(filters),
        getClienteKPIs(),
      ]);

      if (resClientes.error) {
        toast.error(`Erro ao carregar clientes: ${resClientes.error}`);
      } else {
        setClientes(resClientes.data);
        setCount(resClientes.count);
      }

      setKpis(resKpis);
    } catch (err) {
      toast.error('Erro na requisição. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus('todos');
    setClassificacao('todos');
    setPage(1);
    // Directly invoke loading since state update is async
    setTimeout(() => {
      loadData();
    }, 0);
  };

  const handleOpenNewForm = () => {
    setSelectedCliente(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (cliente: ClienteClassificado) => {
    setSelectedCliente(cliente);
    setIsFormOpen(true);
  };

  const handleOpenPerfil = (cliente: ClienteClassificado) => {
    setSelectedCliente(cliente);
    setIsPerfilOpen(true);
  };

  const handleViewClienteById = async (id: string) => {
    // Helper to view profile when given ID (used in insights/CRM list)
    try {
      const found = clientes.find((c) => c.id === id);
      if (found) {
        handleOpenPerfil(found);
      } else {
        // If not loaded on current page, show loading state
        toast.info('Carregando informações do cliente...');
        // We can fetch from actions but the simplest is searching/loading that client
        const filters: ClienteFilter = { search: id, status: 'todos', classificacao: 'todos' };
        const res = await listClientes(filters);
        if (res.data && res.data.length > 0) {
          handleOpenPerfil(res.data[0]);
        } else {
          toast.error('Cliente não localizado.');
        }
      }
    } catch (e) {
      toast.error('Erro ao buscar cliente.');
    }
  };

  const totalPages = Math.ceil(count / 12);

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            👥 Clientes Inteligentes
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cadastre clientes, monitore comportamento de compra, segmente por RFM e evite perda de clientes.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={loadData} title="Atualizar dados">
            <RefreshCw size={16} />
          </Button>
          <Button onClick={handleOpenNewForm} className="shadow-lg shadow-primary/20">
            <Plus size={16} className="mr-1.5" /> Novo Cliente
          </Button>
        </div>
      </div>

      {/* KPI Section */}
      {kpis ? (
        <ClientesKPIs kpis={kpis} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-6">
          {[
            { id: 'lista', label: 'Lista de Clientes', icon: Users },
            { id: 'crm', label: 'Painel CRM RFM', icon: Grid },
            { id: 'churn', label: 'Prevenção de Churn', icon: TrendingDown },
            { id: 'niver', label: 'Aniversariantes', icon: Cake },
            { id: 'insights', label: 'Insights Inteligentes', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="space-y-4">
        {activeTab === 'lista' && (
          <div className="space-y-4">
            {/* Filters panel */}
            <form
              onSubmit={handleSearchSubmit}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-card p-4 rounded-xl border border-border/80"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar nome, CPF, WhatsApp..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Select
                  value={classificacao}
                  onChange={(e: any) => setClassificacao(e.target.value)}
                >
                  <option value="todos">Todos os Segmentos</option>
                  <option value="novo">Novos</option>
                  <option value="ativo">Ativos</option>
                  <option value="frequente">Frequentes</option>
                  <option value="vip">VIPs</option>
                  <option value="inativo">Inativos</option>
                  <option value="em_risco">Em Risco</option>
                  <option value="perdido">Perdidos</option>
                </Select>
              </div>

              <div className="flex gap-2">
                <Select value={status} onChange={(e: any) => setStatus(e.target.value)}>
                  <option value="todos">Status: Todos</option>
                  <option value="ativo">Ativos</option>
                  <option value="inativo">Inativos</option>
                </Select>
              </div>

              <div className="flex gap-2 justify-end items-center">
                <Button type="submit" size="sm" className="w-full sm:w-auto">
                  Filtrar
                </Button>
                {(search || status !== 'todos' || classificacao !== 'todos') && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={14} className="mr-1" /> Limpar
                  </Button>
                )}
              </div>
            </form>

            {/* Table */}
            {loading ? (
              <div className="space-y-3 py-6">
                <div className="h-10 bg-muted animate-pulse rounded" />
                <div className="h-10 bg-muted animate-pulse rounded" />
                <div className="h-10 bg-muted animate-pulse rounded" />
              </div>
            ) : (
              <>
                <ClientesTable
                  clientes={clientes}
                  onView={handleOpenPerfil}
                  onEdit={handleOpenEditForm}
                  onRefresh={loadData}
                />

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center pt-2">
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'crm' && (
          <ClientesCRM
            onViewCliente={handleOpenPerfil}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'churn' && <ClientesRisco />}

        {activeTab === 'niver' && <ClientesAniversariantes />}

        {activeTab === 'insights' && (
          <ClientesInsights onViewCliente={handleViewClienteById} />
        )}
      </div>

      {/* Forms & Profiles Modals */}
      <ClienteFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        cliente={selectedCliente}
        onSuccess={loadData}
      />

      <ClientePerfil
        isOpen={isPerfilOpen}
        onClose={() => setIsPerfilOpen(false)}
        cliente={selectedCliente}
        onEdit={(c) => {
          setIsPerfilOpen(false);
          handleOpenEditForm(c);
        }}
      />
    </div>
  );
}
