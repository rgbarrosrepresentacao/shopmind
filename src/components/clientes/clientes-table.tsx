'use client';

import * as React from 'react';
import type { ClienteClassificado } from '@/lib/types/clientes';
import {
  formatTelefone,
  formatBRL,
  getBgClassificacao,
  getLabelClassificacao,
} from '@/lib/types/clientes';
import {
  Eye,
  Edit2,
  Trash2,
  Phone,
  Calendar,
  MessageCircle,
  MoreVertical,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { deleteCliente } from '@/lib/actions/clientes';

interface ClientesTableProps {
  clientes: ClienteClassificado[];
  onView: (cliente: ClienteClassificado) => void;
  onEdit: (cliente: ClienteClassificado) => void;
  onRefresh: () => void;
}

export const ClientesTable: React.FC<ClientesTableProps> = ({
  clientes,
  onView,
  onEdit,
  onRefresh,
}) => {
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);

  // Fechar menu ao clicar fora
  React.useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleToggleMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(`Tem certeza que deseja excluir o cliente ${name}?`)) {
      try {
        const { error } = await deleteCliente(id);
        if (error) {
          toast.error(`Erro ao excluir cliente: ${error}`);
        } else {
          toast.success('Cliente excluído com sucesso!');
          onRefresh();
        }
      } catch (err) {
        toast.error('Erro na requisição. Tente novamente.');
        console.error(err);
      }
    }
    setActiveMenuId(null);
  };

  const handleWhatsApp = (e: React.MouseEvent, tel: string | null) => {
    e.stopPropagation();
    if (!tel) return;
    const clean = tel.replace(/\D/g, '');
    window.open(`https://wa.me/55${clean}`, '_blank');
  };

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left align-middle">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="p-4 select-none">Cliente</th>
              <th className="p-4 select-none">Segmento</th>
              <th className="p-4 select-none">Compras</th>
              <th className="p-4 select-none">Total Gasto</th>
              <th className="p-4 select-none">Última Compra</th>
              <th className="p-4 select-none text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {clientes.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="text-3xl">👥</span>
                    <p className="font-semibold text-foreground">Nenhum cliente encontrado</p>
                    <p className="text-xs">Experimente limpar os filtros ou cadastrar um novo cliente.</p>
                  </div>
                </td>
              </tr>
            ) : (
              clientes.map((c) => {
                const formattedTel = formatTelefone(c.whatsapp || c.telefone);
                return (
                  <tr
                    key={c.id}
                    onClick={() => onView(c)}
                    className="group cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    {/* Name & Contact */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary group-hover:scale-105 transition-transform">
                          {c.nome.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                            {c.nome}
                            {c.isAniversariante && (
                              <span
                                title="Aniversariante de Hoje!"
                                className="text-xs inline-flex animate-bounce"
                              >
                                🎂
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            {formattedTel !== '—' && (
                              <>
                                <Phone size={10} className="text-muted-foreground/60" />
                                {formattedTel}
                              </>
                            )}
                            {c.email && (
                              <span className="hidden md:inline">
                                {' • '}
                                {c.email}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Classification */}
                    <td className="p-4">
                      <Badge className={getBgClassificacao(c.classificacao)}>
                        {getLabelClassificacao(c.classificacao)}
                      </Badge>
                    </td>

                    {/* Compras Count */}
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{c.total_compras}</span>
                        <span className="text-xs text-muted-foreground">
                          Média: {formatBRL(c.ticketMedio)}/compra
                        </span>
                      </div>
                    </td>

                    {/* Total Gasto */}
                    <td className="p-4">
                      <span className="font-bold text-emerald-500">{formatBRL(c.total_gasto)}</span>
                    </td>

                    {/* Last Purchase */}
                    <td className="p-4">
                      {c.ultima_compra ? (
                        <div className="flex flex-col">
                          <span className="text-foreground">
                            {new Date(c.ultima_compra).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {c.diasDesdeUltimaCompra === 0
                              ? 'Hoje'
                              : c.diasDesdeUltimaCompra === 1
                              ? 'Ontem'
                              : `Há ${c.diasDesdeUltimaCompra} dias`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">— Sem compras</span>
                      )}
                    </td>

                    {/* Actions Menu */}
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block text-left">
                        <div className="flex justify-end gap-1">
                          {(c.whatsapp || c.telefone) && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-8 w-8 p-0 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20"
                              onClick={(e) => handleWhatsApp(e, c.whatsapp || c.telefone)}
                              title="Enviar WhatsApp"
                            >
                              <MessageCircle size={14} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => handleToggleMenu(e, c.id)}
                          >
                            <MoreVertical size={14} />
                          </Button>
                        </div>

                        {activeMenuId === c.id && (
                          <div className="absolute right-0 mt-1 w-36 origin-top-right rounded-lg border border-border bg-popover shadow-xl z-20 overflow-hidden animate-fade-in text-left">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  onView(c);
                                  setActiveMenuId(null);
                                }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                              >
                                <Eye size={12} /> Ver Perfil
                              </button>
                              <button
                                onClick={() => {
                                  onEdit(c);
                                  setActiveMenuId(null);
                                }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                              >
                                <Edit2 size={12} /> Editar
                              </button>
                              <div className="border-t border-border my-1" />
                              <button
                                onClick={(e) => handleDelete(e, c.id, c.nome)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors font-medium"
                              >
                                <Trash2 size={12} /> Excluir
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
