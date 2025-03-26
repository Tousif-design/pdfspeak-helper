
import React, { useContext, useState } from "react";
import { motion } from "framer-motion";
import { DataContext } from "../context/UserContext";
import { FileText, Download, Loader2 } from "lucide-react";
import { generatePdf, downloadBlob } from "../lib/pdfUtils";

const PDFViewer = () => {
  const { 
    pdfContent, 
    pdfName, 
    pdfAnalysis, 
    isProcessingPdf 
  } = useContext(DataContext);
  
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState("analysis");
  
  // Format and clean up PDF content for display
  const formatPdfText = (text) => {
    if (!text) return "";
    
    return text
      .replace(/\n{3,}/g, "\n\n") // Replace excessive newlines
      .split("\n")
      .map((line, i) => (
        <React.Fragment key={i}>
          {line}
          <br />
        </React.Fragment>
      ));
  };
  
  // Download analysis as PDF
  const handleDownloadAnalysis = async () => {
    if (!pdfAnalysis) return;
    
    try {
      setDownloading(true);
      const analysisTitle = pdfName 
        ? `Analysis of ${pdfName}` 
        : "PDF Analysis";
        
      const pdfBlob = await generatePdf(pdfAnalysis, analysisTitle);
      downloadBlob(pdfBlob, "pdf-analysis.pdf");
    } catch (error) {
      console.error("Error downloading analysis:", error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto mt-8 glass-card rounded-xl overflow-hidden"
    >
      {pdfContent ? (
        <div className="flex flex-col h-full">
          {/* PDF header */}
          <div className="px-6 py-4 bg-background/70 border-b border-border flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-lg">{pdfName || "PDF Document"}</h3>
                <p className="text-sm text-muted-foreground">
                  {(pdfContent.length / 1000).toFixed(1)}K characters
                </p>
              </div>
            </div>
            
            {/* Tab navigation */}
            <div className="flex rounded-lg overflow-hidden border border-border">
              <button
                onClick={() => setActiveTab("analysis")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "analysis"
                    ? "bg-primary text-white"
                    : "bg-background hover:bg-secondary"
                }`}
              >
                Analysis
              </button>
              <button
                onClick={() => setActiveTab("content")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "content"
                    ? "bg-primary text-white"
                    : "bg-background hover:bg-secondary"
                }`}
              >
                Content
              </button>
            </div>
          </div>
          
          {/* PDF content */}
          <div className="flex-grow p-6 overflow-auto max-h-[500px]">
            {activeTab === "analysis" ? (
              <>
                {pdfAnalysis ? (
                  <div className="prose prose-lg max-w-none">
                    {formatPdfText(pdfAnalysis)}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center text-center">
                      <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                      <p className="text-lg">Analyzing PDF content...</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        This may take a moment for larger documents
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Download analysis button */}
                {pdfAnalysis && (
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleDownloadAnalysis}
                      disabled={downloading}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
                    >
                      {downloading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating PDF...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Download Analysis</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="prose prose-lg max-w-none">
                {formatPdfText(pdfContent)}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          {isProcessingPdf ? (
            <>
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <h3 className="text-xl font-medium mb-2">Processing PDF</h3>
              <p className="text-muted-foreground max-w-md">
                Your document is being analyzed. This may take a moment depending on the file size.
              </p>
            </>
          ) : (
            <>
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">No PDF Uploaded</h3>
              <p className="text-muted-foreground max-w-md">
                Upload a PDF document to analyze its content, create mock tests, or practice with interview simulations.
              </p>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default PDFViewer;
