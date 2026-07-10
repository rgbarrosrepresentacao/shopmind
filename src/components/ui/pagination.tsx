import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "./button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className,
}) => {
  return (
    <div className={cn("flex items-center justify-between gap-4 px-2 py-4", className)}>
      <div className="text-xs text-muted-foreground select-none">
        Página <span className="font-semibold text-foreground">{currentPage}</span> de{" "}
        <span className="font-semibold text-foreground">{totalPages || 1}</span>
      </div>
      
      <div className="flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 rounded-md"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          title="Primeira Página"
        >
          <ChevronsLeft size={16} />
        </Button>
        
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 rounded-md"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          title="Página Anterior"
        >
          <ChevronLeft size={16} />
        </Button>
        
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 rounded-md"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          title="Próxima Página"
        >
          <ChevronRight size={16} />
        </Button>
        
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 rounded-md"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          title="Última Página"
        >
          <ChevronsRight size={16} />
        </Button>
      </div>
    </div>
  );
};
