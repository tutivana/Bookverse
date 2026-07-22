import React, { useState, useRef } from "react";
import { 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Download, 
  BookOpen, 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCw 
} from "lucide-react";
import { convertBookToMarkdown } from "../lib/markdownConverter";
import ReactMarkdown from "react-markdown";

interface MarkdownBookConverterProps {
  onLoadIntoSimulator: (markdown: string, title: string) => void;
  onOpenImportModal: (markdown: string, title: string) => void;
}

export default function MarkdownBookConverter({ onLoadIntoSimulator, onOpenImportModal }: MarkdownBookConverterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [convertedMarkdown, setConvertedMarkdown] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [viewMode, setViewMode] = useState<"edit" | "preview">("preview");
  const [isCopied, setIsCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, message]);
    // Scroll to bottom of logs
    setTimeout(() => {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (fileToValidate: File) => {
    const extension = fileToValidate.name.split(".").pop()?.toLowerCase();
    const allowed = ["pdf", "epub", "docx", "txt", "md"];
    if (extension && allowed.includes(extension)) {
      setFile(fileToValidate);
      setBookTitle(fileToValidate.name.replace(/\.[^/.]+$/, ""));
      setStatus("idle");
      setLogs([]);
      setProgress(0);
      setConvertedMarkdown("");
      setErrorMsg("");
    } else {
      setStatus("error");
      setErrorMsg("Formato inválido. Por favor, envie um arquivo PDF, EPUB, DOCX ou TXT/MD.");
    }
  };

  const startConversion = async () => {
    if (!file) return;

    setStatus("processing");
    setProgress(5);
    setLogs([]);
    setConvertedMarkdown("");

    try {
      const markdownResult = await convertBookToMarkdown(file, {
        onLog: (msg) => addLog(msg),
        onProgress: (pct) => setProgress(pct),
      });

      setConvertedMarkdown(markdownResult);
      setStatus("success");
      addLog("[Conversor] Processo concluído com êxito!");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMsg(err.message || "Ocorreu um erro inesperado durante a conversão do livro.");
      addLog(`[ERRO] ${err.message || "Ocorreu um erro inesperado durante a conversão."}`);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(convertedMarkdown);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([convertedMarkdown], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${bookTitle}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Custom renderer component to properly format authors' notes in the custom :::note blocks
  const renderCustomMarkdown = (mdText: string) => {
    // Basic pre-processing of :::note ... ::: to styled HTML/div blocks
    let processed = mdText;
    
    // Replace :::note ... ::: blocks with custom html representations
    const noteBlockRegex = /:::note\s*([\s\S]*?):::/g;
    processed = processed.replace(noteBlockRegex, (match, content) => {
      return `<div class="my-4 p-4 bg-amber-50 border-l-4 border-[#8a7e58] rounded-r-2xl text-xs text-amber-900 font-sans shadow-sm">${content.trim()}</div>`;
    });

    return (
      <div 
        className="prose prose-sm prose-zinc text-zinc-800 leading-relaxed font-serif text-justify"
        dangerouslySetInnerHTML={{ __html: processed }}
      />
    );
  };

  return (
    <div className="bg-white border border-[#ece9dc] rounded-3xl p-6 md:p-8 space-y-6 shadow-sm text-left">
      <div className="border-b border-[#ece9dc] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-serif font-bold text-[#2d291c] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600" />
            Conversor de Livros Inteligente para Markdown (.md)
          </h3>
          <p className="text-xs text-gray-500">
            Carregue arquivos de livros originais em PDF, EPUB ou DOCX. Nossa inteligência artificial analisará o layout completo, removerá cabeçalhos/rodapés e gerará um arquivo Markdown limpo e unificado.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upload and Control Area */}
        <div className="lg:col-span-5 space-y-5">
          {/* File Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-6 text-center transition cursor-pointer flex flex-col items-center justify-center min-h-[180px] ${
              isDragging 
                ? "border-amber-500 bg-amber-50/40" 
                : file 
                  ? "border-emerald-500 bg-emerald-50/10" 
                  : "border-zinc-300 hover:border-zinc-400 bg-zinc-50"
            }`}
            onClick={() => document.getElementById("converter-file-input")?.click()}
          >
            <input
              type="file"
              id="converter-file-input"
              className="hidden"
              accept=".pdf,.epub,.docx,.txt,.md"
              onChange={handleFileChange}
            />
            {file ? (
              <div className="space-y-3">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 truncate max-w-[240px] mx-auto">{file.name}</p>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-12 h-12 bg-zinc-100 text-zinc-500 rounded-2xl flex items-center justify-center mx-auto">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-700">Arraste o livro ou clique para selecionar</p>
                  <p className="text-[10px] text-gray-400 mt-1">PDF, EPUB, DOCX, TXT ou MD (Max: 50MB)</p>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          {file && (
            <div className="flex gap-2">
              <button
                onClick={startConversion}
                disabled={status === "processing"}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {status === "processing" ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Convertendo... ({progress}%)
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Converter para Markdown (.md)
                  </>
                )}
              </button>
              
              {status !== "processing" && (
                <button
                  onClick={() => {
                    setFile(null);
                    setStatus("idle");
                    setConvertedMarkdown("");
                    setLogs([]);
                  }}
                  className="px-3 border border-zinc-200 hover:bg-zinc-50 text-zinc-600 rounded-xl text-xs font-bold transition cursor-pointer"
                  title="Limpar Arquivo"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Real-time Logger Terminal */}
          {(status === "processing" || logs.length > 0) && (
            <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-4 space-y-2 flex flex-col h-56 shadow-inner">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block border-b border-zinc-800 pb-1.5">LOGS DE PROCESSAMENTO</span>
              <div className="flex-1 overflow-y-auto text-[10px] font-mono text-zinc-300 space-y-1.5 scrollbar-thin">
                {logs.map((log, index) => (
                  <div key={index} className="leading-normal break-words">
                    {log.startsWith("[ERRO]") ? (
                      <span className="text-red-400 font-bold">{log}</span>
                    ) : log.startsWith("[SUCESSO]") ? (
                      <span className="text-emerald-400 font-bold">{log}</span>
                    ) : log.startsWith("[Conversor]") ? (
                      <span className="text-sky-300">{log}</span>
                    ) : (
                      <span>{log}</span>
                    )}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          )}

          {/* Error Banner */}
          {status === "error" && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 text-red-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div className="space-y-0.5 text-left">
                <p className="text-xs font-bold">Falha na Conversão</p>
                <p className="text-[10px] text-red-600 leading-normal">{errorMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* Results Viewer */}
        <div className="lg:col-span-7 border border-[#ece9dc] bg-[#FAF9F5] rounded-3xl p-5 md:p-6 flex flex-col justify-between min-h-[380px]">
          {convertedMarkdown ? (
            <div className="flex flex-col h-full justify-between space-y-4">
              {/* Header inside result area */}
              <div className="flex items-center justify-between border-b border-[#ece9dc] pb-3">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#8a7e58]" />
                  <span className="text-xs font-serif font-bold text-gray-900 truncate max-w-[180px] md:max-w-[300px]">
                    {bookTitle}.md
                  </span>
                </div>
                
                {/* Result tabs */}
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setViewMode("preview")}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                      viewMode === "preview" 
                        ? "bg-[#8a7e58] text-white" 
                        : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                    }`}
                  >
                    Visualização
                  </button>
                  <button
                    onClick={() => setViewMode("edit")}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                      viewMode === "edit" 
                        ? "bg-[#8a7e58] text-white" 
                        : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                    }`}
                  >
                    Código MD
                  </button>
                </div>
              </div>

              {/* View Pane */}
              <div className="flex-1 min-h-[220px] max-h-[360px] overflow-y-auto bg-white border border-[#ece9dc] rounded-2xl p-4 md:p-6 shadow-inner text-left scrollbar-thin">
                {viewMode === "edit" ? (
                  <textarea
                    value={convertedMarkdown}
                    onChange={(e) => setConvertedMarkdown(e.target.value)}
                    className="w-full h-full min-h-[200px] border-0 p-0 text-xs font-mono focus:outline-none focus:ring-0 bg-transparent text-zinc-950"
                  />
                ) : (
                  renderCustomMarkdown(convertedMarkdown)
                )}
              </div>

              {/* Operations Footer Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#ece9dc]">
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="p-2 border border-zinc-200 hover:bg-zinc-100 text-zinc-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-white"
                    title="Copiar para área de transferência"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> <span className="text-[10px] text-emerald-600">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> <span className="text-[10px]">Copiar</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownload}
                    className="p-2 border border-zinc-200 hover:bg-zinc-100 text-zinc-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-white"
                    title="Baixar arquivo Markdown (.md)"
                  >
                    <Download className="w-3.5 h-3.5" /> <span className="text-[10px]">Baixar</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onLoadIntoSimulator(convertedMarkdown, bookTitle)}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-xl text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                    title="Carregar manuscrito no fatiador abaixo para simulação de leitura"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Alimentar Simulador
                  </button>

                  <button
                    onClick={() => onOpenImportModal(convertedMarkdown, bookTitle)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                    title="Criar livro oficial no acervo preenchendo automaticamente"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Importar para Acervo
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 flex-1">
              <div className="w-12 h-12 bg-zinc-100 text-zinc-400 rounded-full flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-700">Nenhum resultado gerado ainda</p>
                <p className="text-[10px] text-gray-400 max-w-xs leading-normal mt-0.5">
                  Carregue um arquivo à esquerda e execute a conversão inteligente para ver o Markdown e visualização diagramada da obra.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
