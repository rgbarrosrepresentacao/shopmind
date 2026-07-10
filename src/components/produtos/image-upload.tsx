"use client";

import * as React from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/components/ui/toast";

interface ImageUploadProps {
  value?: string | null;
  onChange: (file: File | null) => void;
  onRemoveExisting?: () => Promise<void>;
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  onRemoveExisting,
  className,
}: ImageUploadProps) {
  const [preview, setPreview] = React.useState<string | null>(value || null);
  const [isDragActive, setIsDragActive] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setPreview(value || null);
  }, [value]);

  const handleFile = (file: File) => {
    // Validate size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB.");
      return;
    }

    // Validate type
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Formato inválido. Selecione uma imagem JPEG, PNG ou WebP.");
      return;
    }

    onChange(file);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value && e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    onChange(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // If it's an existing image, call the delete action
    if (value && onRemoveExisting) {
      setIsRemoving(true);
      try {
        await onRemoveExisting();
      } catch (err: any) {
        toast.error(`Erro ao remover imagem: ${err.message || err}`);
      } finally {
        setIsRemoving(false);
      }
    }
  };

  return (
    <div className={cn("flex flex-col gap-1.5 w-full", className)}>
      <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground select-none">
        Foto do Produto
      </span>

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative h-44 rounded-xl border border-dashed border-border bg-input hover:bg-muted/40 cursor-pointer flex flex-col items-center justify-center transition-all duration-300 group overflow-hidden",
          isDragActive && "border-primary bg-primary/5",
          preview && "border-solid"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg, image/png, image/webp"
          className="hidden"
          onChange={handleSelect}
        />

        {isRemoving ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Removendo...</span>
          </div>
        ) : preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 duration-300">
              <span className="text-xs text-white font-medium bg-slate-950/60 px-2.5 py-1 rounded-md">
                Alterar Imagem
              </span>
            </div>
            {/* Remove button */}
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 bg-slate-950/70 hover:bg-red-500 text-white rounded-full p-1.5 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:scale-110 transition-transform duration-300 mb-2 border border-border/50">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-foreground/90">
              Arraste a foto ou clique para escolher
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Formatos recomendados: JPEG, PNG ou WebP (Máx. 2MB)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
