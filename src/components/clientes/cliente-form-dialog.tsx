'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { createCliente, updateCliente } from '@/lib/actions/clientes';
import type { Cliente, ClienteInsert } from '@/lib/types/clientes';
import { X, Plus, Trash2 } from 'lucide-react';

interface ClienteFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: Cliente | null;
  onSuccess: () => void;
}

export const ClienteFormDialog: React.FC<ClienteFormDialogProps> = ({
  isOpen,
  onClose,
  cliente,
  onSuccess,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [nome, setNome] = React.useState('');
  const [telefone, setTelefone] = React.useState('');
  const [whatsapp, setWhatsapp] = React.useState('');
  const [cpf, setCpf] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [aniversario, setAniversario] = React.useState('');
  const [endereco, setEndereco] = React.useState('');
  const [cidade, setCidade] = React.useState('');
  const [estado, setEstado] = React.useState('');
  const [cep, setCep] = React.useState('');
  const [observacoes, setObservacoes] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);
  const [newTag, setNewTag] = React.useState('');

  React.useEffect(() => {
    if (cliente) {
      setNome(cliente.nome || '');
      setTelefone(cliente.telefone || '');
      setWhatsapp(cliente.whatsapp || '');
      setCpf(cliente.cpf || '');
      setEmail(cliente.email || '');
      setAniversario(cliente.aniversario || '');
      setEndereco(cliente.endereco || '');
      setCidade(cliente.cidade || '');
      setEstado(cliente.estado || '');
      setCep(cliente.cep || '');
      setObservacoes(cliente.observacoes || '');
      setTags(cliente.tags || []);
    } else {
      setNome('');
      setTelefone('');
      setWhatsapp('');
      setCpf('');
      setEmail('');
      setAniversario('');
      setEndereco('');
      setCidade('');
      setEstado('');
      setCep('');
      setObservacoes('');
      setTags([]);
    }
  }, [cliente, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error('O nome do cliente é obrigatório.');
      return;
    }

    setLoading(true);
    const payload: ClienteInsert = {
      nome: nome.trim(),
      telefone: telefone.trim() || null,
      whatsapp: whatsapp.trim() || null,
      cpf: cpf.trim() || null,
      email: email.trim() || null,
      aniversario: aniversario || null,
      endereco: endereco.trim() || null,
      cidade: cidade.trim() || null,
      estado: estado.trim() || null,
      cep: cep.trim() || null,
      observacoes: observacoes.trim() || null,
      tags: tags,
    };

    try {
      if (cliente) {
        const { error } = await updateCliente(cliente.id, payload);
        if (error) {
          toast.error(`Erro ao atualizar cliente: ${error}`);
        } else {
          toast.success('Cliente atualizado com sucesso!');
          onSuccess();
          onClose();
        }
      } else {
        const { error } = await createCliente(payload);
        if (error) {
          toast.error(`Erro ao cadastrar cliente: ${error}`);
        } else {
          toast.success('Cliente cadastrado com sucesso!');
          onSuccess();
          onClose();
        }
      }
    } catch (err) {
      toast.error('Erro na requisição. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
    if (e.type === 'keydown') e.preventDefault();

    const tag = newTag.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setTags(tags.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={cliente ? 'Editar Cliente' : 'Novo Cliente'}
      description={
        cliente
          ? 'Atualize as informações do cadastro deste cliente'
          : 'Cadastre um novo cliente com informações de contato, endereço e tags.'
      }
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Dados Pessoais */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
              Dados Pessoais
            </h4>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Nome Completo *</label>
              <Input
                placeholder="Ex: João Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">CPF</label>
                <Input
                  placeholder="Ex: 000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Data de Aniversário</label>
                <Input
                  type="date"
                  value={aniversario}
                  onChange={(e) => setAniversario(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">E-mail</label>
              <Input
                type="email"
                placeholder="Ex: cliente@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Telefone</label>
                <Input
                  placeholder="Ex: (11) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">WhatsApp</label>
                <Input
                  placeholder="Ex: (11) 99999-9999"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Endereço e Observações */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
              Endereço & Notas
            </h4>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Endereço</label>
              <Input
                placeholder="Rua, número, bairro..."
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-foreground">Cidade</label>
                <Input
                  placeholder="Cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Estado</label>
                <Input
                  placeholder="UF"
                  maxLength={2}
                  value={estado}
                  onChange={(e) => setEstado(e.target.value.toUpperCase())}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">CEP</label>
              <Input
                placeholder="Ex: 00000-000"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Tags de Segmentação</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Adicionar tag (pressione Enter)"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleAddTag}
                />
                <Button type="button" variant="secondary" size="sm" onClick={handleAddTag}>
                  <Plus size={16} />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(idx)}
                      className="text-muted-foreground hover:text-foreground focus:outline-none"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Observações */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Observações / Preferências</label>
          <textarea
            placeholder="Gosta de novidades sobre produtos X, prefere contato por WhatsApp, restrições, etc..."
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </div>

        {/* Botoes de acao */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : cliente ? 'Salvar Alterações' : 'Cadastrar Cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
