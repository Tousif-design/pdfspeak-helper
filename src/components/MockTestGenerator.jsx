
import React, { useContext, useState } from "react";
import { motion } from "framer-motion";
import { DataContext } from "../context/UserContext";
import { FileText, Download, Settings, Loader2 } from "lucide-react";
import { generateMockTest } from "../lib/geminiHelpers";
import { generatePdf, downloadBlob } from "../lib/pdfUtils";
import { toast } from "sonner";

const MockTestGenerator = () => {
  const { pdfContent, pdfName, mockTest } = useContext(DataContext);
  
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [testSettings, setTestSettings] = useState({
    type: "mixed",
    questions: 10,
    difficulty: "medium"
  });
  
  // Generate a new mock test
  const handleGenerateTest = async () => {
    if (!pdfContent) {
      toast.error("No PDF content", { description: "Please upload a PDF first" });
      return;
    }
    
    try {
      setGenerating(true);
      
      const testType = testSettings.type === "mixed" 
        ? "mixed format (multiple choice, short answer, and essay questions)" 
        : testSettings.type === "multiple" 
          ? "multiple choice only" 
          : "essay questions only";
          
      const newTest = await generateMockTest(
        pdfContent, 
        testType, 
        testSettings.questions,
        testSettings.difficulty
      );
      
      toast.success("Mock test generated successfully");
    } catch (error) {
      console.error("Error generating test:", error);
      toast.error("Failed to generate test", { description: error.message });
    } finally {
      setGenerating(false);
    }
  };
  
  // Download test as PDF
  const handleDownloadTest = async () => {
    if (!mockTest) return;
    
    try {
      setDownloading(true);
      const testTitle = pdfName 
        ? `Mock Test - ${pdfName}` 
        : "Mock Test";
        
      const pdfBlob = await generatePdf(mockTest, testTitle);
      downloadBlob(pdfBlob, "mock-test.pdf");
      
      toast.success("Test downloaded successfully");
    } catch (error) {
      console.error("Error downloading test:", error);
      toast.error("Failed to download test", { description: error.message });
    } finally {
      setDownloading(false);
    }
  };
  
  // Format and clean up text for display
  const formatText = (text) => {
    if (!text) return "";
    
    return text
      .replace(/\n{3,}/g, "\n\n")
      .split("\n")
      .map((line, i) => (
        <React.Fragment key={i}>
          {line}
          <br />
        </React.Fragment>
      ));
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
              <h3 className="font-medium text-lg">Mock Test Generator</h3>
              <p className="text-sm text-muted-foreground">
                Create customized tests based on your PDF
              </p>
            </div>
          </div>
          
          {mockTest && (
            <button
              onClick={handleDownloadTest}
              disabled={downloading || !mockTest}
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
                  <span>Download Test</span>
                </>
              )}
            </button>
          )}
        </div>
        
        {/* Content */}
        <div className="p-6">
          {/* Test settings */}
          {!mockTest && (
            <div className="mb-6 glass-card rounded-lg p-4 bg-white/50">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-5 h-5 text-primary" />
                <h4 className="font-medium">Test Settings</h4>
              </div>
              
              <div className="grid sm:grid-cols-3 gap-4">
                {/* Test type */}
                <div>
                  <label className="block text-sm mb-1.5">Test Type</label>
                  <select 
                    value={testSettings.type}
                    onChange={(e) => setTestSettings({ ...testSettings, type: e.target.value })}
                    className="glass-input w-full rounded-md px-3 py-1.5 text-sm"
                  >
                    <option value="mixed">Mixed Format</option>
                    <option value="multiple">Multiple Choice Only</option>
                    <option value="essay">Essay Questions Only</option>
                  </select>
                </div>
                
                {/* Question count */}
                <div>
                  <label className="block text-sm mb-1.5">Number of Questions</label>
                  <select 
                    value={testSettings.questions}
                    onChange={(e) => setTestSettings({ ...testSettings, questions: Number(e.target.value) })}
                    className="glass-input w-full rounded-md px-3 py-1.5 text-sm"
                  >
                    <option value="5">5 Questions</option>
                    <option value="10">10 Questions</option>
                    <option value="15">15 Questions</option>
                    <option value="20">20 Questions</option>
                  </select>
                </div>
                
                {/* Difficulty */}
                <div>
                  <label className="block text-sm mb-1.5">Difficulty Level</label>
                  <select 
                    value={testSettings.difficulty}
                    onChange={(e) => setTestSettings({ ...testSettings, difficulty: e.target.value })}
                    className="glass-input w-full rounded-md px-3 py-1.5 text-sm"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleGenerateTest}
                  disabled={generating || !pdfContent}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <span>Generate Test</span>
                  )}
                </button>
              </div>
            </div>
          )}
          
          {/* Test display */}
          <div className={mockTest ? "prose prose-lg max-w-none" : ""}>
            {mockTest ? (
              formatText(mockTest)
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                {generating ? (
                  <>
                    <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                    <h3 className="text-xl font-medium mb-2">Generating Test</h3>
                    <p className="text-muted-foreground max-w-md">
                      Creating your custom mock test. This may take a moment...
                    </p>
                  </>
                ) : (
                  <>
                    <FileText className="w-12 h-12 text-muted-foreground/70 mb-4" />
                    <h3 className="text-xl font-medium mb-2">No Test Generated</h3>
                    <p className="text-muted-foreground max-w-md">
                      {pdfContent 
                        ? "Configure your test settings and click Generate Test to create a mock test based on your PDF content."
                        : "Please upload a PDF document first to generate a mock test."}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MockTestGenerator;
