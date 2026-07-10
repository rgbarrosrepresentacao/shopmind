"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { 
  Upload, 
  FileText, 
  Map, 
  Eye, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Download, 
  Copy,
  Info,
  Layers
} from "lucide-react";
import { 
  analyzeProductsImport, 
  validateProductsImport, 
  commitProductsImport, 
  getImportSessionRowsReport 
} from "@/lib/actions/products";

interface ImportProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportProductsModal({
  isOpen,
  onClose,
  onSuccess
}: ImportProductsModalProps) {
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);
  const [sourceMode, setSourceMode] = React.useState<"rapid" | "migration" | "paste">("rapid");
  const [sourceSystem, setSourceSystem] = React.useState<string>("manual");
  const [dragActive, setDragActive] = React.useState(false);
  const [pastedText, setPastedText] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);

  // States from backend processing
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [columnsDetected, setColumnsDetected] = React.useState<string[]>([]);
  const [columnMapping, setColumnMapping] = React.useState<Record<string, string>>({});
  const [duplicateStrategy, setDuplicateStrategy] = React.useState<string>("set_stock");
  
  // Validation feedback states
  const [isLoading, setIsLoading] = React.useState(false);
  const [previewRows, setPreviewRows] = React.useState<any[]>([]);
  const [stats, setStats] = React.useState<{ total: number; valid: number; error: number; duplicate: number } | null>(null);
  const [commitResult, setCommitResult] = React.useState<{ created: number; updated: number; ignored: number } | null>(null);

  // Reset wizard on open/close
  React.useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFile(null);
      setPastedText("");
      setSessionId(null);
      setPreviewRows([]);
      setStats(null);
      setCommitResult(null);
    }
  }, [isOpen]);

  // Helper helper: Parse CSV on client-side
  const parseCSVText = (text: string): any[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return [];

    // Detect delimiter: semicolon, comma or tab
    const firstLine = lines[0];
    let delimiter = ";";
    if (firstLine.includes("\t")) {
      delimiter = "\t";
    } else if (firstLine.includes(",") && !firstLine.includes(";")) {
      delimiter = ",";
    }

    const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ""));
    const dataRows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const currentLine = lines[i];
      if (!currentLine.trim()) continue;
      
      const values = currentLine.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ""));
      const rowObject: Record<string, any> = {};
      
      headers.forEach((header, index) => {
        rowObject[header] = values[index] !== undefined ? values[index] : "";
      });
      dataRows.push(rowObject);
    }

    return dataRows;
  };

  // Step 1 Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".csv") || droppedFile.name.endsWith(".txt")) {
        setFile(droppedFile);
      } else {
        toast.error("Por favor, selecione um arquivo CSV de até 5MB.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith(".csv") || selectedFile.name.endsWith(".txt")) {
        setFile(selectedFile);
      } else {
        toast.error("Por favor, envie um arquivo CSV.");
      }
    }
  };

  const handleDownloadModel = (type: "simple" | "complete") => {
    let headers = "";
    let content = "";
    
    if (type === "simple") {
      headers = "Nome;Preco Venda;Estoque";
      content = "Camiseta Basica Preta M;59.90;10\nCalca Jeans 38;120.00;5\nMeia Sport Branca;15.50;20";
    } else {
      headers = "Nome;Preco Custo;Preco Venda;Estoque;SKU;Codigo de Barras;Categoria;Unidade;Cor;Tamanho";
      content = "Camiseta Basica Preta M;25.00;59.90;15;CAM-BAS-PRT-M;7891011121314;Vestuario;UN;Preta;M\nCalca Jeans Masculina 42;45.00;129.90;8;CALC-JNS-42;7891011121321;Vestuario;UN;Azul;42";
    }
    
    const blob = new Blob([`${headers}\n${content}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `modelo_shopmind_${type}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      let rawRows: any[] = [];
      let filename = "lista_manual.csv";

      if (sourceMode === "paste") {
        if (!pastedText.trim()) {
          toast.error("Cole os dados no campo de texto para continuar.");
          setIsLoading(false);
          return;
        }
        rawRows = parseCSVText(pastedText);
      } else {
        if (!file) {
          toast.error("Selecione um arquivo CSV para importar.");
          setIsLoading(false);
          return;
        }
        filename = file.name;
        
        // Read file contents as text
        const textContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsText(file);
        });
        
        rawRows = parseCSVText(textContent);
      }

      if (rawRows.length === 0) {
        toast.error("Nenhuma linha válida identificada. Verifique os delimitadores e tente novamente.");
        setIsLoading(false);
        return;
      }

      const res = await analyzeProductsImport(rawRows, filename, sourceMode, sourceSystem);
      if (res.error) {
        toast.error(res.error);
      } else {
        setSessionId(res.sessionId);
        setColumnsDetected(Object.keys(rawRows[0] || {}));
        setColumnMapping(res.columnMapping);
        setStep(2);
      }
    } catch (err: any) {
      toast.error(`Erro ao analisar arquivo: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 Handlers
  const handleValidateMapping = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const res = await validateProductsImport(sessionId, columnMapping, duplicateStrategy);
      if (!res.success) {
        toast.error(res.error || "Erro ao validar linhas.");
      } else {
        // Fetch preview rows to render in Step 3
        const report = await getImportSessionRowsReport(sessionId);
        if (report.error) {
          toast.error(report.error);
        } else {
          setPreviewRows(report.data.slice(0, 50)); // Preview first 50 lines
          
          // Calculate quick stats from row validation states
          const total = report.data.length;
          const valid = report.data.filter(r => r.status === "valid" || r.status === "warning").length;
          const error = report.data.filter(r => r.status === "error").length;
          const duplicate = report.data.filter(r => r.status === "duplicate").length;
          
          setStats({ total, valid, error, duplicate });
          setStep(3);
        }
      }
    } catch (err: any) {
      toast.error(`Erro ao validar colunas: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3 Handlers
  const handleCommit = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const res = await commitProductsImport(sessionId);
      if (!res.success) {
        toast.error(res.error || "Falha na gravação em massa.");
      } else {
        setCommitResult({
          created: res.stats.criados,
          updated: res.stats.atualizados,
          ignored: res.stats.ignorados
        });
        toast.success("Importação em massa finalizada!");
        onSuccess();
        setStep(4);
      }
    } catch (err: any) {
      toast.error(`Erro ao gravar dados: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 4 Download Handlers
  const handleDownloadReport = async (reportType: "errors" | "full") => {
    if (!sessionId) return;
    try {
      const report = await getImportSessionRowsReport(sessionId);
      if (report.error) {
        toast.error(report.error);
        return;
      }

      let filteredRows = report.data;
      if (reportType === "errors") {
        filteredRows = report.data.filter(r => r.status === "error");
      }

      if (filteredRows.length === 0) {
        toast.info("Nenhum registro encontrado para este relatório.");
        return;
      }

      // Construct CSV content
      const csvHeaders = "Linha;Status;Acao Tomada;Erros;Avisos;Dados Brutos\n";
      const csvContent = filteredRows.map(r => {
        const errorList = (r.errors || []).join(" | ").replace(/"/g, '""');
        const warningList = (r.warnings || []).join(" | ").replace(/"/g, '""');
        const rawJson = JSON.stringify(r.raw_data).replace(/"/g, '""');
        return `${r.row_index};${r.status};${r.action_taken || ""};"${errorList}";"${warningList}";"${rawJson}"`;
      }).join("\n");

      const blob = new Blob([csvHeaders + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `relatorio_${reportType}_importacao_${sessionId}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      toast.error("Erro ao gerar relatório.");
    }
  };

  // Mapped options list
  const destinationFields = [
    { value: "", label: "-- Ignorar Coluna --" },
    { value: "nome", label: "Nome do Produto (Obrigatório)" },
    { value: "preco_venda", label: "Preço de Venda (Obrigatório)" },
    { value: "preco_custo", label: "Preço de Custo" },
    { value: "estoque_atual", label: "Estoque Atual" },
    { value: "sku", label: "SKU / Referência" },
    { value: "codigo_barras", label: "Código de Barras (EAN)" },
    { value: "categoria_nome", label: "Categoria (Criar Automático)" },
    { value: "unidade", label: "Unidade de Medida (UN)" },
    { value: "cor", label: "Cor (Moda)" },
    { value: "tamanho", label: "Tamanho (Moda)" }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assistente de Migração de Produtos"
      description="Importe dados cadastrais, preços e estoque de planilhas de outros sistemas com segurança e inteligência."
      size="xl"
    >
      {/* Wizard Steps Indicator */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-6">
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${step >= 1 ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>1</div>
          <span className={`text-xs font-medium ${step === 1 ? "text-foreground" : "text-muted-foreground"}`}>Upload</span>
        </div>
        <div className="h-[2px] flex-1 bg-border/40 mx-4" />
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${step >= 2 ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>2</div>
          <span className={`text-xs font-medium ${step === 2 ? "text-foreground" : "text-muted-foreground"}`}>Mapeamento</span>
        </div>
        <div className="h-[2px] flex-1 bg-border/40 mx-4" />
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${step >= 3 ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>3</div>
          <span className={`text-xs font-medium ${step === 3 ? "text-foreground" : "text-muted-foreground"}`}>Preview</span>
        </div>
        <div className="h-[2px] flex-1 bg-border/40 mx-4" />
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${step >= 4 ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>4</div>
          <span className={`text-xs font-medium ${step === 4 ? "text-foreground" : "text-muted-foreground"}`}>Resultado</span>
        </div>
      </div>

      {/* STEP 1: UPLOAD */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Source Selection Modes */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => { setSourceMode("rapid"); setSourceSystem("manual"); }}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all ${sourceMode === "rapid" ? "border-primary bg-primary/5 text-primary" : "border-border/60 hover:bg-muted/40"}`}
            >
              <Upload className="w-5 h-5" />
              <div className="text-xs font-bold">Importação Rápida</div>
              <p className="text-[10px] text-muted-foreground leading-tight">Planilhas simples locais em CSV</p>
            </button>
            <button
              onClick={() => { setSourceMode("migration"); setSourceSystem("bling"); }}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all ${sourceMode === "migration" ? "border-primary bg-primary/5 text-primary" : "border-border/60 hover:bg-muted/40"}`}
            >
              <Layers className="w-5 h-5" />
              <div className="text-xs font-bold">Migração de PDV</div>
              <p className="text-[10px] text-muted-foreground leading-tight">Vindo do Bling, Tiny, Linx, etc.</p>
            </button>
            <button
              onClick={() => { setSourceMode("paste"); setSourceSystem("manual"); }}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all ${sourceMode === "paste" ? "border-primary bg-primary/5 text-primary" : "border-border/60 hover:bg-muted/40"}`}
            >
              <Copy className="w-5 h-5" />
              <div className="text-xs font-bold">Colar Lista</div>
              <p className="text-[10px] text-muted-foreground leading-tight">Copiar e colar do Bloco de Notas</p>
            </button>
          </div>

          {/* Conditional Input UI */}
          {sourceMode === "paste" ? (
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground">Copie as linhas da sua lista e cole no campo abaixo:</label>
              <textarea
                placeholder="Exemplo (use ponto-e-vírgula ou vírgula para separar as colunas):&#10;Nome;Preço Venda;Estoque&#10;Camiseta Preta M;59.90;10&#10;Calça Jeans 38;120.00;5"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="w-full h-40 bg-muted/20 border border-border/80 rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-primary/80"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {sourceMode === "migration" && (
                <div className="flex items-center gap-3 bg-muted/30 border border-border/50 p-3 rounded-lg">
                  <span className="text-xs font-bold text-muted-foreground">Sistema de Origem:</span>
                  <select
                    value={sourceSystem}
                    onChange={(e) => setSourceSystem(e.target.value)}
                    className="bg-card border border-border text-xs rounded p-1.5 focus:outline-none"
                  >
                    <option value="bling">Bling ERP</option>
                    <option value="tiny">Tiny ERP</option>
                    <option value="linx">Linx</option>
                    <option value="outro">Outro Sistema / Genérico</option>
                  </select>
                </div>
              )}

              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all ${dragActive ? "border-primary bg-primary/5" : "border-border/60 hover:border-border/90 bg-muted/10"} ${file ? "border-emerald-500 bg-emerald-500/5" : ""}`}
              >
                <input
                  type="file"
                  id="csv-file"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {file ? (
                  <div className="text-center space-y-2">
                    <FileText className="w-10 h-10 mx-auto text-emerald-500" />
                    <div className="text-xs font-bold text-foreground">{file.name}</div>
                    <div className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB — Pronto para analisar</div>
                    <button onClick={() => setFile(null)} className="text-[10px] text-rose-500 font-bold underline hover:text-rose-600 block mx-auto">Remover arquivo</button>
                  </div>
                ) : (
                  <label htmlFor="csv-file" className="cursor-pointer text-center space-y-2">
                    <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                    <div className="text-xs font-bold">Arraste e solte o seu arquivo CSV aqui</div>
                    <div className="text-[10px] text-muted-foreground">Ou clique para procurar em seu computador (Limite de 5MB)</div>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Model Templates Download */}
          <div className="flex items-center justify-between bg-muted/40 p-4 rounded-xl border border-border/40">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              <span className="text-[11px] text-muted-foreground font-medium">Recomendamos utilizar o formato CSV separado por ponto-e-vírgula (;)</span>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => handleDownloadModel("simple")} className="text-[10px] h-8 gap-1">
                <Download className="w-3 h-3" /> Modelo Simples
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleDownloadModel("complete")} className="text-[10px] h-8 gap-1">
                <Download className="w-3 h-3" /> Modelo Completo
              </Button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 border-t border-border/40 pt-4 mt-6">
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancelar</Button>
            <Button variant="primary" onClick={handleAnalyze} isLoading={isLoading}>Analisar Dados</Button>
          </div>
        </div>
      )}

      {/* STEP 2: COLUMN MAPPING */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 bg-primary/5 p-3 rounded-lg text-primary text-xs font-medium border border-primary/10">
            <Map className="w-4 h-4" />
            Mapeamos suas colunas automaticamente. Revise os campos antes de prosseguir com a validação.
          </div>

          {/* Mapping Grid */}
          <div className="border border-border/50 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted text-muted-foreground font-bold">
                <tr>
                  <th className="p-3 text-left">Coluna Encontrada na Planilha</th>
                  <th className="p-3 text-left">Campo Destino no ShopMind</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {columnsDetected.map((col) => (
                  <tr key={col} className="hover:bg-muted/10">
                    <td className="p-3 font-semibold text-foreground">{col}</td>
                    <td className="p-3">
                      <select
                        value={columnMapping[col] || ""}
                        onChange={(e) => setColumnMapping({ ...columnMapping, [col]: e.target.value })}
                        className="bg-card border border-border text-xs rounded-lg p-2 w-full max-w-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {destinationFields.map((field) => (
                          <option key={field.value} value={field.value}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Duplicate Stock Strategy Selection */}
          <div className="bg-muted/30 border border-border/50 p-4 rounded-xl space-y-3">
            <div className="text-xs font-bold text-foreground">Tratamento de Produtos Duplicados (Mesmo SKU ou Código de Barras):</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <label className="flex items-start gap-2 p-2 bg-card border rounded-lg cursor-pointer hover:bg-muted/20">
                <input
                  type="radio"
                  name="strategy"
                  value="skip"
                  checked={duplicateStrategy === "skip"}
                  onChange={(e) => setDuplicateStrategy(e.target.value)}
                  className="mt-0.5 text-primary focus:ring-primary"
                />
                <div className="text-[10px] leading-tight">
                  <div className="font-bold">Ignorar</div>
                  <span className="text-muted-foreground">Pula duplicados</span>
                </div>
              </label>
              <label className="flex items-start gap-2 p-2 bg-card border rounded-lg cursor-pointer hover:bg-muted/20">
                <input
                  type="radio"
                  name="strategy"
                  value="update_data_only"
                  checked={duplicateStrategy === "update_data_only"}
                  onChange={(e) => setDuplicateStrategy(e.target.value)}
                  className="mt-0.5 text-primary focus:ring-primary"
                />
                <div className="text-[10px] leading-tight">
                  <div className="font-bold">Apenas Dados</div>
                  <span className="text-muted-foreground">Não mexe no estoque</span>
                </div>
              </label>
              <label className="flex items-start gap-2 p-2 bg-card border rounded-lg cursor-pointer hover:bg-muted/20">
                <input
                  type="radio"
                  name="strategy"
                  value="add_stock"
                  checked={duplicateStrategy === "add_stock"}
                  onChange={(e) => setDuplicateStrategy(e.target.value)}
                  className="mt-0.5 text-primary focus:ring-primary"
                />
                <div className="text-[10px] leading-tight">
                  <div className="font-bold">Somar Estoque</div>
                  <span className="text-muted-foreground">Soma planilha + banco</span>
                </div>
              </label>
              <label className="flex items-start gap-2 p-2 bg-card border rounded-lg cursor-pointer hover:bg-muted/20">
                <input
                  type="radio"
                  name="strategy"
                  value="set_stock"
                  checked={duplicateStrategy === "set_stock"}
                  onChange={(e) => setDuplicateStrategy(e.target.value)}
                  className="mt-0.5 text-primary focus:ring-primary"
                />
                <div className="text-[10px] leading-tight">
                  <div className="font-bold">Sobrescrever Estoque</div>
                  <span className="text-muted-foreground">Usa saldo da planilha</span>
                </div>
              </label>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 border-t border-border/40 pt-4 mt-6">
            <Button variant="secondary" onClick={() => setStep(1)} disabled={isLoading}>Voltar</Button>
            <Button variant="primary" onClick={handleValidateMapping} isLoading={isLoading}>Validar Mapeamento</Button>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW & VALIDATION */}
      {step === 3 && (
        <div className="space-y-5">
          {/* Stats Bar */}
          {stats && (
            <div className="grid grid-cols-4 gap-3 bg-muted/40 p-4 rounded-xl border border-border/30 text-center">
              <div>
                <div className="text-base font-bold text-foreground">{stats.total}</div>
                <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider font-bold">Analisados</div>
              </div>
              <div>
                <div className="text-base font-bold text-emerald-500">{stats.valid}</div>
                <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider font-bold">Válidos / Alertas</div>
              </div>
              <div>
                <div className="text-base font-bold text-sky-500">{stats.duplicate}</div>
                <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider font-bold">Duplicados</div>
              </div>
              <div>
                <div className="text-base font-bold text-rose-500">{stats.error}</div>
                <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider font-bold">Com Erro (Ignorados)</div>
              </div>
            </div>
          )}

          {/* Preview Table */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-muted-foreground flex items-center justify-between">
              <span>Pré-visualização dos Produtos (Primeiras 50 linhas):</span>
              <span className="text-[10px] text-rose-500 font-medium">* Linhas em vermelho não serão importadas por erros de dados.</span>
            </div>
            
            <div className="border border-border/50 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground font-bold">
                  <tr>
                    <th className="p-3">Status</th>
                    <th className="p-3">Nome</th>
                    <th className="p-3">Preço Venda</th>
                    <th className="p-3">Preço Custo</th>
                    <th className="p-3">Estoque</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {previewRows.map((row, idx) => {
                    const data = row.normalized_data;
                    let badgeColor = "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
                    let statusLabel = "Válido";
                    
                    if (row.status === "error") {
                      badgeColor = "bg-rose-500/10 text-rose-500 border-rose-500/30";
                      statusLabel = "Erro";
                    } else if (row.status === "duplicate") {
                      badgeColor = "bg-sky-500/10 text-sky-500 border-sky-500/30";
                      statusLabel = "Duplicado";
                    } else if (row.status === "warning") {
                      badgeColor = "bg-amber-500/10 text-amber-500 border-amber-500/30";
                      statusLabel = "Alerta";
                    }

                    return (
                      <tr key={idx} className={`hover:bg-muted/10 ${row.status === "error" ? "bg-rose-500/5" : ""}`}>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 border rounded-full text-[9px] font-bold ${badgeColor}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="p-3 font-semibold">{data.nome || "-"}</td>
                        <td className="p-3">R$ {Number(data.preco_venda || 0).toFixed(2)}</td>
                        <td className="p-3">R$ {Number(data.preco_custo || 0).toFixed(2)}</td>
                        <td className="p-3 font-bold">{data.estoque_atual || 0}</td>
                        <td className="p-3 font-mono">{data.sku || "-"}</td>
                        <td className="p-3 max-w-[200px] truncate text-muted-foreground text-[10px]">
                          {(row.errors && row.errors.length > 0) ? (
                            <span className="text-rose-500 font-medium">{row.errors[0]}</span>
                          ) : (
                            <span>{(row.warnings || []).join(", ")}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 border-t border-border/40 pt-4 mt-6">
            <Button variant="secondary" onClick={() => setStep(2)} disabled={isLoading}>Voltar</Button>
            <Button variant="primary" onClick={handleCommit} isLoading={isLoading}>Confirmar Importação</Button>
          </div>
        </div>
      )}

      {/* STEP 4: COMPLETED & REPORTS */}
      {step === 4 && commitResult && (
        <div className="space-y-6 text-center py-4">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
            <CheckCircle className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h4 className="text-base font-bold text-foreground">Importação Finalizada!</h4>
            <p className="text-xs text-muted-foreground">O ShopMind processou e gravou a sua planilha de produtos no banco de dados.</p>
          </div>

          {/* Result Stats Cards */}
          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
            <div className="bg-muted/40 p-4 border border-border/30 rounded-xl">
              <div className="text-xl font-bold text-emerald-500">{commitResult.created}</div>
              <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-1 font-bold">Criados</div>
            </div>
            <div className="bg-muted/40 p-4 border border-border/30 rounded-xl">
              <div className="text-xl font-bold text-sky-500">{commitResult.updated}</div>
              <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-1 font-bold">Atualizados</div>
            </div>
            <div className="bg-muted/40 p-4 border border-border/30 rounded-xl">
              <div className="text-xl font-bold text-muted-foreground">{commitResult.ignored}</div>
              <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-1 font-bold">Ignorados</div>
            </div>
          </div>

          {/* Download Logs options */}
          <div className="bg-muted/30 border border-border/50 p-4 rounded-xl max-w-md mx-auto space-y-3">
            <div className="text-xs font-bold text-foreground">Precisa auditar ou corrigir erros?</div>
            <div className="flex gap-2 justify-center">
              <Button variant="secondary" size="sm" onClick={() => handleDownloadReport("errors")} className="text-xs gap-1.5">
                <XCircle className="w-4.5 h-4.5 text-rose-500" /> Baixar Erros
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleDownloadReport("full")} className="text-xs gap-1.5">
                <FileText className="w-4.5 h-4.5 text-primary" /> Relatório Completo
              </Button>
            </div>
          </div>

          {/* Close button */}
          <div className="border-t border-border/40 pt-4 mt-6">
            <Button variant="primary" onClick={onClose} className="w-full max-w-xs mx-auto">Concluir Assistente</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
