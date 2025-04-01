
import React, { useContext, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DataContext } from "../context/UserContext";
import { 
  FileText, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  Copy, 
  BookOpen, 
  ArrowRight,
  FileDigit
} from "lucide-react";
import { Document, Page, pdfjs } from 'react-pdf';

// Initialize PDF.js worker
const pdfjsWorker = import('pdfjs-dist/build/pdf.worker.entry');
pdfjs.GlobalWorkerOptions.workerUrl = pdfjsWorker;

const PDFViewer = () => {
  const { pdfContent, pdfName, pdfAnalysis } = useContext(DataContext);
  
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfData, setPdfData] = useState(null);
  const [scale, setScale] = useState(1.0);
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState("preview"); // 'preview' or 'analysis'
  const [pdfUrl, setPdfUrl] = useState(null);
  
  // Parse the PDF content to display
  useEffect(() => {
    if (pdfContent) {
      // Attempt to convert text back to PDF for display
      // Note: This is a simplistic approach, in a real app you'd use the actual PDF file
      try {
        const dataUrl = `data:application/pdf;base64,${btoa(unescape(encodeURIComponent(pdfContent)))}`;
        setPdfUrl(dataUrl);
      } catch (error) {
        console.error("Error creating PDF for display:", error);
      }
    }
  }, [pdfContent]);
  
  // Handle successful PDF load
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
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
                    
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = pdfUrl;
                        link.download = pdfName || 'document.pdf';
                        link.click();
                      }}
                      className="ml-2 px-3 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 text-sm flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
                
                {/* PDF display */}
                <div className="flex-grow overflow-auto bg-white rounded-lg shadow-inner flex justify-center p-4">
                  <div className="pdf-container max-w-full">
                    {pdfUrl ? (
                      <Document
                        file={pdfUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={
                          <div className="flex flex-col items-center justify-center h-[600px]">
                            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
                            <p>Loading PDF...</p>
                          </div>
                        }
                        error={
                          <div className="flex flex-col items-center justify-center h-[600px] text-center p-4">
                            <FileText className="w-12 h-12 text-red-400 mb-4" />
                            <h3 className="text-lg font-medium mb-2">Could not display PDF preview</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              PDF preview is not available for this document, but you can still view the analysis.
                            </p>
                            <button
                              onClick={() => setActiveTab("analysis")}
                              className="px-4 py-2 bg-primary text-white rounded-md flex items-center gap-2"
                            >
                              <BookOpen className="w-4 h-4" />
                              <span>View Analysis</span>
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
                        <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                        <p>PDF content not available for preview</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Page controls */}
                {numPages && (
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
            pdfAnalysis ? (
              <div className="glass-card p-5 rounded-lg bg-white/70 relative">
                <div className="absolute top-3 right-3 flex gap-2">
                  <button
                    onClick={copyAnalysis}
                    className="p-2 rounded-md hover:bg-gray-100 text-gray-500"
                    aria-label="Copy analysis"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="prose prose-sm max-w-none">
                  <h2 className="text-xl font-medium mb-4">PDF Analysis</h2>
                  <div className="whitespace-pre-line">{pdfAnalysis}</div>
                </div>
                
                {/* Call to action */}
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
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <BookOpen className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">No Analysis Available</h3>
                <p className="text-muted-foreground max-w-md text-center">
                  Upload a PDF document first to generate its analysis
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default PDFViewer;
