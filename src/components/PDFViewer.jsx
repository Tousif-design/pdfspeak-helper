
import React, { useContext, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DataContext } from "../context/UserContext.tsx";
import { 
  FileText, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  Copy, 
  BookOpen, 
  ArrowRight,
  FileDigit,
  Loader2
} from "lucide-react";
import { Document, Page, pdfjs } from 'react-pdf';
import { toast } from "sonner";
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const PDFViewer = () => {
  const context = useContext(DataContext);
  
  // Add a check for undefined context
  if (!context) {
    return <div className="flex items-center justify-center h-[600px]">
      <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
      <p className="ml-3">Loading PDF viewer...</p>
    </div>;
  }
  
  const { pdfContent, pdfName, pdfAnalysis, isProcessingPdf } = context;
  
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState("analysis"); // Changed default to analysis
  const [pdfBlob, setPdfBlob] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [contentView, setContentView] = useState("text"); // "text" or "pdf"
  
  // Create a Blob URL from the PDF content for display
  useEffect(() => {
    const createPdfBlob = async () => {
      if (pdfContent) {
        try {
          // For demonstration - in a real app, you'd use the actual PDF file
          // This is a placeholder approach since we only have text content
          const { jsPDF } = await import('jspdf');
          const doc = new jsPDF();
          
          // Split content into pages (rough approximation)
          const contentChunks = pdfContent.match(/[\s\S]{1,3000}/g) || [];
          
          contentChunks.forEach((chunk, i) => {
            if (i > 0) doc.addPage();
            doc.setFont("helvetica", "normal");
            doc.setFontSize(12);
            
            // Add text with word wrap
            const splitText = doc.splitTextToSize(chunk, 180);
            doc.text(splitText, 15, 20);
          });
          
          const blob = doc.output('blob');
          const url = URL.createObjectURL(blob);
          
          setPdfBlob(url);
          setLoadError(false);
        } catch (error) {
          console.error("Error creating PDF blob:", error);
          setLoadError(true);
          // Default to showing text view on error
          setContentView("text");
        }
      } else {
        setPdfBlob(null);
      }
    };
    
    createPdfBlob();
    
    // Cleanup
    return () => {
      if (pdfBlob) URL.revokeObjectURL(pdfBlob);
    };
  }, [pdfContent]);
  
  // Handle successful PDF load
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setLoadError(false);
    console.log("PDF loaded successfully with", numPages, "pages");
  };
  
  // Handle PDF load error
  const onDocumentLoadError = (error) => {
    console.error("Error loading PDF:", error);
    setLoadError(true);
    setContentView("text");  // Fall back to text view
  };
  
  // Change page controls
  const changePage = (offset) => {
    setPageNumber(prevPageNumber => {
      const newPage = prevPageNumber + offset;
      return newPage >= 1 && newPage <= numPages ? newPage : prevPageNumber;
    });
  };
  
  // Zoom controls
  const zoomIn = () => setScale(prevScale => Math.min(prevScale + 0.2, 2.5));
  const zoomOut = () => setScale(prevScale => Math.max(prevScale - 0.2, 0.5));
  
  // Copy analysis to clipboard
  const copyAnalysis = () => {
    navigator.clipboard.writeText(pdfAnalysis)
      .then(() => {
        toast.success("Analysis copied to clipboard");
      })
      .catch(err => {
        console.error("Copy failed:", err);
        toast.error("Failed to copy analysis");
      });
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto mt-8 glass-card rounded-xl overflow-hidden"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 bg-background/70 border-b border-border flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-lg">PDF Analysis</h3>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {pdfName || "No PDF uploaded"}
              </p>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex rounded-lg overflow-hidden border border-border">
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-1.5 ${
                activeTab === "preview" 
                  ? "bg-primary text-white" 
                  : "bg-white/50 hover:bg-white/80"
              }`}
            >
              <FileDigit className="w-4 h-4" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setActiveTab("analysis")}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-1.5 ${
                activeTab === "analysis" 
                  ? "bg-primary text-white" 
                  : "bg-white/50 hover:bg-white/80"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Analysis</span>
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 h-full flex flex-col">
          {activeTab === "preview" ? (
            pdfContent ? (
              <div className="flex flex-col h-full">
                {/* Toggle between PDF and Text view */}
                <div className="flex justify-center mb-4">
                  <div className="flex rounded-lg overflow-hidden border border-border">
                    <button
                      onClick={() => setContentView("pdf")}
                      className={`px-4 py-2 text-sm font-medium ${
                        contentView === "pdf" 
                          ? "bg-primary text-white" 
                          : "bg-white/50 hover:bg-white/80"
                      }`}
                    >
                      PDF View
                    </button>
                    <button
                      onClick={() => setContentView("text")}
                      className={`px-4 py-2 text-sm font-medium ${
                        contentView === "text" 
                          ? "bg-primary text-white" 
                          : "bg-white/50 hover:bg-white/80"
                      }`}
                    >
                      Text View
                    </button>
                  </div>
                </div>
              
                {contentView === "pdf" ? (
                  <>
                    {/* Search and controls */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search in PDF..."
                          className="pl-9 pr-4 py-2 rounded-md border border-gray-200 w-full sm:w-64"
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                        />
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={zoomOut}
                          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100"
                          aria-label="Zoom out"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="text-sm">{Math.round(scale * 100)}%</span>
                        <button
                          onClick={zoomIn}
                          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100"
                          aria-label="Zoom in"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* PDF display */}
                    <div className="flex-grow overflow-auto bg-white rounded-lg shadow-inner flex justify-center p-4">
                      <div className="pdf-container max-w-full">
                        {pdfBlob ? (
                          <Document
                            file={pdfBlob}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            loading={
                              <div className="flex flex-col items-center justify-center h-[600px]">
                                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                                <p>Loading PDF...</p>
                              </div>
                            }
                            error={
                              <div className="flex flex-col items-center justify-center h-[600px] text-center p-4">
                                <FileText className="w-12 h-12 text-red-400 mb-4" />
                                <h3 className="text-lg font-medium mb-2">Could not display PDF preview</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                  PDF preview is not available for this document, but you can still view the text content.
                                </p>
                                <button
                                  onClick={() => setContentView("text")}
                                  className="px-4 py-2 bg-primary text-white rounded-md flex items-center gap-2"
                                >
                                  <BookOpen className="w-4 h-4" />
                                  <span>View Text Content</span>
                                </button>
                              </div>
                            }
                          >
                            <Page
                              pageNumber={pageNumber}
                              scale={scale}
                              renderTextLayer={true}
                              renderAnnotationLayer={true}
                            />
                          </Document>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-[600px]">
                            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                            <p>Processing PDF content...</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Page controls */}
                    {numPages && !loadError && contentView === "pdf" && (
                      <div className="flex items-center justify-center gap-4 mt-4">
                        <button
                          onClick={() => changePage(-1)}
                          disabled={pageNumber <= 1}
                          className="px-3 py-1.5 border border-gray-200 rounded-md disabled:opacity-50 text-sm"
                        >
                          Previous
                        </button>
                        <p className="text-sm">
                          Page <span className="font-medium">{pageNumber}</span> of{" "}
                          <span className="font-medium">{numPages}</span>
                        </p>
                        <button
                          onClick={() => changePage(1)}
                          disabled={pageNumber >= numPages}
                          className="px-3 py-1.5 border border-gray-200 rounded-md disabled:opacity-50 text-sm"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  // Text view
                  <div className="flex-grow overflow-auto bg-white rounded-lg shadow-inner p-4">
                    <div className="max-h-[600px] overflow-auto w-full p-4 border border-gray-200 rounded-lg bg-gray-50 text-left">
                      <pre className="whitespace-pre-wrap text-sm">
                        {pdfContent}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">No PDF Uploaded</h3>
                <p className="text-muted-foreground max-w-md text-center">
                  Upload a PDF document first to view its content and analysis
                </p>
              </div>
            )
          ) : (
            // Analysis tab
            <div className="glass-card p-5 rounded-lg bg-white/70 relative h-full flex flex-col">
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  onClick={copyAnalysis}
                  className="p-2 rounded-md hover:bg-gray-100 text-gray-500"
                  aria-label="Copy analysis"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              
              <div className="prose prose-sm max-w-none flex-grow overflow-auto">
                <h2 className="text-xl font-medium mb-4">PDF Analysis</h2>
                {isProcessingPdf ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span>Analyzing PDF content...</span>
                  </div>
                ) : pdfContent && !pdfAnalysis ? (
                  // Show loading state when we have PDF but analysis is not ready
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span>Generating PDF analysis...</span>
                  </div>
                ) : pdfAnalysis ? (
                  <div className="whitespace-pre-line">{pdfAnalysis}</div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <BookOpen className="w-16 h-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-medium mb-2">No Analysis Available</h3>
                    <p className="text-muted-foreground max-w-md">
                      Upload a PDF document first to generate its analysis
                    </p>
                  </div>
                )}
              </div>
              
              {/* Call to action */}
              {pdfContent && !isProcessingPdf && (
                <div className="mt-8 p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <h3 className="font-medium text-primary mb-2">What's next?</h3>
                  <p className="text-sm mb-3">
                    Now that you've analyzed your PDF, you can:
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => window.location.hash = "#test"}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-md text-sm hover:bg-primary/20"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Take a Mock Test</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default PDFViewer;
