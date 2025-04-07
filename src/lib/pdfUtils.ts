
import * as pdfjs from 'pdfjs-dist';
import { toast } from "sonner";

// Initialize PDF.js worker
const pdfjsWorker = import('pdfjs-dist/build/pdf.worker.entry');
// Fix the TypeScript error by using the correct property
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

/**
 * Extracts text from a PDF file
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    console.log("Starting PDF extraction for:", file.name);
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    let progressToastId: string | number | undefined;
    
    loadingTask.onProgress = (progress) => {
      const percent = progress.loaded / (progress.total || 1) * 100;
      console.log(`Loading PDF: ${Math.round(percent)}%`);
      
      if (percent > 0 && percent < 100 && !progressToastId) {
        progressToastId = toast.loading(`Loading PDF: ${Math.round(percent)}%`, {
          duration: 3000
        });
      }
    };
    
    const pdf = await loadingTask.promise.catch(error => {
      console.error("PDF loading error:", error);
      toast.error("Failed to load PDF", {
        description: "The file format might not be supported or the file is corrupted"
      });
      throw new Error("PDF loading failed");
    });
    
    console.log(`PDF loaded with ${pdf.numPages} pages`);
    let fullText = "";
    
    const totalPages = pdf.numPages;
    
    // Show loading toast
    let toastId;
    if (totalPages > 3) {
      toastId = toast.loading(`Processing PDF (0/${totalPages} pages)`, {
        duration: 60000 // Extended the duration to give more time for processing
      });
    }
    
    // Process pages in parallel with limited concurrency
    const concurrency = 2; // Reduced concurrency to avoid memory issues
    const batchSize = Math.min(concurrency, totalPages);
    let processedPages = 0;
    
    // Process in batches to improve performance but avoid memory issues
    for (let batchStart = 1; batchStart <= totalPages; batchStart += batchSize) {
      const batchPromises = [];
      const batchEnd = Math.min(batchStart + batchSize - 1, totalPages);
      
      for (let i = batchStart; i <= batchEnd; i++) {
        batchPromises.push(extractPageText(pdf, i));
      }
      
      try {
        // Wait for batch to complete
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(pageText => {
          if (pageText && typeof pageText === 'string') {
            fullText += pageText + '\n\n';
          }
        });

        // Force garbage collection between batches to reduce memory pressure
        if (typeof window !== 'undefined' && (window as any).gc) {
          try { (window as any).gc(); } catch (e) {}
        }
      } catch (batchError) {
        console.error("Error processing batch:", batchError);
        // Continue with other batches even if one fails
      }
      
      // Update progress
      processedPages += batchPromises.length;
      if (toastId && totalPages > 3) {
        toast.loading(`Processing PDF (${processedPages}/${totalPages} pages)`, {
          id: toastId
        });
      }
      
      // Add a small delay between batches to prevent UI freezing
      if (batchStart + batchSize <= totalPages) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Dismiss loading toast if it exists
    if (toastId) {
      toast.dismiss(toastId);
      toast.success(`PDF processed successfully (${totalPages} pages)`);
    }
    
    console.log("PDF extraction completed successfully, length:", fullText.length);
    
    // Validate the extracted text to ensure we got meaningful content
    if (fullText.trim().length < 100 && totalPages > 0) {
      toast.warning("Limited text extracted", {
        description: "This may be a scanned PDF with limited text content"
      });
      
      // Add a minimal fallback text to ensure we have something
      if (fullText.trim().length === 0) {
        fullText = `PDF document with ${totalPages} pages. Limited text content could be extracted. This may be a scanned document or image-based PDF.`;
      }
    }
    
    return fullText;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    toast.error("Failed to process PDF", {
      description: "The PDF format may not be supported or the file may be corrupted."
    });
    throw new Error("PDF extraction failed");
  }
}

/**
 * Extract text from a single page
 */
async function extractPageText(pdf: pdfjs.PDFDocumentProxy, pageNum: number): Promise<string> {
  try {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    if (!textContent || !textContent.items || textContent.items.length === 0) {
      console.warn(`No text content found on page ${pageNum}`);
      return `[Page ${pageNum} - No text content]`;
    }
    
    const pageText = textContent.items
      .map((item: any) => item.str || '')
      .join(' ');
    
    console.log(`Extracted page ${pageNum}: ${pageText.substring(0, 50)}...`);
    return pageText;
  } catch (pageError) {
    console.error(`Error processing page ${pageNum}:`, pageError);
    return `[Error extracting text from page ${pageNum}]`;
  } finally {
    // Force garbage collection to prevent memory issues
    try {
      if (typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
      }
    } catch (e) {}
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

/**
 * Checks if PDF processing is stuck and provides recovery
 */
export function checkPdfProcessingStatus(startTime: number): boolean {
  const processingTime = Date.now() - startTime;
  const maxProcessingTime = 60000; // 60 seconds
  
  if (processingTime > maxProcessingTime) {
    toast.error("PDF processing timeout", {
      description: "Processing is taking too long. Try a smaller PDF file."
    });
    return true; // Processing is stuck
  }
  
  return false; // Processing is still within acceptable time
}

/**
 * Enhanced validation to ensure PDF content is usable
 */
export function validateExtractedPdfContent(text: string): boolean {
  if (!text || text.trim().length < 50) {
    toast.error("PDF content issue", {
      description: "Not enough text could be extracted from the PDF"
    });
    return false;
  }
  return true;
}
