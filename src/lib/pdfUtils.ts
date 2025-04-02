
import * as pdfjs from 'pdfjs-dist';
import { toast } from "sonner";

// Initialize PDF.js worker
const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.entry');
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Extracts text from a PDF file
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = "";
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => (item.str || "").trim())
        .join(' ');
      fullText += pageText + '\n\n';
    }
    
    if (!fullText.trim()) {
      throw new Error("No text could be extracted from this PDF. It might be an image-based PDF or empty.");
    }
    
    return fullText;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    let errorMessage = "Failed to process PDF. Please try again with a different file.";
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    toast.error(errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Creates a PDF from content
 */
export async function generatePdf(content: string, title: string): Promise<Blob> {
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text(title, 20, 20);
    
    // Add content
    doc.setFontSize(12);
    const textLines = doc.splitTextToSize(content, 170);
    doc.text(textLines, 20, 30);
    
    return doc.output('blob');
  } catch (error) {
    console.error("Error generating PDF:", error);
    toast.error("Failed to generate PDF. Please try again.");
    throw new Error("PDF generation failed");
  }
}

/**
 * Downloads a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
