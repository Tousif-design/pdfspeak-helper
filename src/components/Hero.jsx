
import React, { useContext } from "react";
import { motion } from "framer-motion";
import { DataContext } from "../context/UserContext.tsx";
import { Upload, Mic, MicOff, FileText } from "lucide-react";

const Hero = () => {
  const context = useContext(DataContext);
  
  // Add a check for undefined context
  if (!context) {
    return (
      <div className="py-16 bg-gradient-to-b from-primary/10 to-transparent">
        <div className="container mx-auto px-4">
          <div className="flex justify-center">
            <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }
  
  const { 
    toggleRecognition, 
    isListening, 
    handleFileUpload, 
    isProcessingPdf,
    pdfName
  } = context;

  return (
    <div className="py-16 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Your AI-Powered Educational Assistant
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
            Upload your PDF, ask questions, create tests, or practice 
            with interview simulations. Let AI help you learn more effectively.
          </p>
          
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="relative group"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-secondary rounded-full opacity-70 blur-sm group-hover:opacity-100 transition-all duration-300"></div>
              <button
                onClick={() => document.getElementById('pdf-upload')?.click()}
                disabled={isProcessingPdf}
                className="relative flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all"
              >
                <Upload className="w-5 h-5 text-primary" />
                <span className="font-medium">
                  {pdfName ? (
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {pdfName.length > 20 ? pdfName.substring(0, 20) + '...' : pdfName}
                    </span>
                  ) : (
                    "Upload PDF"
                  )}
                </span>
                <input 
                  type="file" 
                  id="pdf-upload" 
                  accept="application/pdf" 
                  onChange={handleFileUpload}
                  disabled={isProcessingPdf}
                  className="sr-only"
                />
              </button>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className={`relative group ${isListening ? 'animate-pulse' : ''}`}
            >
              <div className={`absolute -inset-0.5 rounded-full blur-sm transition-all duration-300 ${
                isListening 
                  ? 'bg-red-500 opacity-70 group-hover:opacity-100' 
                  : 'bg-gradient-to-r from-primary to-secondary opacity-70 group-hover:opacity-100'
              }`}></div>
              <button
                onClick={toggleRecognition}
                className={`relative flex items-center gap-2 px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all ${
                  isListening ? "bg-red-500 text-white" : "bg-white text-primary"
                }`}
              >
                {isListening ? 
                  <><MicOff className="w-5 h-5" /> <span className="font-medium">Stop Listening</span></> : 
                  <><Mic className="w-5 h-5" /> <span className="font-medium">Start Listening</span></>
                }
              </button>
            </motion.div>
          </div>
          
          {isProcessingPdf && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground"
            >
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              Processing PDF... This may take a moment
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Hero;
