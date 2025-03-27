
import React, { useContext, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DataContext } from "../context/UserContext";
import Hero from "../components/Hero";
import PDFViewer from "../components/PDFViewer";
import MockTestGenerator from "../components/MockTestGenerator";
import InterviewSimulator from "../components/InterviewSimulator";
import ChatInput from "../components/ChatInput";
import { FileText, BookOpen, Video, Bot, Upload } from "lucide-react";

const Index = () => {
  const { userQuery, aiResponse, pdfContent, pdfName, handleFileUpload, isProcessingPdf } = useContext(DataContext);
  const [activeTab, setActiveTab] = useState("chat");
  
  // Tab configuration
  const tabs = [
    { id: "chat", label: "AI Assistant", icon: <Bot className="w-4 h-4" /> },
    { id: "pdf", label: "PDF Analysis", icon: <FileText className="w-4 h-4" />, disabled: !pdfContent },
    { id: "test", label: "Mock Tests", icon: <BookOpen className="w-4 h-4" />, disabled: !pdfContent },
    { id: "interview", label: "Interview", icon: <Video className="w-4 h-4" />, disabled: !pdfContent }
  ];
  
  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-secondary/20">
      {/* Hero section */}
      <Hero />
      
      {/* Chat display */}
      <div className="container px-4 py-8">
        {/* Tab navigation */}
        <div className="flex justify-center mb-8">
          <div className="glass-card flex rounded-full overflow-hidden p-1 shadow-md">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                disabled={tab.disabled}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
                  activeTab === tab.id
                    ? "bg-primary text-white shadow-sm" 
                    : "text-foreground hover:bg-white/80 hover:text-primary"
                } ${tab.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="mb-20" // Add space for the input at bottom
          >
            {activeTab === "chat" && (
              <div className="max-w-4xl mx-auto">
                {/* Conversation history */}
                {(userQuery || aiResponse) && (
                  <div className="mb-8 space-y-4">
                    {userQuery && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-lg rounded-tr-sm p-4 ml-auto max-w-[85%] sm:max-w-[75%] bg-white/70"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                            You
                          </span>
                          <span className="text-xs text-muted-foreground">Just now</span>
                        </div>
                        <p>{userQuery}</p>
                      </motion.div>
                    )}
                    
                    {aiResponse && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass-card rounded-lg rounded-tl-sm p-4 mr-auto max-w-[85%] sm:max-w-[75%] bg-primary/5"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-medium">
                            AI
                          </span>
                          <span className="text-xs text-muted-foreground">Just now</span>
                        </div>
                        <div className="prose prose-sm max-w-none">
                          {aiResponse === "Thinking... 🤔" || aiResponse === "Analyzing your PDF..." ? (
                            <div className="flex items-center gap-2">
                              <span>{aiResponse}</span>
                              <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                              <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse delay-150"></span>
                              <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse delay-300"></span>
                            </div>
                          ) : (
                            <p className="whitespace-pre-line">{aiResponse}</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
                
                {/* Empty state or PDF upload */}
                {!userQuery && !aiResponse && (
                  <div className="text-center py-12">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                      className="w-20 h-20 mx-auto bg-primary/5 rounded-full flex items-center justify-center mb-4"
                    >
                      {pdfContent ? <FileText className="w-10 h-10 text-primary" /> : <Bot className="w-10 h-10 text-primary" />}
                    </motion.div>
                    
                    {pdfContent ? (
                      <>
                        <h3 className="text-xl font-medium mb-2">PDF Uploaded: {pdfName}</h3>
                        <p className="text-muted-foreground max-w-md mx-auto mb-4">
                          Your PDF has been analyzed and is ready for questions. Try asking something specific about the content.
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-xl font-medium mb-2">How can I help you today?</h3>
                        <p className="text-muted-foreground max-w-md mx-auto mb-4">
                          Ask questions, upload a PDF for analysis, or try voice commands by clicking the microphone button.
                        </p>
                        
                        <div className="mt-6 mb-6">
                          <button 
                            onClick={() => document.getElementById('pdf-upload')?.click()}
                            disabled={isProcessingPdf}
                            className="flex items-center gap-2 bg-primary text-white py-2 px-4 rounded-full mx-auto hover:bg-primary/90 transition-colors"
                          >
                            <Upload className="w-4 h-4" />
                            <span>Upload PDF</span>
                            <input 
                              type="file" 
                              id="pdf-upload" 
                              accept="application/pdf" 
                              onChange={handleFileUpload}
                              disabled={isProcessingPdf}
                              className="sr-only"
                            />
                          </button>
                        </div>
                      </>
                    )}
                    
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                      <div className="glass-card p-3 rounded-lg text-left hover:bg-white/90 transition-colors">
                        <h4 className="font-medium text-sm mb-1 text-primary">PDF Analysis</h4>
                        <ul className="text-sm space-y-1.5">
                          <li>"Explain the main concepts in this document"</li>
                          <li>"Summarize the key points"</li>
                          <li>"What does this PDF tell us about [topic]?"</li>
                        </ul>
                      </div>
                      
                      <div className="glass-card p-3 rounded-lg text-left hover:bg-white/90 transition-colors">
                        <h4 className="font-medium text-sm mb-1 text-primary">Voice Commands</h4>
                        <ul className="text-sm space-y-1.5">
                          <li>"Generate a mock test"</li>
                          <li>"Tell me about [topic in the PDF]"</li>
                          <li>"Stop" (to stop the AI from speaking)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === "pdf" && <PDFViewer />}
            {activeTab === "test" && <MockTestGenerator />}
            {activeTab === "interview" && <InterviewSimulator />}
          </motion.div>
        </AnimatePresence>
        
        {/* Chat input component - only show on chat tab */}
        {activeTab === "chat" && <ChatInput />}
      </div>
    </main>
  );
};

export default Index;
