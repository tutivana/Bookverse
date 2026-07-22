/**
 * Book to Markdown Converter Utility
 * Supports PDF, EPUB, and DOCX formats.
 * Analyzes the structural layout and cleans/formats the content using the Gemini API.
 */

interface ConverterOptions {
  onLog?: (message: string) => void;
  onProgress?: (percentage: number) => void;
}

// Dynamically load external scripts via CDN
const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("DOM scripts can only be loaded in browser environment."));
      return;
    }
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
};

/**
 * Extracts raw textual content from PDF page-by-page.
 */
async function extractPDF(file: File, options: ConverterOptions): Promise<string> {
  options.onLog?.("[PDF] Carregando biblioteca pdf.js...");
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js");

  const pdfjsLib = (window as any)["pdfjs-dist/build/pdf"];
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

  options.onLog?.("[PDF] Lendo arquivo PDF e analisando buffer...");
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  options.onLog?.(`[PDF] PDF Carregado! Total de páginas: ${numPages}`);
  let combinedText = "";

  for (let i = 1; i <= numPages; i++) {
    const progress = Math.floor((i / numPages) * 100);
    options.onProgress?.(Math.floor(progress * 0.4)); // First 40% of overall progress is extraction
    options.onLog?.(`[PDF] Extraindo texto da Página ${i}/${numPages}...`);

    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    // We inject explicit page markers to help the Gemini API locate headers, footers, and page numbers
    combinedText += `\n\n--- [PÁGINA ${i}] ---\n\n${pageText || "[Página em branco]"}`;
  }

  return combinedText;
}

/**
 * Extracts XHTML/HTML contents from EPUB.
 */
async function extractEPUB(file: File, options: ConverterOptions): Promise<string> {
  options.onLog?.("[EPUB] Carregando biblioteca JSZip...");
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");

  options.onLog?.("[EPUB] Descompactando pacote zip do EPUB...");
  const JSZip = (window as any).JSZip;
  const zip = await JSZip.loadAsync(file);

  let docTitle = "";
  let docAuthor = "";
  const htmlFiles: { name: string; content: string }[] = [];

  options.onLog?.("[EPUB] Mapeando arquivos XHTML internos...");
  for (const relativePath in zip.files) {
    if (relativePath.endsWith(".xhtml") || relativePath.endsWith(".html") || relativePath.endsWith(".htm")) {
      const content = await zip.files[relativePath].async("text");
      htmlFiles.push({ name: relativePath, content });
    } else if (relativePath.endsWith(".opf")) {
      const opfContent = await zip.files[relativePath].async("text");
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(opfContent, "text/xml");
      docTitle = xmlDoc.querySelector("title")?.textContent || xmlDoc.querySelector("dc\\:title")?.textContent || "";
      docAuthor = xmlDoc.querySelector("creator")?.textContent || xmlDoc.querySelector("dc\\:creator")?.textContent || "";
    }
  }

  options.onLog?.(`[EPUB] Metadados: Título="${docTitle || "Desconhecido"}", Autor="${docAuthor || "Desconhecido"}"`);
  options.onLog?.(`[EPUB] Ordenando e processando ${htmlFiles.length} capítulos textuais...`);

  // Sort files naturally by name
  htmlFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));

  let combinedText = "";
  const domParser = new DOMParser();
  const total = htmlFiles.length;

  for (let idx = 0; idx < total; idx++) {
    const progress = Math.floor((idx / total) * 100);
    options.onProgress?.(Math.floor(progress * 0.4));
    const fileItem = htmlFiles[idx];
    options.onLog?.(`[EPUB] Lendo Capítulo ${idx + 1}/${total} (${fileItem.name.split("/").pop()})...`);

    const xmlDoc = domParser.parseFromString(fileItem.content, "text/html");
    
    // We clean up excessive spaces but keep some HTML structure tags to help Gemini recognize lists, headings, and tables!
    // Simply replacing HTML body children elements or capturing body innerHTML is highly useful.
    const bodyContent = xmlDoc.body.innerHTML || "";
    combinedText += `\n\n--- [SEÇÃO EPUB: ${fileItem.name}] ---\n\n${bodyContent}`;
  }

  return combinedText;
}

/**
 * Extracts structured HTML or raw text from DOCX.
 */
async function extractDOCX(file: File, options: ConverterOptions): Promise<string> {
  options.onLog?.("[DOCX] Carregando motor de decodificação Mammoth...");
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");

  const mammoth = (window as any).mammoth;
  options.onLog?.("[DOCX] Lendo array buffer e convertendo DOCX em HTML estruturado...");
  options.onProgress?.(15);

  const arrayBuffer = await file.arrayBuffer();
  // Using convertToHtml preserves headers, lists, italics, and tables, which makes Gemini's job much easier!
  const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
  
  options.onProgress?.(40);
  options.onLog?.("[DOCX] Conversão para HTML estruturado concluída com sucesso.");
  
  return result.value || "";
}

/**
 * Main book to Markdown conversion orchestrator.
 */
export async function convertBookToMarkdown(file: File, options: ConverterOptions = {}): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  let rawContent = "";
  
  options.onProgress?.(5);
  options.onLog?.(`[Conversor] Iniciando processamento do arquivo "${file.name}"...`);

  if (extension === "pdf") {
    rawContent = await extractPDF(file, options);
  } else if (extension === "epub") {
    rawContent = await extractEPUB(file, options);
  } else if (extension === "docx") {
    rawContent = await extractDOCX(file, options);
  } else if (extension === "txt" || extension === "md") {
    options.onLog?.("[Texto] Lendo arquivo textual direto...");
    options.onProgress?.(30);
    rawContent = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Falha ao ler arquivo de texto."));
      reader.readAsText(file);
    });
  } else {
    throw new Error(`Extensão de arquivo não suportada para conversão: .${extension}`);
  }

  if (!rawContent.trim()) {
    throw new Error("Não foi possível extrair nenhum texto legível do arquivo selecionado.");
  }

  options.onProgress?.(45);
  options.onLog?.("[Conversor] Enviando conteúdo bruto para análise estrutural profunda e conversão de Layout com Gemini AI...");

  // Send raw content to the server-side API to invoke Gemini
  const response = await fetch("/api/books/convert-to-markdown", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: file.name.replace(/\.[^/.]+$/, ""),
      format: extension,
      content: rawContent,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Erro de servidor durante a conversão do livro (HTTP ${response.status})`);
  }

  options.onProgress?.(90);
  options.onLog?.("[Conversor] Recebendo resultado estruturado em Markdown limpo do servidor...");
  const data = await response.json();

  options.onProgress?.(100);
  options.onLog?.("[SUCESSO] Livro convertido com sucesso em arquivo Markdown (.md) limpo!");
  return data.markdown;
}
