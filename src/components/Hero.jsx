
import React, { useContext } from "react";
import { motion } from "framer-motion";
import { DataContext } from "../context/UserContext.tsx"; // Updated import to use TypeScript version
import { Mic, MicOff, Upload, Bot, Volume2 } from "lucide-react";

const Hero = () => {
  const context = useContext(DataContext);
  
  // Add a check for undefined context
  if (!context) {
    return <div className="flex items-center justify-center min-h-[400px]">Loading...</div>;
  }
  
  const { 
    toggleRecognition, 
    isListening, 
    speaking, 
    handleFileUpload, 
    isProcessingPdf,
    pdfName,
    inputText,
    setInputText,
    handleSubmitText
  } = context;

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background to-secondary/30 min-h-[400px] flex flex-col items-center justify-center px-4 py-16 sm:py-24">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[200px] -right-[200px] w-[500px] h-[500px] rounded-full bg-primary/5 animate-spin-slow"></div>
        <div className="absolute -bottom-[100px] -left-[100px] w-[300px] h-[300px] rounded-full bg-primary/5 animate-spin-slow"></div>
      </div>
      
      {/* Hero content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-6 relative inline-block">
            <span className="absolute top-0 left-0 w-full h-full bg-primary/5 rounded-full filter blur-xl animate-pulse-subtle"></span>
            <div className="relative z-10 w-24 h-24 mx-auto rounded-full overflow-hidden bg-gradient-to-br from-primary/80 to-primary shadow-lg flex items-center justify-center">
              <Bot className="w-12 h-12 text-white" />
            </div>
          </div>
          
          <motion.h1 
            className="text-4xl sm:text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            Sifraa AI Assistant
          </motion.h1>
          
          <motion.p 
            className="text-lg md:text-xl text-foreground/80 mb-8 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Your intelligent PDF analyzer and educational companion. Upload a document, ask questions, create tests, or practice with interview simulations.
          </motion.p>
          
          {/* Action buttons */}
          <motion.div 
            className="flex flex-wrap gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            {/* File upload button */}
            <label className="glass-card hover-scale px-5 py-3 rounded-full flex items-center gap-2 cursor-pointer bg-white border border-border shadow-sm hover:shadow-md transition-all duration-300">
              <Upload className="w-5 h-5 text-primary" />
              <span className="font-medium">
                {isProcessingPdf ? "Processing PDF..." : pdfName ? `${pdfName.slice(0, 15)}${pdfName.length > 15 ? '...' : ''}` : "Upload PDF"}
              </span>
              <input 
                type="file" 
                accept="application/pdf" 
                onChange={handleFileUpload} 
                className="hidden" 
                disabled={isProcessingPdf}
              />
            </label>
            
            {/* Voice control button */}
            <button 
              onClick={toggleRecognition}
              disabled={speaking}
              className={`glass-card hover-scale px-5 py-3 rounded-full flex items-center gap-2 transition-all duration-300 ${
                isListening 
                  ? "bg-primary text-white shadow-lg" 
                  : "bg-white border border-border shadow-sm hover:shadow-md"
              }`}
            >
              {isListening ? (
                <>
                  <Mic className="w-5 h-5 animate-pulse" />
                  <span className="font-medium">Listening...</span>
                </>
              ) : (
                <>
                  <MicOff className={`w-5 h-5 ${speaking ? "text-muted-foreground" : "text-primary"}`} />
                  <span className={`font-medium ${speaking ? "text-muted-foreground" : ""}`}>
                    {speaking ? "Speaking..." : "Start Listening"}
                  </span>
                </>
              )}
            </button>
            
            {/* Speaking indicator */}
            {speaking && (
              <div className="glass-card px-5 py-3 rounded-full flex items-center gap-2 bg-white/90 border border-border shadow-sm">
                <Volume2 className="w-5 h-5 text-primary animate-pulse" />
                <span className="font-medium">Speaking...</span>
              </div>
            )}
          </motion.div>
          
          {/* Text input form */}
          <motion.form 
            onSubmit={handleSubmitText}
            className="mt-8 max-w-2xl mx-auto relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Or type your question here..."
              className="glass-input w-full px-5 py-3 pr-12 rounded-full text-foreground/90 placeholder:text-foreground/50 focus:outline-none"
            />
            <button 
              type="submit" 
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 transition-colors"
              disabled={!inputText.trim()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12 14-7-7 14v-7z"/>
              </svg>
            </button>
          </motion.form>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
