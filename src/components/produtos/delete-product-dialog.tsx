"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import type { Product } from "@/lib/types/produtos";
import { deleteProduct, updateProduct } from "@/lib/actions/products";
import { toast } from "@/components/ui/toast";

interface DeleteProductDialogProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteProductDialog({
  product,
  isOpen,
  onClose,
  onSuccess,
}: DeleteProductDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isInactivating, setIsInactivating] = React.useState(false);

  if (!product) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await deleteProduct(product.id);
      if (error) {
        toast.error(`Erro ao excluir: ${error}`);
      } else {
        toast.success(`Produto "${product.nome}" excluído com sucesso.`);
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error(`Erro: ${err.message || err}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInactivate = async () => {
    setIsInactivating(true);
    try {
      const { error } = await updateProduct(product.id, { status: "inativo" });
      if (error) {
        toast.error(`Erro ao inativar: ${error}`);
      } else {
        toast.success(`Produto "${product.nome}" inativado com sucesso.`);
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error(`Erro: ${err.message || err}`);
    } finally {
      setIsInactivating(false);
    }
  };

  const footer = (
    <div className="flex items-center justify-between w-full">
      <Button
        variant="secondary"
        onClick={onClose}
        disabled={isDeleting || isInactivating}
      >
        Cancelar
      </Button>
      <div className="flex gap-2">
        {product.status === "ativo" && (
          <Button
            variant="secondary"
            onClick={handleInactivate}
            isLoading={isInactivating}
            disabled={isDeleting}
            className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
          >
            Apenas Inativar
          </Button>
        )}
        <Button
          variant="destructive"
          onClick={handleDelete}
          isLoading={isDeleting}
          disabled={isInactivating}
        >
          Confirmar Exclusão
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirmar Exclusão"
      description="Esta ação removerá o produto das vendas e do catálogo ativo."
      footer={footer}
      size="md"
    >
      <div className="flex gap-3 items-start">
        <div className="p-2 rounded-lg bg-red-500/10 text-red-500 shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-2">
          <p className="text-sm text-foreground">
            Você está prestes a excluir o produto{" "}
            <span className="font-semibold text-foreground">
              {product.nome}
            </span>
            .
          </p>
          <p className="text-xs text-muted-foreground">
            A exclusão é lógica (soft delete). As vendas passadas e o histórico
            desse produto permanecerão salvos no sistema para fins fiscais e
            relatórios, mas ele não estará mais visível no PDV ou no catálogo
            geral.
          </p>
        </div>
      </div>
    </Modal>
  );
}
