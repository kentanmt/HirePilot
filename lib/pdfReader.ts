/**
 * Client-side PDF text extraction using PDF.js (pure JS, no native binaries).
 * Only call this in browser contexts ("use client" components).
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  // Dynamic import so it never runs on the server
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");

  // Point the worker at the CDN so we don't have to bundle it
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .filter((item: any) => typeof item.str === "string")
      .map((item: any) => item.str)
      .join(" ")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (pageText) pages.push(pageText);
  }

  return pages.join("\n\n").trim();
}

/**
 * Read text from any supported resume file:
 * - .txt  → FileReader
 * - .pdf  → PDF.js
 * Returns null if the file type is unsupported.
 */
export async function readResumeFile(file: File): Promise<string | null> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".txt") || file.type === "text/plain") {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) ?? "");
      reader.readAsText(file);
    });
  }

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    try {
      return await extractTextFromPDF(file);
    } catch (err) {
      console.error("PDF extraction failed:", err);
      return null;
    }
  }

  return null;
}
