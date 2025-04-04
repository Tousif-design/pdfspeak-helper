
import * as pdfjs from 'pdfjs-dist';
import { toast } from "sonner";

// Initialize PDF.js worker
const pdfjsWorker = import('pdfjs-dist/build/pdf.worker.entry');
pdfjs.GlobalWorkerOptions.workerUrl = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

/**
 * Extracts text from a PDF file
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    console.log("Starting PDF extraction for:", file.name);
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    console.log(`PDF loaded with ${pdf.numPages} pages`);
    let fullText = "";
    
    const totalPages = pdf.numPages;
    
    // Show loading toast
    let toastId;
    if (totalPages > 5) {
      toastId = toast.loading(`Processing PDF (0/${totalPages} pages)`, {
        duration: 100000
      });
    }
    
    for (let i = 1; i <= totalPages; i++) {
      // Update progress for larger PDFs
      if (totalPages > 5 && i % 2 === 0) {
        toast.loading(`Processing PDF (${i}/${totalPages} pages)`, {
          id: toastId
        });
      }
      
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n\n';
        console.log(`Extracted page ${i}: ${pageText.substring(0, 50)}...`);
      } catch (pageError) {
        console.error(`Error processing page ${i}:`, pageError);
      }
    }
    
    // Dismiss loading toast if it exists
    if (toastId) {
      toast.dismiss(toastId);
    }
    
    console.log("PDF extraction completed successfully, length:", fullText.length);
    return fullText;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    toast.error("Failed to process PDF. Please try a different file.", {
      description: "The PDF format may not be supported or the file may be corrupted."
    });
    throw new Error("PDF extraction failed");
  }
}

/**
 * Creates a PDF from content
 */
export async function generatePdf(content: string, title: string): Promise<Blob> {
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    // Add title with better formatting
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(title, 20, 20);
    
    // Add content with improved formatting
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    
    // Handle line breaks and paragraphs
    const contentLines = content.split('\n');
    let yPosition = 30;
    
    for (const paragraph of contentLines) {
      if (paragraph.trim() === '') {
        yPosition += 5; // Add spacing for empty lines
        continue;
      }
      
      // Split text to fit page width
      const textLines = doc.splitTextToSize(paragraph, 170);
      
      // Check if we need to add a new page
      if (yPosition + (textLines.length * 7) > 280) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.text(textLines, 20, yPosition);
      yPosition += (textLines.length * 7) + 5; // Add spacing after paragraph
    }
    
    return doc.output('blob');
  } catch (error) {
    console.error("Error generating PDF:", error);
    toast.error("Failed to generate PDF", {
      description: "Please try again with less content or smaller sections"
    });
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
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
  
  toast.success(`${filename} downloaded successfully`);
}

/**
 * Validates a PDF file before processing
 */
export function validatePdfFile(file: File): boolean {
  if (!file) {
    toast.error("No file selected", {
      description: "Please select a PDF file to upload"
    });
    return false;
  }
  
  if (file.type !== 'application/pdf') {
    toast.error("Invalid file type", {
      description: "Please upload a PDF file (*.pdf)"
    });
    return false;
  }
  
  // Check file size (limit to 50MB)
  const maxSize = 50 * 1024 * 1024; // 50MB in bytes
  if (file.size > maxSize) {
    toast.error("File too large", {
      description: "PDF must be less than 50MB in size"
    });
    return false;
  }
  
  return true;
}
