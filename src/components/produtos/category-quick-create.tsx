"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCategory } from "@/lib/actions/categories";
import { toast } from "@/components/ui/toast";
import type { Category } from "@/lib/types/produtos";
import { Tag } from "lucide-react";

interface CategoryQuickCreateProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCategory: Category) => void;
}

export function CategoryQuickCreate({
  isOpen,
  onClose,
  onSuccess,
}: CategoryQuickCreateProps) {
  const [nome, setNome] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setError("O nome da categoria é obrigatório.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { data, error: apiError } = await createCategory({
        nome: nome.trim(),
      });

      if (apiError) {
        setError(apiError);
      } else if (data) {
        toast.success(`Categoria "${data.nome}" criada com sucesso.`);
        onSuccess(data);
        setNome("");
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Erro desconhecido ao criar categoria.");
    } finally {
      setIsLoading(false);
    }
  };

  const footer = (
    <div className="flex justify-end gap-2 w-full">
      <Button
        variant="secondary"
        onClick={onClose}
        disabled={isLoading}
        type="button"
      >
        Cancelar
      </Button>
      <Button variant="primary" type="submit" isLoading={isLoading}>
        Salvar Categoria
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nova Categoria"
      description="Crie uma nova categoria para organizar seus produtos."
      footer={
        <form onSubmit={handleSubmit} className="w-full flex justify-end">
          {footer}
        </form>
      }
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome da Categoria"
          placeholder="Ex: Bebidas, Calçados, Eletrônicos"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value);
            if (error) setError("");
          }}
          error={error}
          leftIcon={<Tag className="w-4 h-4 text-muted-foreground" />}
          autoFocus
        />
      </form>
    </Modal>
  );
}
